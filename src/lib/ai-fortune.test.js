import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateAIFortune, SYSTEM_PROMPT } from './ai-fortune'

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
    aiTimeout: 15000,
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

    // Should have called /api/fortune with POST and JSON body
    expect(mockFetch.mock.calls[0][0]).toBe('/api/fortune')
    expect(mockFetch.mock.calls[0][1].method).toBe('POST')
    expect(mockFetch.mock.calls[0][1].headers['Content-Type']).toBe('application/json')
  })

  it('should send image to backend proxy when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        face: '天庭饱满，印堂发亮——',
        career: 'L67 Principal无疑。',
        blessing: '一马当先！',
        source: 'ai',
      }),
    })

    const fakeImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
    const result = await generateAIFortune(fakeImage)
    expect(result.source).toBe('ai')

    // Verify image was included in request body
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.image).toBe(fakeImage)
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

  it('should send multimodal content in direct API when image provided', async () => {
    // Backend fails
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
    // Direct API succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                face: '颧骨高耸——',
                career: 'Manager气场。',
                blessing: '龙马精神！',
              }),
            },
          },
        ],
      }),
    })

    const fakeImage = 'data:image/jpeg;base64,/9j/4AAQ=='
    await generateAIFortune(fakeImage)

    // Direct API call should have multimodal user content
    const directCallBody = JSON.parse(mockFetch.mock.calls[1][1].body)
    const userMsg = directCallBody.messages[1]
    expect(Array.isArray(userMsg.content)).toBe(true)
    expect(userMsg.content[0].type).toBe('image_url')
    expect(userMsg.content[0].image_url.url).toBe(fakeImage)
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

describe('SYSTEM_PROMPT', () => {
  it('should contain face reading knowledge', () => {
    expect(SYSTEM_PROMPT).toContain('面相学')
    expect(SYSTEM_PROMPT).toContain('天庭')
    expect(SYSTEM_PROMPT).toContain('印堂')
    expect(SYSTEM_PROMPT).toContain('三停')
    expect(SYSTEM_PROMPT).toContain('十二宫位')
  })

  it('should contain Microsoft-specific references', () => {
    expect(SYSTEM_PROMPT).toContain('L65-L67')
    expect(SYSTEM_PROMPT).toContain('Principal')
    expect(SYSTEM_PROMPT).toContain('Design Doc')
  })

  it('should request multimodal analysis', () => {
    expect(SYSTEM_PROMPT).toContain('面部照片')
    expect(SYSTEM_PROMPT).toContain('实际观察')
  })
})
