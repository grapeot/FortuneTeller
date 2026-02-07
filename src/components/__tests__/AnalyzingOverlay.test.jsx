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
    p: ({ children, ...props }) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}))

describe('AnalyzingOverlay', () => {
  it('renders the analyzing title', () => {
    render(<AnalyzingOverlay />)
    expect(screen.getByText('正在分析您的面相...')).toBeInTheDocument()
  })

  it('renders the crystal ball emoji', () => {
    render(<AnalyzingOverlay />)
    expect(screen.getByText('🔮')).toBeInTheDocument()
  })

  it('renders an initial analysis term', () => {
    render(<AnalyzingOverlay />)
    // The first term should be visible
    expect(screen.getByText('扫描天庭...')).toBeInTheDocument()
  })
})
