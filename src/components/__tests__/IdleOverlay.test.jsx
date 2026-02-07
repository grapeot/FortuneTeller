import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import IdleOverlay from '../IdleOverlay'

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}))

describe('IdleOverlay', () => {
  it('renders the title', () => {
    render(<IdleOverlay faceCount={0} isReady={false} onStart={() => {}} />)
    expect(screen.getByText('AI相面')).toBeInTheDocument()
  })

  it('renders the subtitle', () => {
    render(<IdleOverlay faceCount={0} isReady={false} onStart={() => {}} />)
    expect(screen.getByText('马年大吉 · 马到成功')).toBeInTheDocument()
  })

  it('shows loading message when not ready', () => {
    render(<IdleOverlay faceCount={0} isReady={false} onStart={() => {}} />)
    expect(screen.getByText((_, el) => el.tagName === 'P' && el.textContent === '正在加载AI模型...')).toBeInTheDocument()
  })

  it('shows prompt when ready but no face detected', () => {
    render(<IdleOverlay faceCount={0} isReady={true} onStart={() => {}} />)
    expect(screen.getByText('请面向摄像头...')).toBeInTheDocument()
  })

  it('shows face count when faces are detected', () => {
    render(<IdleOverlay faceCount={2} isReady={true} onStart={() => {}} />)
    expect(screen.getByText(/检测到 2 张面相/)).toBeInTheDocument()
  })

  it('disables start button when not ready', () => {
    render(<IdleOverlay faceCount={0} isReady={false} onStart={() => {}} />)
    const button = screen.getByText('开始相面')
    expect(button).toBeDisabled()
  })

  it('enables start button when ready', () => {
    render(<IdleOverlay faceCount={1} isReady={true} onStart={() => {}} />)
    const button = screen.getByText('开始相面')
    expect(button).not.toBeDisabled()
  })

  it('calls onStart when button is clicked', () => {
    const onStart = vi.fn()
    render(<IdleOverlay faceCount={1} isReady={true} onStart={onStart} />)
    fireEvent.click(screen.getByText('开始相面'))
    expect(onStart).toHaveBeenCalledTimes(1)
  })
})
