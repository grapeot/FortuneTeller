import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateAIFortune } from './ai-fortune'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock config – token set so direct-call path is available
vi.mock('./config', () => ({
  AI_CONFIG: {
    baseUrl: 'https://test.api.com/v1',
    apiToken: 'test-token',
    model: 'grok-4-fast',
  },
  TIMING: {
    analyzeDuration: 2500,
    resultDuration: 8000,
    aiTimeout: 8000,
  },
}))

describe('generateAIFortune', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('should use backend proxy when available', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        face: '天庭饱满——',
        career: '必是L65。',
        blessing: '马到成功！',
        source: 'ai',
      }),
    })

    const result = await generateAIFortune()
    expect(result.source).toBe('ai')
    expect(result.face).toBe('天庭饱满——')
    expect(result.full).toBe('天庭饱满——必是L65。马到成功！')

    // Should have called /api/fortune
    expect(mockFetch.mock.calls[0][0]).toBe('/api/fortune')
  })

  it('should fall back to direct API when backend returns error', async () => {
    // Backend returns 404
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
    // Direct API succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                face: '印堂发亮——',
                career: 'L67 CVP。',
                blessing: '一马当先！',
              }),
            },
          },
        ],
      }),
    })

    const result = await generateAIFortune()
    expect(result.source).toBe('ai')
    expect(result.face).toBe('印堂发亮——')

    // First call was backend, second was direct
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch.mock.calls[0][0]).toBe('/api/fortune')
    expect(mockFetch.mock.calls[1][0]).toContain('chat/completions')
  })

  it('should handle markdown-wrapped JSON from direct API', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '```json\n{"face": "a——", "career": "b。", "blessing": "c！"}\n```',
            },
          },
        ],
      }),
    })

    const result = await generateAIFortune()
    expect(result.source).toBe('ai')
    expect(result.face).toBe('a——')
  })

  it('should fall back to local pool when all AI paths fail', async () => {
    // Backend fails
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    // Direct API also fails
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    const result = await generateAIFortune()
    expect(result.source).toBe('fallback')
    expect(result.face).toBeTruthy()
    expect(result.career).toBeTruthy()
    expect(result.blessing).toBeTruthy()
  })

  it('should fall back on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const result = await generateAIFortune()
    expect(result.source).toBe('fallback')
    expect(result.full).toBeTruthy()
  })

  it('should fall back when direct API returns invalid JSON', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'not valid json' } }],
      }),
    })

    const result = await generateAIFortune()
    expect(result.source).toBe('fallback')
  })

  it('backend response should include full field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        face: 'A——',
        career: 'B。',
        blessing: 'C！',
        source: 'ai',
      }),
    })

    const result = await generateAIFortune()
    expect(result.full).toBe('A——B。C！')
  })
})
