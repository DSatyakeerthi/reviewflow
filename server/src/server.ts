import cors from 'cors'
import dotenv from 'dotenv'
import express, { type Request, type Response } from 'express'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

type ReviewRow = {
  id: string
  customer_name: string
  rating: number
  message: string
  business_reply: string | null
  created_at: string
}

type Review = {
  id: string
  customerName: string
  rating: number
  message: string
  businessReply: string | null
  createdAt: string
}

const app = express()
const port = process.env.PORT || 3001

const geminiApiKey = process.env.GEMINI_API_KEY
const supabaseUrl = process.env.SUPABASE_URL
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY

if (!geminiApiKey) {
  throw new Error(
    'GEMINI_API_KEY is missing from the server .env file.',
  )
}

if (!supabaseUrl) {
  throw new Error(
    'SUPABASE_URL is missing from the server .env file.',
  )
}

if (!supabaseSecretKey) {
  throw new Error(
    'SUPABASE_SECRET_KEY is missing from the server .env file.',
  )
}

const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
})

const supabase = createClient(
  supabaseUrl,
  supabaseSecretKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
)

const formatReview = (row: ReviewRow): Review => ({
  id: row.id,
  customerName: row.customer_name,
  rating: row.rating,
  message: row.message,
  businessReply: row.business_reply,
  createdAt: row.created_at,
})

app.use(
  cors({
    origin(origin, callback) {
      const isAllowed =
        !origin ||
        origin === 'http://localhost:5173' ||
        origin === 'http://localhost:5174' ||
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

app.get(
  '/api/reviews',
  async (_request: Request, response: Response) => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(
          'id, customer_name, rating, message, business_reply, created_at',
        )
        .order('created_at', {
          ascending: false,
        })

      if (error) {
        throw error
      }

      const reviews = (data as ReviewRow[]).map(formatReview)

      response.status(200).json({
        success: true,
        reviews,
      })
    } catch (error) {
      console.error('Supabase review loading error:', error)

      response.status(500).json({
        success: false,
        message: 'Unable to load reviews.',
      })
    }
  },
)

app.post(
  '/api/reviews',
  async (request: Request, response: Response) => {
    const { customerName, rating, message } = request.body

    if (
      typeof customerName !== 'string' ||
      !customerName.trim() ||
      typeof message !== 'string' ||
      !message.trim()
    ) {
      response.status(400).json({
        success: false,
        message:
          'Customer name and review message are required.',
      })
      return
    }

    const numericRating = Number(rating)

    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      response.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5.',
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          customer_name: customerName.trim(),
          rating: numericRating,
          message: message.trim(),
          business_reply: null,
        })
        .select(
          'id, customer_name, rating, message, business_reply, created_at',
        )
        .single()

      if (error) {
        throw error
      }

      response.status(201).json({
        success: true,
        review: formatReview(data as ReviewRow),
      })
    } catch (error) {
      console.error('Supabase review creation error:', error)

      response.status(500).json({
        success: false,
        message: 'Unable to submit the review.',
      })
    }
  },
)

app.post(
  '/api/reviews/:id/reply',
  async (request: Request, response: Response) => {
    const { id } = request.params
    const { businessReply } = request.body

    if (
      typeof businessReply !== 'string' ||
      !businessReply.trim()
    ) {
      response.status(400).json({
        success: false,
        message: 'Business reply is required.',
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from('reviews')
        .update({
          business_reply: businessReply.trim(),
        })
        .eq('id', id)
        .select(
          'id, customer_name, rating, message, business_reply, created_at',
        )
        .maybeSingle()

      if (error) {
        throw error
      }

      if (!data) {
        response.status(404).json({
          success: false,
          message: 'Review not found.',
        })
        return
      }

      response.status(200).json({
        success: true,
        review: formatReview(data as ReviewRow),
      })
    } catch (error) {
      console.error('Supabase reply publishing error:', error)

      response.status(500).json({
        success: false,
        message: 'Unable to publish the reply.',
      })
    }
  },
)

app.post(
  '/api/generate-response',
  async (request: Request, response: Response) => {
    const { review, rating, tone, responseLength } =
      request.body

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

    const lengthInstructions: Record<string, string> = {
      Short:
        'Write 20 to 35 words in one short paragraph, about two lines.',
      Medium: 'Write 40 to 65 words in one paragraph.',
      Long:
        'Write 70 to 100 words in one or two short paragraphs.',
    }

    const selectedLength =
      lengthInstructions[responseLength] ??
      lengthInstructions.Short

    try {
      const prompt = `
You are helping a business respond to a customer review.

Customer review:
"${review.trim()}"

Star rating: ${rating} out of 5
Requested response tone: ${tone}
Selected response length: ${responseLength || 'Short'}
Length requirement: ${selectedLength}

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
- Follow this response length requirement: ${selectedLength}
- Set requiresApproval to true when the review includes serious dissatisfaction, service failure, safety concerns, legal concerns, billing disputes, threats, discrimination, or other sensitive issues.
- Consider both the written review and the star rating.
- Return only valid JSON with no markdown or extra text.
- Do not claim that the business has already taken action, is investigating, or will provide a specific resolution unless that information was provided.
- Avoid promising future action.
- Do not promise or imply that the customer’s future experience will be improved.
`

      const result = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              response: {
                type: 'string',
              },
              requiresApproval: {
                type: 'boolean',
              },
            },
            required: ['response', 'requiresApproval'],
          },
          maxOutputTokens: 400,
          temperature: 0.3,
        },
      })

      const rawText = result.text?.trim()

      if (!rawText) {
        throw new Error('Gemini returned an empty response.')
      }

      const parsedResult = JSON.parse(rawText)

      if (
        typeof parsedResult.response !== 'string' ||
        typeof parsedResult.requiresApproval !== 'boolean'
      ) {
        throw new Error(
          'Gemini returned an invalid response format.',
        )
      }

      const requiresApproval =
        Number(rating) <= 3 ||
        parsedResult.requiresApproval

      response.status(200).json({
        success: true,
        response: parsedResult.response.trim(),
        requiresApproval,
      })
    } catch (error) {
      console.error('Gemini generation error:', error)

      response.status(500).json({
        success: false,
        message:
          'Unable to generate a response. Please try again.',
      })
    }
  },
)

if (process.env.VERCEL !== '1') {
  app.listen(port, () => {
    console.log(
      `ReviewFlow server running at http://localhost:${port}`,
    )
  })
}

export default app