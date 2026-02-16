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

const mockVisualizationData = {
  landmarks: Array.from({ length: 478 }, (_, i) => [0.5 + (i % 8) * 0.001, 0.4 + (i % 6) * 0.001]),
  contour_indices: { face_oval: [10, 338, 297, 332, 284] },
  measurements: { three_parts: [0.33, 0.34, 0.33] },
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

  it('renders grok markdown formatting', async () => {
    const markdownFortunes = {
      ...mockFortunes,
      grok: {
        face: '**三庭**结构清晰\n- 上庭略短',
        career: '1. 先稳节奏\n2. 再扩团队',
        blessing: '*龙马精神*',
      },
    }
    render(<ResultOverlay fortunes={markdownFortunes} onDismiss={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('三庭')).toBeInTheDocument()
      expect(screen.getByText(/上庭略短/)).toBeInTheDocument()
      expect(screen.getByText(/1. 先稳节奏/)).toBeInTheDocument()
      expect(screen.getByText('龙马精神')).toBeInTheDocument()
    })
  })

  it('shows the dismiss hint', async () => {
    render(<ResultOverlay fortunes={mockFortunes} onDismiss={() => {}} />)
    expect(screen.getByText(/按空格键或点击此处继续下一位/)).toBeInTheDocument()
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
    fireEvent.click(screen.getByText(/按空格键或点击此处继续下一位/))
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

  it('shows updated QR helper text', async () => {
    render(<ResultOverlay fortunes={mockFortunes} onDismiss={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText('扫码获取更详细的 AI 解读')).toBeInTheDocument()
    })
  })

  it('renders a direct share link under QR helper text', async () => {
    render(<ResultOverlay fortunes={mockFortunes} onDismiss={() => {}} />)

    await waitFor(() => {
      const link = screen.getByRole('link', { name: '直接访问链接' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', 'http://localhost:3000/share/abc123')
    })
  })

  it('calls onShareCreated with generated share id', async () => {
    const onShareCreated = vi.fn()
    render(<ResultOverlay fortunes={mockFortunes} onDismiss={() => {}} onShareCreated={onShareCreated} />)

    await waitFor(() => {
      expect(onShareCreated).toHaveBeenCalledWith('abc123')
    })
  })

  it('does not show QR section title text', async () => {
    render(<ResultOverlay fortunes={mockFortunes} onDismiss={() => {}} />)

    await waitFor(() => {
      expect(screen.queryByText('分享二维码')).not.toBeInTheDocument()
    })
  })

  it('does not re-post share when callback identity changes', async () => {
    const baseCalls = mockFetch.mock.calls.length
    const first = vi.fn()
    const { rerender } = render(<ResultOverlay fortunes={mockFortunes} onDismiss={() => {}} onShareCreated={first} />)

    await waitFor(() => {
      expect(mockFetch.mock.calls.length).toBe(baseCalls + 1)
    })

    const second = vi.fn()
    rerender(<ResultOverlay fortunes={mockFortunes} onDismiss={() => {}} onShareCreated={second} />)

    await waitFor(() => {
      expect(mockFetch.mock.calls.length).toBe(baseCalls + 1)
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

  it('renders visualization card and opens modal dialog', async () => {
    render(
      <ResultOverlay
        fortunes={mockFortunes}
        visualizationData={mockVisualizationData}
        onDismiss={() => {}}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('面相特征检测结果')).toBeInTheDocument()
      expect(screen.getByText('像素画像')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '查看面相轮廓大图' }))
    expect(screen.getByRole('dialog', { name: '面相轮廓图大图' })).toBeInTheDocument()
  })
})
