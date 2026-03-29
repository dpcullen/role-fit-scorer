import { useState, useEffect } from 'react'
import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts'

const SYSTEM_PROMPT = `You are a blunt career advisor for senior operators targeting GM and COO roles. Score this role fit with brutal honesty. Return ONLY a JSON object with this exact structure:
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

No preamble. No markdown. No code fences. JSON only.`

const DIMENSION_LABELS = {
  scope: 'Scope Match',
  operator: 'Operator Muscle',
  brand: 'Brand & Optionality',
  comp: 'Comp Trajectory',
  equity: 'Equity Upside',
  background: 'Background Fit',
}

function AnimatedScore({ value, max = 100 }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let start = 0
    const duration = 1200
    const startTime = performance.now()

    function tick(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * value))
      if (progress < 1) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }, [value])

  return (
    <div className="animate-score-pop">
      <span className="text-7xl font-extrabold text-gold-400">{display}</span>
      <span className="text-2xl text-gray-400 ml-1">/ {max}</span>
    </div>
  )
}

function ScoreBadge({ label, value }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const duration = 800
    const startTime = performance.now()
    function tick(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      setDisplay(Math.round(progress * value))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [value])

  const color = value >= 7 ? 'text-green-400' : value >= 4 ? 'text-gold-400' : 'text-red-400'

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
      <span className="text-gray-300 text-sm">{label}</span>
      <span className={`text-lg font-bold ${color}`}>{display}/10</span>
    </div>
  )
}

export default function App() {
  const [apiKey, setApiKey] = useState('')
  const [resume, setResume] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)

  async function handleScore() {
    if (!apiKey.trim()) {
      setError('Please enter your Google AI API key. Get one free at https://aistudio.google.com/apikey')
      return
    }
    if (!resume.trim() || !jobDescription.trim()) {
      setError('Please paste both your resume/bio and the job description.')
      return
    }

    setError('')
    setLoading(true)
    setResult(null)

    try {
      const genAI = new GoogleGenerativeAI(apiKey.trim())
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: { responseMimeType: 'application/json' },
      })

      const result = await model.generateContent([
        { text: SYSTEM_PROMPT },
        { text: `RESUME/BIO:\n${resume.trim()}\n\nJOB DESCRIPTION:\n${jobDescription.trim()}` },
      ])

      const text = result.response.text()
      const parsed = JSON.parse(text)
      setResult(parsed)
    } catch (err) {
      const msg = err.message || 'Something went wrong'
      if (msg.includes('API_KEY_INVALID') || msg.includes('API key')) {
        setError('Invalid API key. Get a free key at https://aistudio.google.com/apikey')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const radarData = result
    ? Object.entries(DIMENSION_LABELS).map(([key, label]) => ({
        dimension: label,
        score: result.scores[key] || 0,
        fullMark: 10,
      }))
    : []

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-8">
      {/* Header */}
      <div className="max-w-5xl mx-auto text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          <span className="text-gold-400">Role Fit</span> Scorer
        </h1>
        <p className="text-gray-400 mt-2 text-lg">
          Brutally honest career fit analysis for senior operators
        </p>
      </div>

      <div className="max-w-5xl mx-auto">
        {/* API Key */}
        <div className="mb-6 bg-[#111] border border-gray-800 rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Google AI API Key <span className="text-green-400 font-normal">(free)</span>
          </label>
          <div className="flex gap-2">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
              className="flex-1 bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500"
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="px-4 py-2.5 bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-400 text-sm hover:text-white transition-colors"
            >
              {showApiKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Powered by Gemini Flash — completely free. Get your key at{' '}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-gold-400 underline hover:text-gold-300">
              aistudio.google.com/apikey
            </a>
            . Your key is never stored.
          </p>
        </div>

        {/* Inputs */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-[#111] border border-gray-800 rounded-xl p-5">
            <label className="block text-sm font-medium text-gold-400 mb-3">
              Your Resume / Bio
            </label>
            <textarea
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              placeholder="Paste your resume, LinkedIn summary, or professional bio here..."
              rows={10}
              className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-500 resize-none"
            />
          </div>
          <div className="bg-[#111] border border-gray-800 rounded-xl p-5">
            <label className="block text-sm font-medium text-gold-400 mb-3">
              Job Description
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here..."
              rows={10}
              className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-500 resize-none"
            />
          </div>
        </div>

        {/* Score Button */}
        <div className="text-center mb-10">
          <button
            onClick={handleScore}
            disabled={loading}
            className="px-10 py-3.5 bg-gold-500 hover:bg-gold-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold text-lg rounded-xl transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing...
              </span>
            ) : (
              'Score This Role'
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-8 bg-red-900/30 border border-red-700 rounded-xl p-4 text-center text-red-300">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Overall Score + Radar */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Overall Score */}
              <div className="bg-[#111] border border-gray-800 rounded-xl p-8 text-center flex flex-col items-center justify-center">
                <p className="text-gray-400 text-sm uppercase tracking-widest mb-4">Overall Fit Score</p>
                <AnimatedScore value={result.overall} />
                <div className="mt-6 w-full">
                  {Object.entries(DIMENSION_LABELS).map(([key, label]) => (
                    <ScoreBadge key={key} label={label} value={result.scores[key] || 0} />
                  ))}
                </div>
              </div>

              {/* Radar Chart */}
              <div className="bg-[#111] border border-gray-800 rounded-xl p-6 flex items-center justify-center">
                <ResponsiveContainer width="100%" height={380}>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="#333" />
                    <PolarAngleAxis
                      dataKey="dimension"
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 10]}
                      tick={{ fill: '#555', fontSize: 10 }}
                      axisLine={false}
                    />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="#D4AF37"
                      fill="#D4AF37"
                      fillOpacity={0.25}
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#D4AF37' }}
                      isAnimationActive={true}
                      animationDuration={1500}
                      animationEasing="ease-out"
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pros / Cons */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-[#111] border border-gray-800 rounded-xl p-6 animate-fade-in-up stagger-2">
                <h3 className="text-green-400 font-bold text-lg mb-4 flex items-center gap-2">
                  <span className="text-xl">&#x2714;</span> Reasons to Take It
                </h3>
                <ul className="space-y-3">
                  {result.reasons_to_take.map((reason, i) => (
                    <li key={i} className="flex gap-3 text-gray-300 text-sm leading-relaxed">
                      <span className="text-green-400 mt-0.5 shrink-0">&#x25CF;</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-[#111] border border-gray-800 rounded-xl p-6 animate-fade-in-up stagger-3">
                <h3 className="text-red-400 font-bold text-lg mb-4 flex items-center gap-2">
                  <span className="text-xl">&#x2718;</span> Reasons to Pass
                </h3>
                <ul className="space-y-3">
                  {result.reasons_to_pass.map((reason, i) => (
                    <li key={i} className="flex gap-3 text-gray-300 text-sm leading-relaxed">
                      <span className="text-red-400 mt-0.5 shrink-0">&#x25CF;</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Verdict */}
            <div className="bg-[#111] border border-gold-500/30 rounded-xl p-6 animate-fade-in-up stagger-4">
              <h3 className="text-gold-400 font-bold text-lg mb-3">Bottom Line</h3>
              <p className="text-gray-200 leading-relaxed">{result.verdict}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-5xl mx-auto text-center mt-16 pb-8">
        <p className="text-gray-600 text-xs">
          Role Fit Scorer &mdash; Built for senior operators targeting GM &amp; COO roles
        </p>
      </div>
    </div>
  )
}
