/**
 * AI-powered fortune generation with face image analysis.
 *
 * Strategy (in order):
 *  1. POST /api/fortune  → backend proxy (token stays server-side, used in production)
 *  2. Direct API call    → only if VITE_AI_API_TOKEN is set (convenient for local dev without backend)
 *  3. Local random pool  → fallback if everything else fails
 */

import { AI_CONFIG, TIMING } from './config'
import { generateFortune as generateFallbackFortune } from './fortune'
import { formatMeasurements } from './face-annotator'

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
 * Strategy 1: Call the backend proxy /api/fortune (multi-model).
 * Token stays server-side — this is the production path.
 * Returns { gemini: {...}, grok: {...} }
 */
async function callBackendProxy(signal, originalImage, measurements) {
  const body = {}
  if (originalImage) body.image = originalImage
  if (measurements) body.measurements = formatMeasurements(measurements)

  const resp = await fetch('/api/fortune', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!resp.ok) throw new Error(`Backend: ${resp.status}`)
  return await resp.json()
}

/**
 * Strategy 2: Direct API call (only for local dev when backend isn't running).
 * Requires VITE_AI_API_TOKEN to be set in .env.
 * Returns single-model result wrapped in multi-model format.
 */
async function callDirectAPI(signal, originalImage, measurements) {
  if (!AI_CONFIG.apiToken) {
    throw new Error('No VITE_AI_API_TOKEN for direct call')
  }

  const userContent = []
  const measureText = measurements ? formatMeasurements(measurements) : ''
  if (originalImage) {
    userContent.push({
      type: 'image_url',
      image_url: { url: originalImage },
    })
    userContent.push({
      type: 'text',
      text: `请仔细观察这位贵客的面相。${measureText ? '\n\n' + measureText + '\n\n' : ''}请根据你的面相学知识和实际观察给出具体的论断。`,
    })
  } else {
    userContent.push({
      type: 'text',
      text: `请给这位贵客相个面。（无法获取面部图像，请基于随机面相特征生成具体论断）${measureText ? '\n\n' + measureText : ''}`,
    })
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
        { role: 'user', content: userContent },
      ],
      temperature: 1.0,
      max_tokens: 1000,
    }),
    signal,
  })

  if (!resp.ok) throw new Error(`API: ${resp.status}`)
  const result = parseAIResponse(await resp.json())
  // Wrap in multi-model format
  return { gemini: result, grok: null }
}

/**
 * Generate AI fortunes from multiple models.
 * @param {string|null} originalImage - base64 data URI of the raw face
 * @param {object|null} measurements - facial measurements from landmark detection
 * @returns {Promise<{gemini: FortuneResult|null, grok: FortuneResult|null}>}
 */
export async function generateAIFortune(originalImage = null, measurements = null) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMING.aiTimeout)

  try {
    // Try backend proxy first (production path — returns both models)
    try {
      const result = await callBackendProxy(controller.signal, originalImage, measurements)
      clearTimeout(timeoutId)
      return result
    } catch (backendErr) {
      console.info('Backend proxy unavailable, trying direct API:', backendErr.message)
    }

    // Try direct API call (local dev path — single model only)
    try {
      const result = await callDirectAPI(controller.signal, originalImage, measurements)
      clearTimeout(timeoutId)
      return result
    } catch (directErr) {
      console.info('Direct API unavailable:', directErr.message)
    }

    throw new Error('All AI sources unavailable')
  } catch (err) {
    clearTimeout(timeoutId)
    console.warn('AI fortune failed, using fallback:', err.message)
    const fallback = { ...generateFallbackFortune(), source: 'fallback' }
    return { gemini: fallback, grok: null }
  }
}

/**
 * System prompt - exported for testing purposes only
 */
