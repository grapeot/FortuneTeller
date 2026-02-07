import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ResultOverlay from '../ResultOverlay'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    h2: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
    h3: ({ children, ...props }) => <h3 {...props}>{children}</h3>,
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

const mockFortunes = {
  gemini: {
    face: '天庭饱满，眉宇开阔——',
    career: '印堂开阔、眼神有力，适合承担需要决断力的角色。',
    blessing: '马到成功！',
  },
  grok: {
    face: '山根高耸，鼻梁挺直——',
    career: '颧骨有力，适合带队攻坚。',
    blessing: '一马当先！',
  },
}

describe('ResultOverlay', () => {
  it('renders the result title', () => {
    render(<ResultOverlay fortunes={mockFortunes} onDismiss={() => {}} />)
    expect(screen.getByText(/相面结果/)).toBeInTheDocument()
  })

  it('renders the default (gemini) face reading', () => {
    render(<ResultOverlay fortunes={mockFortunes} onDismiss={() => {}} />)
    expect(screen.getByText(mockFortunes.gemini.face)).toBeInTheDocument()
  })

  it('renders model tabs when both models available', () => {
    render(<ResultOverlay fortunes={mockFortunes} onDismiss={() => {}} />)
    expect(screen.getByText('Gemini')).toBeInTheDocument()
    expect(screen.getByText('Grok')).toBeInTheDocument()
  })

  it('switches to grok tab on click', () => {
    render(<ResultOverlay fortunes={mockFortunes} onDismiss={() => {}} />)
    fireEvent.click(screen.getByText('Grok'))
    expect(screen.getByText(mockFortunes.grok.face)).toBeInTheDocument()
  })

  it('shows the dismiss hint', () => {
    render(<ResultOverlay fortunes={mockFortunes} onDismiss={() => {}} />)
    expect(screen.getByText(/按 空格键 继续下一位/)).toBeInTheDocument()
  })

  it('calls onDismiss when dismiss hint is clicked', () => {
    const onDismiss = vi.fn()
    render(<ResultOverlay fortunes={mockFortunes} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByText(/按 空格键 继续下一位/))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('shows the brand footer', () => {
    render(<ResultOverlay fortunes={mockFortunes} onDismiss={() => {}} />)
    expect(screen.getByText(/Superlinear Academy/)).toBeInTheDocument()
  })

  it('renders pixelated image when provided', () => {
    const fakePixel = 'data:image/png;base64,pixel123'
    render(<ResultOverlay fortunes={mockFortunes} pixelatedImage={fakePixel} onDismiss={() => {}} />)
    const img = screen.getByAltText('像素画像')
    expect(img).toBeInTheDocument()
    expect(img.src).toBe(fakePixel)
  })

  it('does not render pixelated image when not provided', () => {
    render(<ResultOverlay fortunes={mockFortunes} pixelatedImage={null} onDismiss={() => {}} />)
    expect(screen.queryByAltText('像素画像')).not.toBeInTheDocument()
  })

  it('does not show tabs when only one model has results', () => {
    const singleModel = { gemini: mockFortunes.gemini, grok: null }
    render(<ResultOverlay fortunes={singleModel} onDismiss={() => {}} />)
    expect(screen.queryByText('Grok')).not.toBeInTheDocument()
  })

  it('defaults to grok when gemini is null', () => {
    const grokOnly = { gemini: null, grok: mockFortunes.grok }
    render(<ResultOverlay fortunes={grokOnly} onDismiss={() => {}} />)
    expect(screen.getByText(mockFortunes.grok.face)).toBeInTheDocument()
  })
})
