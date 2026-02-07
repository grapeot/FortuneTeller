import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ResultOverlay from '../ResultOverlay'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    h2: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
    p: ({ children, ...props }) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}))

const mockFortune = {
  face: '天庭饱满，眉宇开阔——',
  career: '必是L65以上的Principal！这骨相，Connect评分想低都难。',
  blessing: '马到成功，新Feature一次上线！',
  full: '天庭饱满，眉宇开阔——必是L65以上的Principal！这骨相，Connect评分想低都难。马到成功，新Feature一次上线！',
}

describe('ResultOverlay', () => {
  it('renders the result title', () => {
    render(<ResultOverlay fortune={mockFortune} secondsLeft={5} />)
    expect(screen.getByText(/您的算命结果/)).toBeInTheDocument()
  })

  it('renders the face reading', () => {
    render(<ResultOverlay fortune={mockFortune} secondsLeft={5} />)
    expect(screen.getByText(mockFortune.face)).toBeInTheDocument()
  })

  it('renders the career reading', () => {
    render(<ResultOverlay fortune={mockFortune} secondsLeft={5} />)
    expect(screen.getByText(mockFortune.career)).toBeInTheDocument()
  })

  it('renders the blessing', () => {
    render(<ResultOverlay fortune={mockFortune} secondsLeft={5} />)
    expect(screen.getByText(/马到成功/)).toBeInTheDocument()
  })

  it('shows the countdown', () => {
    render(<ResultOverlay fortune={mockFortune} secondsLeft={3} />)
    expect(screen.getByText('3秒后返回')).toBeInTheDocument()
  })

  it('hides countdown when secondsLeft is 0', () => {
    render(<ResultOverlay fortune={mockFortune} secondsLeft={0} />)
    expect(screen.queryByText(/秒后返回/)).not.toBeInTheDocument()
  })

  it('shows the brand footer', () => {
    render(<ResultOverlay fortune={mockFortune} secondsLeft={5} />)
    expect(screen.getByText(/Superlinear Academy/)).toBeInTheDocument()
  })
})
