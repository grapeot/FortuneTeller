/**
 * AI-powered fortune generation.
 *
 * Strategy (in order):
 *  1. POST /api/fortune  → backend proxy (token stays server-side, used in production)
 *  2. Direct API call    → only if VITE_AI_API_TOKEN is set (convenient for local dev without backend)
 *  3. Local random pool  → fallback if everything else fails
 */

import { AI_CONFIG, TIMING } from './config'
import { generateFortune as generateFallbackFortune } from './fortune'

const SYSTEM_PROMPT = `你是一个AI算命师，在微软春节庙会（2026马年）上给员工看面相算命。每次生成一段独特、幽默、让人开心的算命结果。

要求：
- 算命结果严格分为三部分：
  1. face（面相观察）：用传统面相术语（天庭、印堂、颧骨、眉骨、鼻梁、耳垂、唇形等）描述，结尾用"——"
  2. career（职业解读）：必须融入微软文化黑话，语气自信、夸张、好笑。注意职级范围：
     - IC路线：L59-L64 (SDE I/II), L65-L67 (Principal), L68-L70 (Partner/Partner+)
     - Manager路线：L59-L64 (Manager), L65-L67 (Principal Manager), L68+ (Director+)
     - 其他黑话：Connect评分、Design Doc、Story Points、On-call、Code Review、Strong Hire、Exceed Expectations、Sprint Planning、1:1、CVP、SDE、PM、SDET等
  3. blessing（马年祝福）：包含马年成语或谐音梗（马到成功、一马当先、万马奔腾、龙马精神、马上有钱等），结尾用"！"
- 三部分各一句话，不要太长
- 每次内容必须完全不同，要有创意和惊喜
- 只说好话，让人高兴
- 职级描述必须准确：Principal是L65-L67，不要写成L70

严格用JSON格式返回，不要markdown代码块：
{"face": "面相观察句——", "career": "职业解读句。", "blessing": "马年祝福句！"}`

/**
 * Parse a fortune from the AI response choices structure.
 */
function parseAIResponse(data) {
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('Empty AI response')

  const jsonStr = text.replace(/```json?\s*/g, '').replace(/```/g, '').trim()
  const parsed = JSON.parse(jsonStr)

  if (!parsed.face || !parsed.career || !parsed.blessing) {
    throw new Error('Incomplete fortune structure')
  }

  return {
    face: parsed.face,
    career: parsed.career,
    blessing: parsed.blessing,
    full: `${parsed.face}${parsed.career}${parsed.blessing}`,
    source: 'ai',
  }
}

/**
 * Strategy 1: Call the backend proxy /api/fortune.
 * Token stays server-side — this is the production path.
 */
async function callBackendProxy(signal) {
  const resp = await fetch('/api/fortune', {
    method: 'POST',
    signal,
  })
  if (!resp.ok) throw new Error(`Backend: ${resp.status}`)
  const data = await resp.json()

  // Backend already returns {face, career, blessing, source}
  if (data.face && data.career && data.blessing) {
    return {
      ...data,
      full: `${data.face}${data.career}${data.blessing}`,
      source: 'ai',
    }
  }
  throw new Error('Invalid backend response')
}

/**
 * Strategy 2: Direct API call (only for local dev when backend isn't running).
 * Requires VITE_AI_API_TOKEN to be set in .env.
 */
async function callDirectAPI(signal) {
  if (!AI_CONFIG.apiToken) {
    throw new Error('No VITE_AI_API_TOKEN for direct call')
  }

  const resp = await fetch(`${AI_CONFIG.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_CONFIG.apiToken}`,
    },
    body: JSON.stringify({
      model: AI_CONFIG.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: '请给这位贵客算一卦。' },
      ],
      temperature: 1.2,
      max_tokens: 300,
    }),
    signal,
  })

  if (!resp.ok) throw new Error(`API: ${resp.status}`)
  return parseAIResponse(await resp.json())
}

/**
 * Generate an AI fortune using the best available method.
 * @returns {Promise<{face: string, career: string, blessing: string, full: string, source: string}>}
 */
export async function generateAIFortune() {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMING.aiTimeout)

  try {
    // Try backend proxy first (production path)
    try {
      const result = await callBackendProxy(controller.signal)
      clearTimeout(timeoutId)
      return result
    } catch (backendErr) {
      console.info('Backend proxy unavailable, trying direct API:', backendErr.message)
    }

    // Try direct API call (local dev path)
    try {
      const result = await callDirectAPI(controller.signal)
      clearTimeout(timeoutId)
      return result
    } catch (directErr) {
      console.info('Direct API unavailable:', directErr.message)
    }

    // All AI paths failed
    throw new Error('All AI sources unavailable')
  } catch (err) {
    clearTimeout(timeoutId)
    console.warn('AI fortune failed, using fallback:', err.message)
    return { ...generateFallbackFortune(), source: 'fallback' }
  }
}
