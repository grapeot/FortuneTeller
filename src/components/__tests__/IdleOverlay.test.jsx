import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import IdleOverlay from '../IdleOverlay'

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}))

describe('IdleOverlay', () => {
  it('renders avatar image', () => {
    render(<IdleOverlay faceCount={0} isReady={false} />)
    expect(screen.getByAltText('AI相面')).toBeInTheDocument()
  })

  it('shows loading message when not ready', () => {
    render(<IdleOverlay faceCount={0} isReady={false} />)
    expect(screen.getByText((_, el) => el.tagName === 'P' && el.textContent === '正在加载AI模型...')).toBeInTheDocument()
  })

  it('shows prompt when ready but no face detected', () => {
    render(<IdleOverlay faceCount={0} isReady={true} />)
    expect(screen.getByText('请面向摄像头...')).toBeInTheDocument()
  })

  it('shows face count when faces are detected', () => {
    render(<IdleOverlay faceCount={2} isReady={true} />)
    expect(screen.getByText(/检测到 2 张面相/)).toBeInTheDocument()
  })
})
