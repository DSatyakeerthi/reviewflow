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

    render(<App />)

    await user.click(
      screen.getByRole('button', { name: /generate response/i }),
    )

    expect(
      screen.getByText('Please enter a customer review.'),
    ).toBeInTheDocument()
  })

  it('generates and displays a response from the backend', async () => {
    const user = userEvent.setup()

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          response:
            'We sincerely apologize for the delayed delivery and unanswered email.',
          requiresApproval: true,
        }),
      }),
    )

    render(<App />)

    await user.type(
      screen.getByLabelText(/customer review/i),
      'The delivery was late and nobody answered my email.',
    )

    await user.selectOptions(
      screen.getByLabelText(/star rating/i),
      '2',
    )

    await user.selectOptions(
      screen.getByLabelText(/response tone/i),
      'Apologetic',
    )

    await user.click(
      screen.getByRole('button', { name: /generate response/i }),
    )

    const generatedResponses = await screen.findAllByText(
  'We sincerely apologize for the delayed delivery and unanswered email.',
)

expect(generatedResponses.length).toBeGreaterThanOrEqual(1)

const approvalStatuses = screen.getAllByText('Manager review required')

expect(approvalStatuses.length).toBeGreaterThanOrEqual(1)
  })
})