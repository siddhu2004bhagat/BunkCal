import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string

let genAI: GoogleGenerativeAI | null = null

function getClient() {
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env file.')
  }
  if (!genAI) genAI = new GoogleGenerativeAI(apiKey)
  return genAI
}

// ── Retry with exponential backoff ───────────────────────────────────────────
// Handles 429 (rate limit) and 503 (overloaded) automatically.
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err: unknown) {
      lastError = err
      const status = (err as { status?: number })?.status
        ?? (err as { statusCode?: number })?.statusCode
        ?? ((err as Error)?.message?.includes('429') ? 429 : 0)

      // Only retry on rate limit (429) or server overload (503)
      if (status !== 429 && status !== 503) throw err

      if (attempt === maxAttempts) break

      // Exponential backoff: 2s, 4s
      const delay = Math.pow(2, attempt) * 1000
      console.warn(`[Gemini] Rate limited — retrying in ${delay / 1000}s (attempt ${attempt}/${maxAttempts})`)
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw lastError
}

// ── Model cascade: try 2.5-flash first, fall back to 2.5-flash-lite ─────────
function getModel(preferLite = false) {
  const client = getClient()
  const modelName = preferLite ? 'gemini-2.5-flash-lite' : 'gemini-2.5-flash'
  return client.getGenerativeModel({ model: modelName })
}

// ── Simple in-memory cache (keyed by hash of inputs) ────────────────────────
const cache = new Map<string, { result: unknown; ts: number }>()
const CACHE_TTL = 1000 * 60 * 10 // 10 minutes

function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null }
  return entry.result as T
}

function cacheSet(key: string, result: unknown) {
  cache.set(key, { result, ts: Date.now() })
  // Keep cache small
  if (cache.size > 50) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0]
    cache.delete(oldest[0])
  }
}

// ─── Offering Calculator ──────────────────────────────────────────────────────

export interface OfferingResult {
  item: string
  description: string
  proxyValue: number
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
}

export async function analyzeOffering(imageBase64: string, mimeType: string): Promise<OfferingResult> {
  // Cache key: first 64 chars of base64 (enough to identify the image)
  const cacheKey = `offering:${imageBase64.slice(0, 64)}`
  const cached = cacheGet<OfferingResult>(cacheKey)
  if (cached) return cached

  const prompt = `You are the Bunkwise Offering Calculator. Students trade food/items for proxy attendance credits.

Analyze this image and determine:
1. What item/food is shown
2. How many "proxy credits" it's worth (1-5 scale based on value/effort)

Proxy value guide:
- 1 proxy: Small snack (biscuits, chips, candy)
- 2 proxies: Meal item (Maggi, sandwich, tea + snack)
- 3 proxies: Full meal (biryani, thali, pizza slice)
- 4 proxies: Premium meal (restaurant food, large pizza)
- 5 proxies: Exceptional offering (full party food, expensive item)

Respond ONLY with valid JSON in this exact format:
{
  "item": "name of the item",
  "description": "brief description",
  "proxyValue": 2,
  "confidence": "high",
  "reasoning": "one sentence explanation"
}`

  const result = await withRetry(async () => {
    // Try flash first, fall back to flash-8b on second attempt
    try {
      const model = getModel(false)
      return await model.generateContent([
        { inlineData: { data: imageBase64, mimeType } },
        prompt,
      ])
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status
      if (status === 429 || status === 503) {
        // Immediately try the lighter model
        const model = getModel(true)
        return await model.generateContent([
          { inlineData: { data: imageBase64, mimeType } },
          prompt,
        ])
      }
      throw err
    }
  })

  const text = result.response.text().trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Could not parse AI response')

  const parsed = JSON.parse(jsonMatch[0]) as OfferingResult
  cacheSet(cacheKey, parsed)
  return parsed
}

// ─── AI Attendance Prediction ─────────────────────────────────────────────────

export interface AttendancePrediction {
  overallRisk: 'safe' | 'warning' | 'danger'
  predictedPctIn30Days: number
  canMissTotal: number
  mustAttendPerWeek: number
  insight: string
  recommendation: string
  subjectAlerts: Array<{
    name: string
    currentPct: number
    predictedPct: number
    risk: 'safe' | 'warning' | 'danger'
    action: string
  }>
}

export interface SubjectData {
  name: string
  attended: number
  total: number
  goal: number
  credits: number
  classesPerWeek: number
}

export async function predictAttendance(subjects: SubjectData[]): Promise<AttendancePrediction> {
  // Cache key based on subject data
  const cacheKey = `predict:${JSON.stringify(subjects.map(s => ({ n: s.name, a: s.attended, t: s.total })))}`
  const cached = cacheGet<AttendancePrediction>(cacheKey)
  if (cached) return cached

  const subjectSummary = subjects.map(s => {
    const pct = s.total > 0 ? Math.round((s.attended / s.total) * 100) : 0
    return `${s.name}: ${pct}% (${s.attended}/${s.total} classes, goal: ${s.goal}%, ${s.classesPerWeek} classes/week, ${s.credits} credits)`
  }).join('\n')

  const prompt = `You are an AI attendance advisor for college students. Analyze this student's attendance data and predict the next 30 days.

Current attendance:
${subjectSummary}

Assume the semester has ~4 more weeks. Calculate:
1. Predicted attendance % in 30 days if they attend 70% of remaining classes
2. How many total classes they can still miss across all subjects
3. How many classes per week they must attend to stay safe
4. Risk level for each subject

Respond ONLY with valid JSON:
{
  "overallRisk": "warning",
  "predictedPctIn30Days": 74,
  "canMissTotal": 3,
  "mustAttendPerWeek": 4,
  "insight": "one compelling insight about their attendance pattern",
  "recommendation": "specific actionable advice for this week",
  "subjectAlerts": [
    {
      "name": "subject name",
      "currentPct": 72,
      "predictedPct": 68,
      "risk": "danger",
      "action": "Must attend all 3 classes this week"
    }
  ]
}`

  const result = await withRetry(async () => {
    try {
      return await getModel(false).generateContent(prompt)
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status
      if (status === 429 || status === 503) {
        return await getModel(true).generateContent(prompt)
      }
      throw err
    }
  })

  const text = result.response.text().trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Could not parse AI response')

  const parsed = JSON.parse(jsonMatch[0]) as AttendancePrediction
  cacheSet(cacheKey, parsed)
  return parsed
}

// ─── AI Push Notification Message Generator ───────────────────────────────────

export async function generateAttendanceAlert(
  subjectName: string,
  currentPct: number,
  goal: number,
  mustAttend: number
): Promise<string> {
  const cacheKey = `alert:${subjectName}:${currentPct}:${goal}:${mustAttend}`
  const cached = cacheGet<string>(cacheKey)
  if (cached) return cached

  const prompt = `Generate a short, punchy push notification (max 80 chars) for a college student.
Subject: ${subjectName}
Current attendance: ${currentPct}%
Required: ${goal}%
Must attend: ${mustAttend} more classes

Make it urgent but friendly. Use 1 emoji. No quotes in response.`

  const result = await withRetry(async () => {
    try {
      return await getModel(false).generateContent(prompt)
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status
      if (status === 429 || status === 503) {
        return await getModel(true).generateContent(prompt)
      }
      throw err
    }
  })

  const text = result.response.text().trim().replace(/^"|"$/g, '')
  cacheSet(cacheKey, text)
  return text
}
