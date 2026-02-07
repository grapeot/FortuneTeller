import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ResultOverlay from '../ResultOverlay'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    h2: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
    p: ({ children, ...props }) => <p {...props}>{children}</p>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}))

// Mock qrcode
vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mockqr') },
}))

// Mock fetch for auto-share
const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ id: 'abc123', url: '/share/abc123' }),
})
vi.stubGlobal('fetch', mockFetch)

const mockFortune = {
  face: '天庭饱满，眉宇开阔——',
  career: '印堂开阔、眼神有力，建议多承担architect角色。',
  blessing: '马到成功，新Feature一次上线！',
  full: '天庭饱满，眉宇开阔——印堂开阔、眼神有力，建议多承担architect角色。马到成功，新Feature一次上线！',
}

describe('ResultOverlay', () => {
  it('renders the result title', () => {
    render(<ResultOverlay fortune={mockFortune} onDismiss={() => {}} />)
    expect(screen.getByText(/您的相面结果/)).toBeInTheDocument()
  })

  it('renders the face reading', () => {
    render(<ResultOverlay fortune={mockFortune} onDismiss={() => {}} />)
    expect(screen.getByText(mockFortune.face)).toBeInTheDocument()
  })

  it('renders the career reading', () => {
    render(<ResultOverlay fortune={mockFortune} onDismiss={() => {}} />)
    expect(screen.getByText(mockFortune.career)).toBeInTheDocument()
  })

  it('renders the blessing', () => {
    render(<ResultOverlay fortune={mockFortune} onDismiss={() => {}} />)
    expect(screen.getByText(/马到成功/)).toBeInTheDocument()
  })

  it('shows the dismiss hint', () => {
    render(<ResultOverlay fortune={mockFortune} onDismiss={() => {}} />)
    expect(screen.getByText(/按 空格键 继续下一位/)).toBeInTheDocument()
  })

  it('calls onDismiss when dismiss hint is clicked', () => {
    const onDismiss = vi.fn()
    render(<ResultOverlay fortune={mockFortune} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByText(/按 空格键 继续下一位/))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('shows the brand footer', () => {
    render(<ResultOverlay fortune={mockFortune} onDismiss={() => {}} />)
    expect(screen.getByText(/Superlinear Academy/)).toBeInTheDocument()
  })

  it('renders pixelated image when provided', () => {
    const fakePixel = 'data:image/png;base64,pixel123'
    render(<ResultOverlay fortune={mockFortune} pixelatedImage={fakePixel} onDismiss={() => {}} />)
    const img = screen.getByAltText('像素头像')
    expect(img).toBeInTheDocument()
    expect(img.src).toBe(fakePixel)
  })

  it('does not render pixelated image when not provided', () => {
    render(<ResultOverlay fortune={mockFortune} pixelatedImage={null} onDismiss={() => {}} />)
    expect(screen.queryByAltText('像素头像')).not.toBeInTheDocument()
  })
})
