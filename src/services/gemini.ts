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

// ─── Level 3: Offering Calculator ────────────────────────────────────────────
// Upload a photo of food/item and get proxy value

export interface OfferingResult {
  item: string
  description: string
  proxyValue: number
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
}

export async function analyzeOffering(imageBase64: string, mimeType: string): Promise<OfferingResult> {
  const client = getClient()
  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' })

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

  const result = await model.generateContent([
    { inlineData: { data: imageBase64, mimeType } },
    prompt,
  ])

  const text = result.response.text().trim()
  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Could not parse AI response')

  return JSON.parse(jsonMatch[0]) as OfferingResult
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
  const client = getClient()
  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' })

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

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Could not parse AI response')

  return JSON.parse(jsonMatch[0]) as AttendancePrediction
}

// ─── AI Push Notification Message Generator ───────────────────────────────────

export async function generateAttendanceAlert(
  subjectName: string,
  currentPct: number,
  goal: number,
  mustAttend: number
): Promise<string> {
  const client = getClient()
  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt = `Generate a short, punchy push notification (max 80 chars) for a college student.
Subject: ${subjectName}
Current attendance: ${currentPct}%
Required: ${goal}%
Must attend: ${mustAttend} more classes

Make it urgent but friendly. Use 1 emoji. No quotes in response.`

  const result = await model.generateContent(prompt)
  return result.response.text().trim().replace(/^"|"$/g, '')
}
