import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AnalyzingOverlay from '../AnalyzingOverlay'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, style, ...props }) => (
      <div style={style} {...props}>
        {children}
      </div>
    ),
    h2: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
    p: ({ children, ...props }) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}))

describe('AnalyzingOverlay', () => {
  it('renders the analyzing title', () => {
    render(<AnalyzingOverlay />)
    expect(screen.getByText('正在观面...')).toBeInTheDocument()
  })

  it('renders the calligraphy character', () => {
    render(<AnalyzingOverlay />)
    expect(screen.getByText('相')).toBeInTheDocument()
  })

  it('renders an initial analysis term', () => {
    render(<AnalyzingOverlay />)
    expect(screen.getByText('观天庭...')).toBeInTheDocument()
  })

  it('does not render progress bar', () => {
    const { container } = render(<AnalyzingOverlay />)
    // Progress bar should not exist (removed in recent changes)
    const progressBars = container.querySelectorAll('[class*="progress"], [style*="width"]')
    const hasProgressBar = Array.from(progressBars).some(el => {
      const style = el.getAttribute('style') || ''
      return style.includes('width') && style.includes('%')
    })
    expect(hasProgressBar).toBe(false)
  })
})
