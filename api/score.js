import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { apiKey, resume, jobDescription } = req.body;

  if (!apiKey || !resume || !jobDescription) {
    return res.status(400).json({ error: 'Missing required fields: apiKey, resume, jobDescription' });
  }

  const systemPrompt = `You are a blunt career advisor for senior operators targeting GM and COO roles. Score this role fit with brutal honesty. Return ONLY a JSON object with this exact structure:
{
  "scores": { "scope": n, "operator": n, "brand": n, "comp": n, "equity": n, "background": n },
  "overall": n,
  "reasons_to_take": ["array of 3-5 strings"],
  "reasons_to_pass": ["array of 3-5 strings"],
  "verdict": "string - one paragraph bottom-line verdict"
}

Scoring dimensions (each 1-10):
1. Scope Match (scope) - team size, budget, cross-functional ownership
2. Operator Muscle-Building (operator) - does it build toward GM/COO?
3. Company Brand & Exit Optionality (brand)
4. Compensation Trajectory (comp)
5. Pre-IPO / Equity Upside (equity)
6. Background Alignment (background) - direct experience match

Overall is a weighted score out of 100.

No preamble. No markdown. No code fences. JSON only.`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `RESUME/BIO:\n${resume}\n\nJOB DESCRIPTION:\n${jobDescription}` },
    ]);

    const text = result.response.text();
    const parsed = JSON.parse(text);
    return res.status(200).json(parsed);
  } catch (err) {
    console.error('Score error:', err);
    const message = err.message || 'Internal server error';
    if (message.includes('API_KEY_INVALID') || message.includes('API key')) {
      return res.status(401).json({ error: 'Invalid API key. Get a free key at https://aistudio.google.com/apikey' });
    }
    return res.status(500).json({ error: message });
  }
}
