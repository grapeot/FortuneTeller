import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
  gemini: null,
  grok: {
    face: '山根高耸，鼻梁挺直——',
    career: '颧骨有力，适合带队攻坚。',
    blessing: '一马当先！',
  },
}

describe('ResultOverlay', () => {
  it('renders the result title', async () => {
    render(<ResultOverlay fortunes={mockFortunes} onDismiss={() => {}} />)
    expect(screen.getByText(/相面结果/)).toBeInTheDocument()
    // Wait for async operations to complete
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })
  })

  it('renders the grok face reading', async () => {
    render(<ResultOverlay fortunes={mockFortunes} onDismiss={() => {}} />)
    expect(screen.getByText(mockFortunes.grok.face)).toBeInTheDocument()
    // Wait for async operations to complete
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })
  })

  it('shows the dismiss hint', async () => {
    render(<ResultOverlay fortunes={mockFortunes} onDismiss={() => {}} />)
    expect(screen.getByText(/按 空格键 继续下一位/)).toBeInTheDocument()
    // Wait for async operations to complete
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })
  })

  it('calls onDismiss when dismiss hint is clicked', async () => {
    const onDismiss = vi.fn()
    render(<ResultOverlay fortunes={mockFortunes} onDismiss={onDismiss} />)
    // Wait for async operations to complete before interacting
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })
    fireEvent.click(screen.getByText(/按 空格键 继续下一位/))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('shows the brand footer', async () => {
    render(<ResultOverlay fortunes={mockFortunes} onDismiss={() => {}} />)
    expect(screen.getByText(/Superlinear Academy/)).toBeInTheDocument()
    // Wait for async operations to complete
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })
  })

  it('renders pixelated image when provided', async () => {
    const fakePixel = 'data:image/png;base64,pixel123'
    render(<ResultOverlay fortunes={mockFortunes} pixelatedImage={fakePixel} onDismiss={() => {}} />)
    const img = screen.getByAltText('像素画像')
    expect(img).toBeInTheDocument()
    expect(img.src).toBe(fakePixel)
    // Wait for async operations to complete
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })
  })

  it('does not render pixelated image when not provided', async () => {
    render(<ResultOverlay fortunes={mockFortunes} pixelatedImage={null} onDismiss={() => {}} />)
    expect(screen.queryByAltText('像素画像')).not.toBeInTheDocument()
    // Wait for async operations to complete
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })
  })
})
