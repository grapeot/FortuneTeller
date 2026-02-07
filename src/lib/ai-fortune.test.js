import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateAIFortune } from './ai-fortune'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock config to provide a token
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

  it('should return a fortune object with face, career, blessing, full, and source', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                face: '天庭饱满——',
                career: '必是L65的大佬。',
                blessing: '马到成功！',
              }),
            },
          },
        ],
      }),
    })

    const result = await generateAIFortune()
    expect(result).toHaveProperty('face', '天庭饱满——')
    expect(result).toHaveProperty('career', '必是L65的大佬。')
    expect(result).toHaveProperty('blessing', '马到成功！')
    expect(result).toHaveProperty('source', 'ai')
    expect(result.full).toBe('天庭饱满——必是L65的大佬。马到成功！')
  })

  it('should send correct request to the API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '{"face": "a——", "career": "b。", "blessing": "c！"}',
            },
          },
        ],
      }),
    })

    await generateAIFortune()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('https://test.api.com/v1/chat/completions')
    expect(options.method).toBe('POST')
    expect(options.headers['Authorization']).toBe('Bearer test-token')

    const body = JSON.parse(options.body)
    expect(body.model).toBe('grok-4-fast')
    expect(body.messages).toHaveLength(2)
    expect(body.messages[0].role).toBe('system')
    expect(body.messages[1].role).toBe('user')
  })

  it('should handle markdown-wrapped JSON in response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '```json\n{"face": "印堂发亮——", "career": "L67。", "blessing": "一马当先！"}\n```',
            },
          },
        ],
      }),
    })

    const result = await generateAIFortune()
    expect(result.source).toBe('ai')
    expect(result.face).toBe('印堂发亮——')
  })

  it('should fall back to pool fortune on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    const result = await generateAIFortune()
    expect(result).toHaveProperty('face')
    expect(result).toHaveProperty('career')
    expect(result).toHaveProperty('blessing')
    expect(result.source).toBe('fallback')
  })

  it('should fall back on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const result = await generateAIFortune()
    expect(result.source).toBe('fallback')
    expect(result.full).toBeTruthy()
  })

  it('should fall back on invalid JSON response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'not valid json' } }],
      }),
    })

    const result = await generateAIFortune()
    expect(result.source).toBe('fallback')
  })

  it('should fall back on incomplete fortune structure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '{"face": "test", "career": "test"}',
            },
          },
        ],
      }),
    })

    const result = await generateAIFortune()
    expect(result.source).toBe('fallback')
  })
})
