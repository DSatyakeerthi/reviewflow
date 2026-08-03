# ReviewFlow

ReviewFlow is an AI-powered review response manager for businesses.

It generates customer review replies, automatically publishes responses for positive reviews, and sends lower-rated reviews to a manager for approval.

## Live Apps

- Manager app: https://reviewflow-rho-ten.vercel.app/
- Business demo: https://reviewflow-business-demo.vercel.app/
- Backend API: https://reviewflow-api-one.vercel.app/api/health

## Workflow

```text
Customer submits review
→ Review is stored in Supabase
→ Gemini generates a reply
→ 4–5 stars: reply is published automatically
→ 1–3 stars: manager reviews and publishes
→ Reply appears in the business app
```

## Features

- AI-generated review responses
- Professional, Friendly, Apologetic, and Concise tones
- Short, Medium, and Long response options
- Automatic publishing for 4–5 star reviews
- Manager approval for 1–3 star reviews
- Edit and publish responses
- Persistent storage with Supabase
- Connected customer-facing demo application

## Tech Stack

- React
- TypeScript
- Vite
- Express
- Google Gemini
- Supabase PostgreSQL
- Vercel

## Project Structure

```text
reviewflow/
├── client/   ReviewFlow manager frontend
├── server/   Express API, Gemini, and Supabase
└── README.md
```

## Run Locally

```bash
cd server
npm install
npm run dev
```

```bash
cd client
npm install
npm run dev
```

## Environment Variables

Backend:

```env
GEMINI_API_KEY=
SUPABASE_URL=
SUPABASE_SECRET_KEY=
```

Frontend:

```env
VITE_API_BASE_URL=http://localhost:3001
```

## Related Repository

https://github.com/DSatyakeerthi/reviewflow-business-demo