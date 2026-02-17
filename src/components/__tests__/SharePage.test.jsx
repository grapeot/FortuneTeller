import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SharePage from '../SharePage'

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

const mockShareData = {
  pixelated_image: 'data:image/png;base64,px123',
  visualization_data: null,
  fortunes: {
    gemini: null,
    grok: {
      face: '山根高耸——',
      career: '颧骨有力，适合带队攻坚。',
      blessing: '一马当先！',
    },
  },
}

let mockFetch

beforeEach(() => {
  mockFetch = vi.fn()
  vi.stubGlobal('fetch', mockFetch)
})


describe('SharePage', () => {
  it('shows loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {})) // never resolves
    render(<SharePage shareId="test123" />)
    expect(screen.getByText('正在加载...')).toBeInTheDocument()
  })

  it('shows error on 404', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
    render(<SharePage shareId="nonexistent" />)
    await waitFor(() => {
      expect(screen.getByText('分享链接已失效或不存在')).toBeInTheDocument()
    })
  })

  it('renders fortune data from grok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockShareData,
    })
    render(<SharePage shareId="test123" />)
    await waitFor(() => {
      expect(screen.getByText('山根高耸——')).toBeInTheDocument()
    })
  })

  it('renders pixelated avatar', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockShareData,
    })
    render(<SharePage shareId="test123" />)
    await waitFor(() => {
      const img = screen.getByAltText('像素画像')
      expect(img).toBeInTheDocument()
      expect(img.src).toBe(mockShareData.pixelated_image)
    })
  })

  it('renders privacy landmark visualization when visualization_data exists', async () => {
    const withViz = {
      ...mockShareData,
      visualization_data: {
        landmarks: Array.from({ length: 478 }, (_, i) => [0.5 + (i % 10) * 0.001, 0.4 + (i % 7) * 0.001]),
        contour_indices: { face_oval: [10, 338, 297, 332, 284] },
      },
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => withViz,
    })

    render(<SharePage shareId="test123" />)

    await waitFor(() => {
      expect(screen.getAllByText('面相特征检测结果').length).toBeGreaterThan(0)
    })
  })

  it('renders visualization cards in all three presentation layers and supports modal zoom', async () => {
    const withViz = {
      ...mockShareData,
      visualization_data: {
        landmarks: Array.from({ length: 478 }, (_, i) => [0.5 + (i % 10) * 0.001, 0.4 + (i % 7) * 0.001]),
        contour_indices: { face_oval: [10, 338, 297, 332, 284] },
        measurements: {
          three_parts: [0.31, 0.35, 0.34],
          tian_zhai_gong_height_eye_ratio: 0.69,
        },
      },
    }

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => withViz,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ analysis: 'l2 ready' }),
      })

    render(<SharePage shareId="test123" />)

    await waitFor(() => {
      expect(screen.getAllByText('点击查看大图')).toHaveLength(1)
    })

    fireEvent.click(screen.getByRole('button', { name: '查看面相轮廓大图' }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: '面相轮廓图大图' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '面相轮廓图大图' })).not.toBeInTheDocument()
    })
  })

  it('renders the email subscription form', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockShareData,
    })
    render(<SharePage shareId="test123" />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument()
    })
    expect(screen.getByPlaceholderText('姓名/昵称（选填）')).toBeInTheDocument()
    expect(screen.getByText((_, el) => el.tagName === 'H3' && el.textContent.includes('留下邮箱查看 Gemini 3 Flash'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /留邮箱获取三模型完整解读/ })).toBeInTheDocument()
  })

  it('renders Gemini analysis title and markdown sections', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockShareData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ analysis: '## 证据摘要\n- 第一条\n- 第二条' }),
      })

    render(<SharePage shareId="test123" />)

    await waitFor(() => {
      expect(screen.getByText('Gemini 3 分析')).toBeInTheDocument()
      expect(screen.getByText('证据摘要')).toBeInTheDocument()
      expect(screen.getByText(/第一条/)).toBeInTheDocument()
    })
  })

  it('uses cached Gemini analysis from share payload when available', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...mockShareData,
        analysis_l2: '## 缓存命中\n- 来自 Firestore',
      }),
    })

    render(<SharePage shareId="test123" />)

    await waitFor(() => {
      expect(screen.getByText('缓存命中')).toBeInTheDocument()
      expect(screen.getByText(/来自 Firestore/)).toBeInTheDocument()
    })

    const l2Calls = mockFetch.mock.calls.filter((call) => call[0] === '/api/analysis/l2')
    expect(l2Calls).toHaveLength(0)
  })

  it('submits the subscription form and shows success', async () => {
    // First call: fetch share data
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockShareData,
    })

    render(<SharePage shareId="test123" />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument()
    })

    // Fill the form
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('姓名/昵称（选填）'), {
      target: { value: '张三' },
    })

    // Mock the subscribe API call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'accepted' }),
    })

    // Submit
    const submitButton = screen.getByRole('button', { name: /留邮箱获取三模型完整解读/ })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/分析已提交/)).toBeInTheDocument()
    })

    // Verify the API call
    const subscribeCall = mockFetch.mock.calls.find((call) => call[0] === '/api/subscribe')
    expect(subscribeCall[0]).toBe('/api/subscribe')
    const body = JSON.parse(subscribeCall[1].body)
    expect(body.email).toBe('test@example.com')
    expect(body.name).toBe('张三')
    expect(body.share_id).toBe('test123')
  })

  it('shows error state on subscription failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockShareData,
    })

    render(<SharePage shareId="test123" />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText('your@email.com'), {
      target: { value: 'test@example.com' },
    })

    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    const submitButton = screen.getByRole('button', { name: /留邮箱获取三模型完整解读/ })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('提交失败，请稍后重试')).toBeInTheDocument()
    })
  })

  it('shows no result message when grok is null', async () => {
    const noGrok = {
      ...mockShareData,
      fortunes: { gemini: null, grok: null },
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => noGrok,
    })
    render(<SharePage shareId="test123" />)
    await waitFor(() => {
      expect(screen.getByText('该模型暂无结果')).toBeInTheDocument()
    })
  })

  it('shows CTA link to homepage', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockShareData,
    })
    render(<SharePage shareId="test123" />)
    await waitFor(() => {
      expect(screen.getByText('我也要相面 →')).toBeInTheDocument()
    })
  })
})
