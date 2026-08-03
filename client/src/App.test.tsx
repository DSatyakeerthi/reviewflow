import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('ReviewFlow', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('shows a validation message when the review is empty', async () => {
    const user = userEvent.setup()

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          reviews: [],
        }),
      }),
    )

    render(<App />)

    await user.click(
      screen.getByRole('button', {
        name: /generate ai response/i,
      }),
    )

    expect(
      screen.getByText(/please enter a customer review/i),
    ).toBeInTheDocument()
  })

  it('generates and displays a response from the backend', async () => {
    const user = userEvent.setup()

    const fetchMock = vi.fn(
      async (
        input: RequestInfo | URL,
        options?: RequestInit,
      ) => {
        const url = String(input)

        if (
          url.includes('/api/reviews') &&
          (!options?.method || options.method === 'GET')
        ) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              reviews: [],
            }),
          }
        }

        if (url.includes('/api/generate-response')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              response:
                'We are sorry about the delay and appreciate your feedback.',
              requiresApproval: true,
            }),
          }
        }

        throw new Error(`Unexpected request: ${url}`)
      },
    )

    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await user.type(
      screen.getByLabelText(/customer review/i),
      'The service was slow and my order arrived late.',
    )

    await user.selectOptions(
      screen.getByLabelText(/star rating/i),
      '2',
    )

    await user.selectOptions(
      screen.getByLabelText(/response tone/i),
      'Apologetic',
    )

    await user.selectOptions(
      screen.getByLabelText(/response length/i),
      'Short',
    )

    await user.click(
  screen.getByRole('button', {
    name: /generate ai response/i,
  }),
)

const generatedResponses = await screen.findAllByText(
  'We are sorry about the delay and appreciate your feedback.',
)

expect(generatedResponses.length).toBeGreaterThanOrEqual(1)

const approvalStatuses = screen.getAllByText(
  /manager review required/i,
)

expect(approvalStatuses.length).toBeGreaterThanOrEqual(1)
  })
})