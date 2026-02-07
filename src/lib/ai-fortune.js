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
 * Sends the face image (base64) for multimodal analysis.
 */
async function callBackendProxy(signal, imageDataUrl) {
  const body = {}
  if (imageDataUrl) {
    body.image = imageDataUrl
  }

  const resp = await fetch('/api/fortune', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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
async function callDirectAPI(signal, imageDataUrl) {
  if (!AI_CONFIG.apiToken) {
    throw new Error('No VITE_AI_API_TOKEN for direct call')
  }

  // Build user message content - multimodal if image available
  const userContent = []
  if (imageDataUrl) {
    userContent.push({
      type: 'image_url',
      image_url: { url: imageDataUrl },
    })
    userContent.push({
      type: 'text',
      text: '请仔细观察这位贵客的面相，根据你的面相学知识给出具体的论断。',
    })
  } else {
    userContent.push({
      type: 'text',
      text: '请给这位贵客算一卦。（无法获取面部图像，请基于随机面相特征生成）',
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
  return parseAIResponse(await resp.json())
}

/**
 * Generate an AI fortune using the best available method.
 * @param {string|null} imageDataUrl - Optional base64 data URI of the face
 * @returns {Promise<{face: string, career: string, blessing: string, full: string, source: string}>}
 */
export async function generateAIFortune(imageDataUrl = null) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMING.aiTimeout)

  try {
    // Try backend proxy first (production path)
    try {
      const result = await callBackendProxy(controller.signal, imageDataUrl)
      clearTimeout(timeoutId)
      return result
    } catch (backendErr) {
      console.info('Backend proxy unavailable, trying direct API:', backendErr.message)
    }

    // Try direct API call (local dev path)
    try {
      const result = await callDirectAPI(controller.signal, imageDataUrl)
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

/**
 * System prompt - exported for testing purposes only
 */
export const SYSTEM_PROMPT = `你是一位精通中国传统面相学的AI算命大师，现在在微软2026年春节庙会（马年）上给员工看面相算命。你会收到一张来访者的面部照片，请根据实际观察到的面部特征，给出专业、具体、有趣的面相分析。

## 你的面相学知识体系

### 五官定义
- 采听官（耳）：主长寿、学习力。轮廓分明、耳垂厚实为佳。
- 保寿官（眉）：主健康、地位。浓密清晰、眉长过目为佳。
- 监察官（眼）：主意志力、智慧。黑白分明、有神为佳。
- 审辨官（鼻）：主财富。鼻梁高挺、准头有肉为佳。
- 出纳官（口）：主福禄。唇红润厚实、嘴角上翘为佳。

### 三停
- 上停（发际→眉）：15-30岁运势，代表智慧和早年运。饱满高广为佳。
- 中停（眉→鼻尖）：31-50岁运势，代表事业和财富。丰隆端峻为佳。
- 下停（鼻下→下巴）：51岁后运势，代表晚年和福气。圆实丰厚为佳。

### 十二宫位（重点）
- 命宫（印堂）：两眉之间。宽阔饱满→积极乐观、适应力强。
- 财帛宫（鼻头）：准头丰隆有肉→正财运旺。鼻翼饱满→能聚财。
- 官禄宫（额头正中）：光洁饱满→事业学业运佳。
- 夫妻宫（眼尾）：平满无纹→感情和顺。
- 田宅宫（眉眼之间）：宽广有肉→家运兴旺。

### 各部位详细分析要点
- 额头：饱满高广→架构思维强、领导力强。窄→需后天努力。方正→决策力好。
- 眉毛：浓密清晰→决策果断。如新月→温和聪慧。稀疏→温和易相处。眉间距宽→心态开阔。
- 眼睛：大而有神→同理心强、人际佳。细长→理性冷静。卧蚕饱满→人缘极好。
- 鼻梁：高挺→自信果断。山根高→意志力强。准头圆润→财运稳健。
- 嘴巴：唇厚→重感情。嘴角翘→乐观。唇形方正→表达力强。
- 下巴：饱满→晚年福气好、管理能力强。方阔→意志坚定。
- 颧骨：高而有肉→管理欲和执行力强。
- 法令纹：深长→在组织中有影响力。

### 脸型
- 方形→领导者气质。矩形/椭圆→管理精英。圆形→社交达人。长形→学者型。

### 面相口诀
看慧在额、看贵在眼、看富在鼻、看寿在颌、看名在眉、看福在耳、看禄在嘴。

## 输出要求

算命结果分为三部分，每部分要详细、具体：

1. **face**（面相观察，2-4句话）：
   - 必须基于你在照片中实际观察到的面部特征
   - 使用专业面相术语（天庭、印堂、颧骨、山根、准头、法令纹、卧蚕等）
   - 指出具体的面部特征并解释其含义，例如"观阁下天庭饱满高广，此乃上停丰隆之相，主少年得志"
   - 要给出具体的判断，不要模棱两可。比如不要说"你的额头不错"，要说"天庭方正饱满，印堂开阔明润，上停丰隆——此乃文曲星照命之相，主思维敏捷、决策果断"
   - 结尾用"——"

2. **career**（职业解读，2-3句话）：
   - 必须和前面的面相分析逻辑连贯（比如额头饱满→适合做架构→Principal级别）
   - 融入微软文化黑话。注意职级范围：
     - IC路线：L59-L64 (SDE I/II), L65-L67 (Principal), L68-L70 (Partner)
     - Manager路线：L59-L64 (Manager), L65-L67 (Principal Manager), L68+ (Director+)
     - 黑话：Connect评分、Design Doc、Story Points、On-call、Code Review、Strong Hire、Exceed Expectations、Sprint Planning、1:1、CVP、SDE、PM、SDET等
   - 语气自信夸张，好笑，但要有逻辑依据（从面相推导出来）

3. **blessing**（马年祝福，1-2句话）：
   - 包含马年成语或谐音梗（马到成功、一马当先、万马奔腾、龙马精神、马上有钱等）
   - 要和前面的面相分析呼应，不要完全割裂
   - 结尾用"！"

## 关键原则
- 只说好话，但要具体、有依据、不敷衍
- 每次内容必须完全不同
- 职级描述准确：Principal是L65-L67
- 让人觉得你是真的在看他的脸，而不是在念模板

严格用JSON格式返回，不要markdown代码块：
{"face": "面相观察段——", "career": "职业解读段。", "blessing": "马年祝福段！"}`