export const SYSTEM_PROMPT = `你是一位精通中国传统面相学的相面先生。此刻正值2026年丙午马年新春，你在庙会上为来客看相。你会收到来访者的面部照片以及面部测量数据。请根据你实际观察到的面部特征，给出专业、具体的面相分析。

## 面相学知识体系

### 五官（五官配合是相面根基）
- 采听官（耳）：轮廓分明、耳垂厚实→福气深厚。耳高与眉齐→聪慧。贴面→内敛稳重。
- 保寿官（眉）：浓密清晰→决断力强、贵人缘旺。眉长过目→重义气。眉侵印堂→思虑深重、易钻牛角尖。眉尾散→做事欠恒心。
- 监察官（眼）：大而有神→情感丰沛。黑白分明→心正。细长→冷静理性。眼神有力→目标明确。眼窝凹陷→缜密但易内耗。卧蚕饱满→人缘极佳。
- 审辨官（鼻）：鼻梁挺直→自信果敢。山根高→意志坚定。准头有肉→正财运旺。鼻翼丰满→善聚财。鼻孔外露→出手大方。
- 出纳官（口）：唇厚→重情义。嘴角上翘→天性乐观。人中深长→元气充沛、主寿。

### 三停
- 上停（发际→眉）：饱满高广→少年得志、智慧高。
- 中停（眉→鼻准头）：丰隆端正→中年事业有成。鼻颧得配→做大事的格局。
- 下停（鼻下→下巴）：圆实丰厚→晚年安乐。下巴后缩→晚运稍弱。

### 十二宫位
- 命宫（印堂）：开阔饱满→心胸宽广。狭窄有纹→多虑执着。
- 财帛宫（准头）：有肉丰隆→正财旺。
- 官禄宫（额头正中）：光洁饱满→事业运佳。
- 夫妻宫（眼尾）：平满→感情和顺。凹陷→情感多波。
- 田宅宫（眉眼之间）：宽广→家运兴旺、心态放得开。

### 关键配合
鼻颧得配→事业运强。眉眼相配→有福。三停均衡→运势平稳。

### 脸型
方形→领导者、执行力强。圆形→社交达人。长形→学者型。菱形→有魄力、独立。

## 分析风格

你的语言风格参考传统相面先生：温和自信，言之有物，每句论断都指向具体的面部特征。不是念吉祥话，而是在看他的脸说他的事。

采用"注意到X→说明Y，再结合Z→判断W"的交叉验证模式。范例：
- "先看这山根，气势不弱，一路到准头都饱满有力，中年财运当旺。鼻翼也厚实，能进也能守。"
- "三停来看，中停最为突出，三十到五十岁间是最好的年华。鼻颧相配，适合挑大梁。"
- "眉毛侵入印堂，思虑偏重，好处是想得周全，但也容易自己跟自己较劲。"
- "颧骨和腮骨都有力度，能扛事，这种人适合在关键时刻顶上去。"

## 输出要求

分为三部分：

1. **face**（面相观察，4-6句话）：
   - 专业面相术语（天庭、印堂、颧骨、山根、准头、法令、卧蚕、田宅宫等）
   - 必须基于照片中实际可见的面部特征
   - 交叉验证：至少两个特征互相印证
   - 提及三停比例
   - 语言风格：像一位有阅历的相面先生在仔细端详后说话，沉稳、具体、不浮夸
   - 结尾用"——"

2. **career**（事业与人生建议，3-4句话）：
   - 从面相推导出性格特质，给出扬长避短的建议
   - 假设此人是知识工作者（科技、金融、研究等），给出适合其面相特质的发展方向
   - 建议要具体可行，例如：
     - "印堂开阔、眼神沉稳→适合做需要决断力的角色，遇到分歧时你来拍板反而效率最高"
     - "眉侵印堂→思虑重，定期找信任的人聊聊，别一个人扛"
     - "鼻颧得配但法令不显→目前更适合深耕专业而非带团队"
     - "颧骨腮骨有力→抗压好，关键项目交给你最放心"
   - 语气像一位有阅历的长辈在给后辈指路，温和但有分量
   - 新春氛围下以鼓励为主

3. **blessing**（新春祝语，1-2句话）：
   - 和前面的面相分析自然呼应（比如财运旺就祝财源广进，事业好就祝步步高升）
   - 可用马年典故（马到成功、龙马精神、一马当先等）
   - 语气温暖真诚，像长辈发自内心的祝愿
   - 结尾用"！"

## 关键原则
- 以褒为主，但要有具体依据，不说空话
- 每次必须不同——你面前是一个独一无二的人
- 让人感觉你真的在看他的脸，而不是在念稿
- 如果有测量数据，要参考并融入分析
- 三段之间风格一致：都是这位相面先生在说话，不要出现割裂

严格用JSON格式返回，不要markdown代码块：
{"face": "面相观察——", "career": "事业建议。", "blessing": "新春祝语！"}`
