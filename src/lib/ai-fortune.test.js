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

// Mock face-annotator (formatMeasurements)
vi.mock('./face-annotator', () => ({
  formatMeasurements: (m) => m ? '【面部测量数据】\n三停比例：上停33% / 中停34% / 下停33%' : '',
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
  })

  it('should send both images and measurements to backend proxy', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        face: '天庭饱满，印堂发亮——',
        career: 'L67 Principal无疑。',
        blessing: '一马当先！',
        source: 'ai',
      }),
    })

    const fakeOriginal = 'data:image/jpeg;base64,original'
    const fakeAnnotated = 'data:image/jpeg;base64,annotated'
    const fakeMeasurements = { 三停比例: { 上停: 33, 中停: 34, 下停: 33 } }

    const result = await generateAIFortune(fakeOriginal, fakeAnnotated, fakeMeasurements)
    expect(result.source).toBe('ai')

    // Verify all data was included in request body
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.image).toBe(fakeOriginal)
    expect(callBody.annotated_image).toBe(fakeAnnotated)
    expect(callBody.measurements).toContain('三停比例')
  })

  it('should fall back to direct API when backend returns error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
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
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('should send multimodal content with both images in direct API', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
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

    const fakeOriginal = 'data:image/jpeg;base64,orig'
    const fakeAnnotated = 'data:image/jpeg;base64,anno'
    await generateAIFortune(fakeOriginal, fakeAnnotated, null)

    // Direct API call should have multimodal user content with both images
    const directCallBody = JSON.parse(mockFetch.mock.calls[1][1].body)
    const userMsg = directCallBody.messages[1]
    expect(Array.isArray(userMsg.content)).toBe(true)
    // Should have 3 parts: original image, annotated image, text
    expect(userMsg.content[0].type).toBe('image_url')
    expect(userMsg.content[0].image_url.url).toBe(fakeOriginal)
    expect(userMsg.content[1].type).toBe('image_url')
    expect(userMsg.content[1].image_url.url).toBe(fakeAnnotated)
    expect(userMsg.content[2].type).toBe('text')
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
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
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

  it('should contain Tony Zhang-style analysis patterns', () => {
    expect(SYSTEM_PROMPT).toContain('首先注意到')
    expect(SYSTEM_PROMPT).toContain('鼻颧得配')
    expect(SYSTEM_PROMPT).toContain('交叉验证')
  })

  it('should describe career section as actionable advice, not jokes', () => {
    expect(SYSTEM_PROMPT).toContain('扬长避短')
    expect(SYSTEM_PROMPT).toContain('可执行')
    expect(SYSTEM_PROMPT).toContain('mentor')
  })

  it('should reference annotated image and measurements', () => {
    expect(SYSTEM_PROMPT).toContain('标注了面相关键部位')
    expect(SYSTEM_PROMPT).toContain('测量数据')
  })

  it('should contain tech company career context', () => {
    expect(SYSTEM_PROMPT).toContain('大厂')
    expect(SYSTEM_PROMPT).toContain('Design Doc')
    expect(SYSTEM_PROMPT).toContain('Code Review')
  })
})
