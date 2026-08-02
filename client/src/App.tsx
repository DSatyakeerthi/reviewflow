import { useEffect, useState } from 'react'
import './App.css'

type Tone = 'Professional' | 'Friendly' | 'Apologetic' | 'Concise'

type HistoryItem = {
  id: string
  review: string
  rating: string
  tone: Tone
  response: string
  requiresApproval: boolean
  createdAt: string
}

type IncomingReview = {
  id: string
  customerName: string
  platform: string
  review: string
  rating: string
  tone: Tone
  response: string
  requiresApproval: boolean
  status: 'processing' | 'ready' | 'error'
  createdAt: string
}

const HISTORY_KEY = 'reviewflow-history'

function App() {
  const [review, setReview] = useState('')
  const [rating, setRating] = useState('3')
  const [tone, setTone] = useState<Tone>('Professional')
  const [response, setResponse] = useState('')
  const [requiresApproval, setRequiresApproval] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [incomingReviews, setIncomingReviews] = useState<IncomingReview[]>([])
  const [isReceivingReview, setIsReceivingReview] = useState(false)

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const savedHistory = localStorage.getItem(HISTORY_KEY)

      return savedHistory ? JSON.parse(savedHistory) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  }, [history])

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (!review.trim()) {
      setError('Please enter a customer review.')
      return
    }

    setError('')
    setResponse('')
    setIsEditing(false)
    setCopied(false)
    setIsLoading(true)

    try {
      const apiResponse = await fetch(
        'http://localhost:3001/api/generate-response',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            review,
            rating,
            tone,
          }),
        },
      )

      const data = await apiResponse.json()

      if (!apiResponse.ok) {
        throw new Error(data.message || 'Unable to generate a response.')
      }

      setResponse(data.response)
      setRequiresApproval(data.requiresApproval)

      const newHistoryItem: HistoryItem = {
        id: crypto.randomUUID(),
        review: review.trim(),
        rating,
        tone,
        response: data.response,
        requiresApproval: data.requiresApproval,
        createdAt: new Date().toISOString(),
      }

      setHistory((currentHistory) => [
        newHistoryItem,
        ...currentHistory,
      ])
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!response) return

    try {
      await navigator.clipboard.writeText(response)
      setCopied(true)

      window.setTimeout(() => {
        setCopied(false)
      }, 1500)
    } catch {
      setError('Unable to copy the response. Please copy it manually.')
    }
  }

  const handleApprove = () => {
    setRequiresApproval(false)
  }

  const handleLoadHistory = (item: HistoryItem) => {
    setReview(item.review)
    setRating(item.rating)
    setTone(item.tone)
    setResponse(item.response)
    setRequiresApproval(item.requiresApproval)
    setError('')
    setIsEditing(false)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

const handleNewReview = () => {
  setReview('')
  setRating('3')
  setTone('Professional')
  setResponse('')
  setRequiresApproval(false)
  setError('')
  setIsEditing(false)
  setCopied(false)

  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}
  const handleClearHistory = () => {
    setHistory([])
  }
  const handleSimulateIncomingReview = async () => {
  if (isReceivingReview) return

  const sampleReviews = [
    {
      customerName: 'Sarah M.',
      platform: 'Google Reviews',
      review:
        'The staff was friendly and my order was ready earlier than expected.',
      rating: '5',
    },
    {
      customerName: 'Michael R.',
      platform: 'Google Reviews',
      review:
        'My delivery arrived late and I could not reach anyone for an update.',
      rating: '2',
    },
    {
      customerName: 'Jennifer L.',
      platform: 'Yelp',
      review:
        'The service was good, but the waiting time was longer than expected.',
      rating: '3',
    },
  ]

  const sample =
    sampleReviews[Math.floor(Math.random() * sampleReviews.length)]

  const automaticTone: Tone =
    Number(sample.rating) <= 2
      ? 'Apologetic'
      : Number(sample.rating) >= 4
        ? 'Friendly'
        : 'Professional'

  const incomingId = crypto.randomUUID()

  const newIncomingReview: IncomingReview = {
    id: incomingId,
    customerName: sample.customerName,
    platform: sample.platform,
    review: sample.review,
    rating: sample.rating,
    tone: automaticTone,
    response: '',
    requiresApproval: false,
    status: 'processing',
    createdAt: new Date().toISOString(),
  }

  setIncomingReviews((current) => [newIncomingReview, ...current])
  setIsReceivingReview(true)

  try {
    const apiResponse = await fetch(
      'http://localhost:3001/api/generate-response',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          review: sample.review,
          rating: sample.rating,
          tone: automaticTone,
        }),
      },
    )

    const data = await apiResponse.json()

    if (!apiResponse.ok) {
      throw new Error(data.message || 'Unable to process incoming review.')
    }

    setIncomingReviews((current) =>
      current.map((item) =>
        item.id === incomingId
          ? {
              ...item,
              response: data.response,
              requiresApproval: data.requiresApproval,
              status: 'ready',
            }
          : item,
      ),
    )
  } catch {
    setIncomingReviews((current) =>
      current.map((item) =>
        item.id === incomingId
          ? {
              ...item,
              status: 'error',
            }
          : item,
      ),
    )
  } finally {
    setIsReceivingReview(false)
  }
}
  return (
    <main className="app-shell">
      <section className="hero">
        <span className="eyebrow">AI Review Response Manager</span>

        <h1>Turn customer reviews into thoughtful responses.</h1>

        <p>
          ReviewFlow helps businesses prepare clear, professional replies while
          flagging sensitive feedback for manager approval.
        </p>
      </section>

      <section className="workspace">
        <form className="review-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="review">Customer review</label>

            <textarea
              id="review"
              value={review}
              onChange={(event) => setReview(event.target.value)}
              placeholder="Paste the customer review here..."
              rows={7}
              disabled={isLoading}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="rating">Star rating</label>

              <select
                id="rating"
                value={rating}
                onChange={(event) => setRating(event.target.value)}
                disabled={isLoading}
              >
                <option value="1">1 star</option>
                <option value="2">2 stars</option>
                <option value="3">3 stars</option>
                <option value="4">4 stars</option>
                <option value="5">5 stars</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="tone">Response tone</label>

              <select
                id="tone"
                value={tone}
                onChange={(event) => setTone(event.target.value as Tone)}
                disabled={isLoading}
              >
                <option>Professional</option>
                <option>Friendly</option>
                <option>Apologetic</option>
                <option>Concise</option>
              </select>
            </div>
          </div>

          {error && <p className="error-message">{error}</p>}
          <div className="form-actions">
  <button
    type="button"
    className="secondary-button"
    onClick={handleNewReview}
    disabled={isLoading}
  >
    New review
  </button>

  <button type="submit" disabled={isLoading}>
    {isLoading ? 'Generating response...' : 'Generate response'}
  </button>
</div>
        </form>

        <aside className="response-panel">
          <span className="panel-label">Generated response</span>

          {isLoading && (
            <div className="loading-state">
              <div className="spinner" />
              <h2>Creating your response</h2>
              <p>ReviewFlow is preparing a reply based on the selected tone.</p>
            </div>
          )}

          {!isLoading && response && (
            <div className="generated-response">
              <span
                className={
                  requiresApproval
                    ? 'status-badge status-review'
                    : 'status-badge status-ready'
                }
              >
                {requiresApproval
                  ? 'Manager review required'
                  : 'Ready to publish'}
              </span>

              {isEditing ? (
                <textarea
                  className="response-editor"
                  value={response}
                  onChange={(event) => setResponse(event.target.value)}
                  rows={8}
                />
              ) : (
                <p>{response}</p>
              )}

              <div className="response-actions">
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? 'Save changes' : 'Edit'}
                </button>

                <button type="button" onClick={handleCopy}>
                  {copied ? 'Copied' : 'Copy'}
                </button>

                {requiresApproval && (
                  <button
                    type="button"
                    className="approve-button"
                    onClick={handleApprove}
                  >
                    Approve
                  </button>
                )}
              </div>
            </div>
          )}

          {!isLoading && !response && (
            <div className="empty-state">
              <h2>Your AI response will appear here</h2>

              <p>
                Add a review, select the rating and tone, then generate a reply.
              </p>
            </div>
          )}
        </aside>
      </section>

      <section className="history-section">
        <div className="history-header">
          <div>
            <span className="eyebrow">Saved locally</span>
            <h2>Review history</h2>
          </div>

          {history.length > 0 && (
            <button
              type="button"
              className="clear-history-button"
              onClick={handleClearHistory}
            >
              Clear history
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="history-empty">
            <p>Your generated responses will appear here.</p>
          </div>
        ) : (
          <div className="history-list">
            {history.map((item) => (
              <article className="history-card" key={item.id}>
                <div className="history-card-top">
                  <span
                    className={
                      item.requiresApproval
                        ? 'status-badge status-review'
                        : 'status-badge status-ready'
                    }
                  >
                    {item.requiresApproval
                      ? 'Manager review required'
                      : 'Ready to publish'}
                  </span>

                  <span className="history-date">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>

                <h3>{item.review}</h3>

                <p className="history-response">{item.response}</p>

                <div className="history-meta">
                  <span>{item.rating} stars</span>
                  <span>{item.tone}</span>
                </div>

                <button
                  type="button"
                  className="load-history-button"
                  onClick={() => handleLoadHistory(item)}
                >
                  Open response
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="incoming-section">
  <div className="incoming-header">
    <div>
      <span className="eyebrow">Automation demo</span>
      <h2>Incoming reviews</h2>
      <p>
        Simulate a review arriving from an online platform and automatically
        generate a suitable response.
      </p>
    </div>

    <button
      type="button"
      className="simulate-button"
      onClick={handleSimulateIncomingReview}
      disabled={isReceivingReview}
    >
      {isReceivingReview ? 'Processing review...' : 'Simulate new review'}
    </button>
  </div>

  {incomingReviews.length === 0 ? (
    <div className="incoming-empty">
      <h3>No incoming reviews yet</h3>
      <p>Use the simulation button to demonstrate the automated workflow.</p>
    </div>
  ) : (
    <div className="incoming-list">
      {incomingReviews.map((item) => (
        <article className="incoming-card" key={item.id}>
          <div className="incoming-card-top">
            <div>
              <h3>{item.customerName}</h3>
              <span>{item.platform}</span>
            </div>

            <span
  className={
    item.status === 'processing'
      ? 'incoming-status incoming-processing'
      : item.status === 'error'
        ? 'incoming-status incoming-error-status'
        : item.requiresApproval
          ? 'incoming-status incoming-review'
          : 'incoming-status incoming-ready'
  }
>
              {item.status === 'processing' && 'Generating response'}
              {item.status === 'error' && 'Generation failed'}
              {item.status === 'ready' &&
                (item.requiresApproval
                  ? 'Manager review required'
                  : 'Auto-approved')}
            </span>
          </div>

          <div className="incoming-meta">
            <span>{item.rating} stars</span>
            <span>{item.tone} tone</span>
            <span>{new Date(item.createdAt).toLocaleString()}</span>
          </div>

          <div className="incoming-content">
            <div>
              <span className="content-label">Customer review</span>
              <p>{item.review}</p>
            </div>

            <div>
              <span className="content-label">Generated response</span>

              {item.status === 'processing' && (
                <p className="muted-text">
                  Gemini is preparing an appropriate reply...
                </p>
              )}

              {item.status === 'error' && (
                <p className="incoming-error">
                  The response could not be generated. Please try again.
                </p>
              )}

              {item.status === 'ready' && <p>{item.response}</p>}
            </div>
          </div>
        </article>
      ))}
    </div>
  )}
</section>
    </main>
  )
}

export default App