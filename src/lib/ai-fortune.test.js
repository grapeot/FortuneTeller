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
    aiTimeout: 30000,
  },
}))

// Mock face-annotator (formatMeasurements)
vi.mock('./face-annotator', () => ({
  formatMeasurements: (m) => m ? '【面部测量数据】\n三停比例：上庭33% / 中庭34% / 下庭33%' : '',
}))

describe('generateAIFortune (multi-model)', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('should use backend proxy and return multi-model format', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        gemini: { face: '天庭饱满——', career: '事业有成。', blessing: '马到成功！', source: 'ai' },
        grok: { face: '印堂发亮——', career: '适合深耕。', blessing: '龙马精神！', source: 'ai' },
      }),
    })

    const result = await generateAIFortune()
    expect(result.gemini).toBeTruthy()
    expect(result.grok).toBeTruthy()
    expect(result.gemini.face).toBe('天庭饱满——')
    expect(result.grok.face).toBe('印堂发亮——')

    expect(mockFetch.mock.calls[0][0]).toBe('/api/fortune')
    expect(mockFetch.mock.calls[0][1].method).toBe('POST')
  })

  it('should send image and measurements to backend proxy', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        gemini: { face: '观面——', career: '建议。', blessing: '祝福！', source: 'ai' },
        grok: null,
      }),
    })

    const fakeOriginal = 'data:image/jpeg;base64,original'
    const fakeMeasurements = { 三停比例: { 上庭: 33, 中庭: 34, 下庭: 33 } }

    const result = await generateAIFortune(fakeOriginal, fakeMeasurements)
    expect(result.gemini).toBeTruthy()

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.image).toBe(fakeOriginal)
    expect(callBody.measurements).toContain('三停比例')
    expect(callBody.annotated_image).toBeUndefined()
  })

  it('should fall back to direct API returning wrapped format', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                face: '印堂发亮——',
                career: '前途光明。',
                blessing: '一马当先！',
              }),
            },
          },
        ],
      }),
    })

    const result = await generateAIFortune()
    expect(result.grok).toBeTruthy()
    expect(result.grok.face).toBe('印堂发亮——')
    expect(result.gemini).toBeNull()
  })

  it('should send multimodal content in direct API', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                face: '颧骨高耸——',
                career: '适合领导。',
                blessing: '龙马精神！',
              }),
            },
          },
        ],
      }),
    })

    const fakeOriginal = 'data:image/jpeg;base64,orig'
    const fakeMeasurements = { 三停比例: { 上庭: 33, 中庭: 34, 下庭: 33 } }
    await generateAIFortune(fakeOriginal, fakeMeasurements)

    const directCallBody = JSON.parse(mockFetch.mock.calls[1][1].body)
    const userMsg = directCallBody.messages[1]
    expect(Array.isArray(userMsg.content)).toBe(true)
    expect(userMsg.content[0].type).toBe('image_url')
    expect(userMsg.content[0].image_url.url).toBe(fakeOriginal)
    expect(userMsg.content[1].type).toBe('text')
    expect(userMsg.content[1].text).toContain('三停比例')
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
    expect(result.grok.face).toBe('a——')
  })

  it('should fall back to local pool when all AI paths fail', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    const result = await generateAIFortune()
    expect(result.grok.source).toBe('fallback')
    expect(result.grok.face).toBeTruthy()
  })

  it('should fall back on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const result = await generateAIFortune()
    expect(result.grok.source).toBe('fallback')
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
    expect(result.grok.source).toBe('fallback')
  })
})

describe('SYSTEM_PROMPT', () => {
  it('should contain face reading knowledge', () => {
    expect(SYSTEM_PROMPT).toContain('面相学')
    expect(SYSTEM_PROMPT).toContain('天庭')
    expect(SYSTEM_PROMPT).toContain('印堂')
    expect(SYSTEM_PROMPT).toContain('三停')
    expect(SYSTEM_PROMPT).toContain('十二宫位')
    expect(SYSTEM_PROMPT).not.toContain('算命')
  })

  it('should use traditional face reading style with 相面先生', () => {
    expect(SYSTEM_PROMPT).toContain('相面先生')
    expect(SYSTEM_PROMPT).toContain('鼻颧得配')
    expect(SYSTEM_PROMPT).toContain('交叉验证')
  })

  it('should describe career section as authentic advice, not forced placement', () => {
    expect(SYSTEM_PROMPT).toContain('扬长避短')
    expect(SYSTEM_PROMPT).toContain('知识工作者')
    // Should NOT contain forced Microsoft jargon
    expect(SYSTEM_PROMPT).not.toContain('Connect评分')
    expect(SYSTEM_PROMPT).not.toContain('Connect全Exceed')
    expect(SYSTEM_PROMPT).not.toContain('马上Principal')
  })

  it('should reference measurements', () => {
    expect(SYSTEM_PROMPT).toContain('测量数据')
  })

  it('should include horse year themes in blessing', () => {
    expect(SYSTEM_PROMPT).toContain('马到成功')
    expect(SYSTEM_PROMPT).toContain('龙马精神')
    expect(SYSTEM_PROMPT).toContain('马年')
  })
})
