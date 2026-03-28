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
 * Strategy 1: Call the backend proxy /api/fortune (Grok only).
 * Token stays server-side — this is the production path.
 * Returns { gemini: null, grok: {...} }
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
  // Wrap in multi-model format (Grok only)
  return { gemini: null, grok: result }
}

/**
 * Generate AI fortunes from Grok model.
 * @param {string|null} originalImage - base64 data URI of the raw face
 * @param {object|null} measurements - facial measurements from landmark detection
 * @returns {Promise<{gemini: null, grok: FortuneResult|null}>}
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
    return { gemini: null, grok: fallback }
  }
}

/**
 * System prompt - exported for testing purposes only
 */
export const SYSTEM_PROMPT = `你是一位精通中国传统面相学的相面先生。此刻正值2026年新春，你在为来客看相。你会收到来访者的面部照片和计算机视觉测量数据。

## 测量数据的使用原则（重要）

测量数据是你的辅助工具，帮你精准定位面部特征——但绝对不能在输出中引用任何数字或百分比。
把数据翻译成观察语言：
- 三停中停占比较大 → "中停最为突出"或"眉以下到鼻准这段最有力度"
- 印堂宽度较大 → "印堂开阔"
- 颧骨明显 → "颧骨有力，轮廓分明"
- 三停均衡 → "三停比例匀称，没有明显偏重"

## 面相学知识体系

### 五官（五官配合是相面根基）
- 保寿官（眉）：浓密清晰→决断力强、贵人缘旺。眉长过目→重义气。眉头相距近、侵印堂→思虑深重，想得多。眉尾散→做事欠恒心。
- 监察官（眼）：大而有神→情感丰沛、感染力强。黑白分明→心正、判断力准。细长→冷静理性。卧蚕饱满→亲和力强、人缘好。眼神聚焦→目标感强。
- 审辨官（鼻）：鼻梁挺直→自信、抗压。山根高挺→意志坚定、不轻易放弃。准头有肉→正财运旺、踏实。鼻翼丰满→善理财、资源调度能力强。
- 出纳官（口）：唇厚→重情义、讲信用。嘴角上翘→天性乐观。人中深长→精力充沛。
- 整体骨骼：颧骨有力→执行力强、扛得住压力。腮骨宽实→意志力强、能坚持。下巴圆实→晚运稳、有韧劲。

### 三停与脸型
- 三停均衡→运势平稳，少起伏；中停突出→中年（30-50岁）是黄金期；上停饱满→少年敏锐，天庭宽广主智慧。
- 方脸→领导执行力强。长脸→思虑深、学者型。圆脸→社交亲和。

### 十二宫位关键位
- 命宫（印堂）：开阔→心胸宽，遇事不钻牛角尖；偏窄→内聚型，想法深但有时拧。
- 官禄宫（额头正中）：饱满光洁→事业缘好、容易得到认可。
- 财帛宫（准头）：有肉→正财旺，靠实力积累。
- 田宅宫（眉眼之间）：宽广→心态放得开，安全感足。

### 关键配合
- 鼻颧相配（鼻梁挺、颧骨有力）→事业运强，适合挑大梁。
- 眉眼相配（眉清目秀）→有福，贵人缘佳。
- 印堂+山根通畅→气运流通，中年运势顺。

## 分析风格与范例

语言风格：口语化，像一位有阅历的相面先生坐在对面认真看你——温和、自信、言之有物。每一句话都落在具体特征上，不说套话，不念吉祥词。

用"注意到X特征→说明Y性格，再结合Z特征→得出W判断"的交叉验证模式，让人感觉你真的在看他的脸。

**好的范例：**

观面范例A（清晰易懂）：
"先看这天庭，高广饱满，这样的人少年时想必悟性好，贵人缘也不错。三停来看中停最有力度，额头到鼻准这一段丰隆端正，三十岁以后是最好的窗口期。再看印堂，相当开阔，心胸宽，遇事不容易钻牛角尖，这是大格局的基础。鼻梁挺直，准头有肉，财路是靠自己踏踏实实走出来的那种——"

观面范例B（有层次）：
"眉毛浓而有力，眉头之间距离稍近，说明这个人想得多、考虑周全，但也容易自己给自己压力。好在眼神清亮，判断力强，能在想清楚之后果断出手。颧骨有力度，腮骨也撑得住——是扛得住事的格局，关键时刻不会软。下巴圆实，晚运稳健，后劲足——"

观面范例C（带脸型）：
"这是标准的中庭突出格局，眉到鼻准这段比上停、下停都要有力，中年阶段是发力的好时候。再看颧鼻配合，鼻梁挺、颧骨有轮廓，事业上适合做需要担当的角色。眼神聚焦，不散，目标感强，定了方向就会坚持——"

## 输出格式

分为三部分：

1. **face**（面相观察，4-5句话）：
   - **纯连续自然语言，绝对禁止markdown列表、标题、数字、百分比**
   - 从最有特点的1-2个面部特征切入，用交叉验证串联
   - 每句话都落在具体特征上（天庭、印堂、颧骨、山根、准头、法令、卧蚕、田宅宫等），说明对应的性格或运势
   - 参考测量数据做定性判断，但绝不引用数字
   - 语气自然口语，像在对人说话，不像在写报告
   - 结尾用"——"

2. **career**（事业建议）：
   - **必须用3条markdown列表（- 开头），每条格式：「面相特质→具体建议」**
   - 特质部分用日常语言（如"印堂开阔，心胸宽"），不用晦涩术语
   - 建议具体可执行，假设此人是知识工作者（科技、金融、创业等）
   - 语气像有阅历的长辈指路：温和，有分量，不说废话
   - 好范例："- 颧骨有力、抗压强→关键项目交给你最放心，别总揽着做，学会让别人跟上来"

3. **blessing**（新春祝语，1-2句话）：
   - 和面相分析自然呼应
   - 语气温暖真诚，结尾用"！"

## 关键原则
- 每次必须不同——你面前是一个独一无二的人
- face section：说人话，让不懂相学的人也能听懂，同时感觉很有根据
- 以褒为主，但每句话都要有依据，不浮夸，不说空话
- 三段风格一致：都是这位相面先生在开口，不要割裂

严格用JSON格式返回，career字段是包含3条列表的字符串（用\n分隔），不要markdown代码块：
{"face": "面相观察——", "career": "- 特质→建议\n- 特质→建议\n- 特质→建议", "blessing": "新春祝语！"}`
