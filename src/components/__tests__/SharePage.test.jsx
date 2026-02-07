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
    // h3 heading and button have different text (AI wrapped in span)
    expect(screen.getByText((_, el) => el.tagName === 'H3' && el.textContent.includes('接收') && el.textContent.includes('AI'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: (name) => name.includes('免费获取') && name.includes('AI') })).toBeInTheDocument()
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
    const submitButton = screen.getByRole('button', { name: /免费获取.*AI.*深度分析报告/ })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/分析已提交/)).toBeInTheDocument()
    })

    // Verify the API call
    const subscribeCall = mockFetch.mock.calls[1]
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

    const submitButton = screen.getByRole('button', { name: /免费获取.*AI.*深度分析报告/ })
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
