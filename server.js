import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Serve built frontend in production
app.use(express.static(join(__dirname, 'dist')));

// Proxy endpoint to Anthropic API
app.post('/api/score', async (req, res) => {
  const { apiKey, resume, jobDescription } = req.body;

  if (!apiKey || !resume || !jobDescription) {
    return res.status(400).json({ error: 'Missing required fields: apiKey, resume, jobDescription' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: `You are a blunt career advisor for senior operators targeting GM and COO roles. Score this role fit with brutal honesty. Return ONLY a JSON object with this exact structure:
{
  "scores": { "scope": n, "operator": n, "brand": n, "comp": n, "equity": n, "background": n },
  "overall": n,
  "reasons_to_take": ["array of 3-5 strings"],
  "reasons_to_pass": ["array of 3-5 strings"],
  "verdict": "string - one paragraph bottom-line verdict"
}
No preamble. No markdown. JSON only.

Scoring dimensions (each 1-10):
1. Scope Match - team size, budget, cross-functional ownership
2. Operator Muscle-Building - does it build toward GM/COO?
3. Company Brand & Exit Optionality
4. Compensation Trajectory
5. Pre-IPO / Equity Upside
6. Background Alignment - direct experience match

Overall is a weighted score out of 100.`,
        messages: [
          {
            role: 'user',
            content: `RESUME/BIO:\n${resume}\n\nJOB DESCRIPTION:\n${jobDescription}`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: errorData.error?.message || `Anthropic API error: ${response.status}`
      });
    }

    const data = await response.json();
    const text = data.content[0].text;

    // Parse the JSON from Claude's response
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (err) {
    console.error('Score error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Fallback to index.html for SPA routing in production
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
