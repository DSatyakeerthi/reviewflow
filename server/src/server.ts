import cors from 'cors'
import dotenv from 'dotenv'
import express, { type Request, type Response } from 'express'
import { GoogleGenAI } from '@google/genai'

dotenv.config()

const app = express()
const port = process.env.PORT || 3001
const apiKey = process.env.GEMINI_API_KEY

if (!apiKey) {
  throw new Error('GEMINI_API_KEY is missing from the server .env file.')
}

const ai = new GoogleGenAI({
  apiKey,
})

const allowedOrigins = [
  'http://localhost:5173',
  process.env.CLIENT_URL,
].filter((origin): origin is string => Boolean(origin))

app.use(
  cors({
    origin(origin, callback) {
      const isAllowed =
        !origin ||
        origin === 'http://localhost:5173' ||
        origin.endsWith('.vercel.app')

      if (isAllowed) {
        callback(null, true)
        return
      }

      callback(new Error('Origin is not allowed by CORS.'))
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  }),
)
app.use(express.json())

app.get('/api/health', (_request: Request, response: Response) => {
  response.status(200).json({
    success: true,
    message: 'ReviewFlow backend is running.',
  })
})

app.post(
  '/api/generate-response',
  async (request: Request, response: Response) => {
    const { review, rating, tone } = request.body

    if (typeof review !== 'string' || !review.trim()) {
      response.status(400).json({
        success: false,
        message: 'Customer review is required.',
      })
      return
    }

    if (!rating || typeof tone !== 'string') {
      response.status(400).json({
        success: false,
        message: 'Rating and tone are required.',
      })
      return
    }

    try {
      const prompt = `
You are helping a business respond to a customer review.

Customer review:
"${review.trim()}"

Star rating: ${rating} out of 5
Requested response tone: ${tone}

Return valid JSON using this exact structure:

{
  "response": "the business response",
  "requiresApproval": true
}

Requirements:
- Use the requested tone.
- Refer naturally to the customer's actual concern.
- Do not assume the business type, location, product, or service unless the review clearly states it.
- Do not blame the customer.
- Keep the response between 40 and 90 words.
- Set requiresApproval to true when the review includes serious dissatisfaction, service failure, safety concerns, legal concerns, billing disputes, threats, discrimination, or other sensitive issues.
- Consider both the written review and the star rating.
- Return only valid JSON with no markdown or extra text.
- Do not claim that the business has already taken action, is investigating, or will provide a specific resolution unless that information was provided.
- Avoid promising future action; acknowledge the issue without claiming that improvements are already underway.
- Do not promise or imply that the customer’s future experience will be improved.
`

      const result = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
      })

      const rawText = result.text?.trim()

if (!rawText) {
  throw new Error('Gemini returned an empty response.')
}

const cleanedText = rawText
  .replace(/^```json\s*/i, '')
  .replace(/^```\s*/i, '')
  .replace(/\s*```$/i, '')

const parsedResult = JSON.parse(cleanedText)

if (
  typeof parsedResult.response !== 'string' ||
  typeof parsedResult.requiresApproval !== 'boolean'
) {
  throw new Error('Gemini returned an invalid response format.')
}

const requiresApproval =
  Number(rating) <= 3 || parsedResult.requiresApproval

response.status(200).json({
  success: true,
  response: parsedResult.response.trim(),
  requiresApproval,
})
    } catch (error) {
      console.error('Gemini generation error:', error)

      response.status(500).json({
        success: false,
        message: 'Unable to generate a response. Please try again.',
      })
    }
  },
)

if (process.env.VERCEL !== '1') {
  app.listen(port, () => {
    console.log(`ReviewFlow server running at http://localhost:${port}`)
  })
}

export default app