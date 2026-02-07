/**
 * AI-powered fortune generation via OpenAI-compatible API (default: Grok).
 * Falls back to the local pool engine on failure or timeout.
 */

import { AI_CONFIG, TIMING } from './config'
import { generateFortune as generateFallbackFortune } from './fortune'

const SYSTEM_PROMPT = `你是一个AI算命师，在微软春节庙会（2026马年）上给员工看面相算命。每次生成一段独特、幽默、让人开心的算命结果。

要求：
- 算命结果严格分为三部分：
  1. face（面相观察）：用传统面相术语（天庭、印堂、颧骨、眉骨、鼻梁、耳垂、唇形等）描述，结尾用"——"
  2. career（职业解读）：必须融入微软文化黑话（职级L59-L80、Connect评分、Design Doc、Story Points、On-call、Code Review、Strong Hire、Exceed Expectations、Sprint Planning、1:1、CVP、Principal、SDE、PM、SDET等），语气自信、夸张、好笑
  3. blessing（马年祝福）：包含马年成语或谐音梗（马到成功、一马当先、万马奔腾、龙马精神、马上有钱等），结尾用"！"
- 三部分各一句话，不要太长
- 每次内容必须完全不同，要有创意和惊喜
- 只说好话，让人高兴

严格用JSON格式返回，不要markdown代码块：
{"face": "面相观察句——", "career": "职业解读句。", "blessing": "马年祝福句！"}`

/**
 * Call the AI API to generate a fortune.
 * @returns {Promise<{face: string, career: string, blessing: string, full: string, source: string}>}
 */
export async function generateAIFortune() {
  if (!AI_CONFIG.apiToken) {
    console.warn('No AI_BUILDER_TOKEN configured, using fallback')
    return { ...generateFallbackFortune(), source: 'fallback' }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMING.aiTimeout)

  try {
    const response = await fetch(`${AI_CONFIG.baseUrl}/chat/completions`, {
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
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content?.trim()

    if (!text) throw new Error('Empty AI response')

    // Parse JSON (handle possible markdown code fences)
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
  } catch (err) {
    clearTimeout(timeoutId)
    console.warn('AI fortune failed, using fallback:', err.message)
    return { ...generateFallbackFortune(), source: 'fallback' }
  }
}
