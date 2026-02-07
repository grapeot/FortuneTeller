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
 * Strategy 1: Call the backend proxy /api/fortune.
 * Token stays server-side — this is the production path.
 * Sends the face images (original + annotated) and measurements for multimodal analysis.
 */
async function callBackendProxy(signal, originalImage, annotatedImage, measurements) {
  const body = {}
  if (originalImage) body.image = originalImage
  if (annotatedImage) body.annotated_image = annotatedImage
  if (measurements) body.measurements = formatMeasurements(measurements)

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
async function callDirectAPI(signal, originalImage, annotatedImage, measurements) {
  if (!AI_CONFIG.apiToken) {
    throw new Error('No VITE_AI_API_TOKEN for direct call')
  }

  // Build user message content - multimodal if images available
  const userContent = []
  if (originalImage) {
    userContent.push({
      type: 'image_url',
      image_url: { url: originalImage },
    })
  }
  if (annotatedImage) {
    userContent.push({
      type: 'image_url',
      image_url: { url: annotatedImage },
    })
  }
  const measureText = measurements ? formatMeasurements(measurements) : ''
  if (originalImage) {
    userContent.push({
      type: 'text',
      text: `请仔细观察这位贵客的面相。第一张是原始照片，第二张是标注了面相学关键部位的参考图。${measureText ? '\n\n' + measureText : ''}\n\n请根据你的面相学知识和实际观察给出具体的论断。`,
    })
  } else {
    userContent.push({
      type: 'text',
      text: '请给这位贵客算一卦。（无法获取面部图像，请基于随机面相特征生成具体论断）',
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
 * @param {string|null} originalImage - base64 data URI of the raw face
 * @param {string|null} annotatedImage - base64 data URI of the annotated face
 * @param {object|null} measurements - facial measurements from landmark detection
 * @returns {Promise<{face: string, career: string, blessing: string, full: string, source: string}>}
 */
export async function generateAIFortune(originalImage = null, annotatedImage = null, measurements = null) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMING.aiTimeout)

  try {
    // Try backend proxy first (production path)
    try {
      const result = await callBackendProxy(controller.signal, originalImage, annotatedImage, measurements)
      clearTimeout(timeoutId)
      return result
    } catch (backendErr) {
      console.info('Backend proxy unavailable, trying direct API:', backendErr.message)
    }

    // Try direct API call (local dev path)
    try {
      const result = await callDirectAPI(controller.signal, originalImage, annotatedImage, measurements)
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
export const SYSTEM_PROMPT = `你是一位精通中国传统面相学的AI算命大师，在微软2026年春节庙会（马年）上给员工看面相算命。你会收到来访者的面部照片（原始照片+标注了面相关键部位的参考图），以及面部测量数据。请根据你实际观察到的面部特征，给出专业、具体、有趣的面相分析。

## 你的面相学知识体系

### 五官
- 采听官（耳）：轮廓分明、耳垂厚实→有福气、聪明。耳高与眉齐→聪明。贴面→内敛稳重。
- 保寿官（眉）：浓密清晰→决策果断、贵人缘好。眉长过目→兄弟友情深。眉毛入侵印堂→思虑重、纠结。眉尾散→做事缺毅力。
- 监察官（眼）：大而有神→情感充沛、善良。黑白分明→心思纯正。细长→理性冷静。眼神有力度→目标感强。眼窝凹陷→心思缜密但易内耗。卧蚕饱满→桃花旺、人缘好。
- 审辨官（鼻）：鼻梁高挺→自信果断。山根高→意志力强。准头有肉圆润→正财运好。鼻翼饱满→能聚财。鼻孔仰露→花钱大方。鼻梁有节→性格多疑。
- 出纳官（口）：唇厚→重感情。嘴角上翘→乐观。覆船口→爱抱怨。人中深长→身体健康、长寿。

### 三停
- 上停（发际→眉）：15-30岁运势。饱满高广→早年顺遂、智慧高。发际线不平整→14-24岁波折。
- 中停（眉→鼻准头）：31-50岁运势。丰隆端峻→事业有成。鼻颧得配→适合搞事业。
- 下停（鼻下→下巴）：51岁后运势。圆实丰厚→晚年安乐。下巴短或后缩→晚年运势弱。

### 十二宫位
- 命宫（印堂）：宽阔饱满→积极乐观。窄或有纹→执着、放不下心。
- 财帛宫（准头）：有肉丰隆→正财运旺。
- 官禄宫（额头正中）：光洁饱满→事业运佳。
- 夫妻宫（眼尾）：平满→感情和顺。凹陷→亲密关系易争吵。
- 田宅宫（眉眼之间）：宽广→家运兴旺、放得开手脚。塌陷→精神内耗。
- 兄弟宫（眉毛）：浓而聚→贵人缘好。
- 奴仆宫（面颊下端）：饱满→下属服从、交友好。不饱满→下属不听使唤。

### 关键配合关系
- 鼻颧得配（鼻子和颧骨力度匹配）→ 事业运强
- 眉眼配合度好 → 有福气
- 骨肉均衡 → 运势平稳、性格不极端
- 三停均衡 → 人生运势平稳

### 脸型
- 方形（腮骨有力）→ 领导者、执行力强、抗压。圆形 → 社交达人。长形 → 学者型。菱形 → 独立有权力欲。

## 分析风格范例

以下是高质量面相分析的范例风格（注意交叉验证、具体特征→具体判断的模式）：

- "首先注意到山根和鼻梁处有明显的断层，需要留意在40岁左右可能遇到坎坷，但过了这道坎之后，鼻相气势很强，到50岁的运势都会很好。"
- "鼻头有肉，财运旺盛，鼻翼也宽厚饱满，善于理财，能够积蓄。再看眉眼，眼神温柔有力且收敛，是很好的眼相。"
- "三停比例来看，强在中停，中年运势最强。鼻颧得配，适合搞事业。"
- "眉毛入侵印堂，甚至侵入田宅宫，思虑过重，容易想不开，钻牛角尖。建议把印堂的眉毛修一修。"
- "从颧骨、腮骨、下巴来看，力度都很足，能抗事儿的类型，性格上能稳得住。"
- "法令纹不显，感觉不适合做管理类工作。但鼻颧得配，事业上有追求有抱负。"

注意：
- 以"首先注意到..."开头
- 多用"结合...来看"进行交叉验证
- 每个判断要绑定到具体的面部特征上

## 输出要求

算命结果分为三部分，都要详细具体：

1. **face**（面相观察，3-5句话）：
   - 必须基于你在照片中实际观察到的面部特征
   - 使用专业面相术语（天庭、印堂、颧骨、山根、准头、法令纹、卧蚕、田宅宫、夫妻宫等）
   - 采用"首先注意到X→说明Y，结合Z来看→判断W"的交叉验证模式
   - 提及三停比例，并分析哪个阶段运势最强
   - 必须有至少2-3个具体面部特征的观察和分析
   - 结尾用"——"

2. **career**（职业解读，2-3句话）：
   - 必须从面相分析逻辑推导（如：颧骨有力+法令纹深→管理能力强→适合Manager路线）
   - 融入微软文化黑话：
     - IC路线：L59-L64 (SDE I/II), L65-L67 (Principal), L68-L70 (Partner)
     - Manager路线：L59-L64 (Manager), L65-L67 (Principal Manager), L68+ (Director+)
     - 黑话：Connect评分、Design Doc、Story Points、On-call、Code Review、Strong Hire、Exceed Expectations、Sprint Planning、1:1、CVP等
   - 语气自信夸张好笑，但要有逻辑依据

3. **blessing**（马年祝福，1-2句话）：
   - 包含马年成语或谐音梗（马到成功、一马当先、万马奔腾、龙马精神、马上有钱等）
   - 和前面面相分析呼应
   - 结尾用"！"

## 关键原则
- 只说好话，但要具体、有依据、不敷衍
- 每次内容必须完全不同
- 职级描述准确：Principal是L65-L67
- 要让人觉得你是真的在看他的脸并且真的懂面相学，而不是在念模板
- 如果收到了面部测量数据，要参考这些数据（三停比例、脸型、印堂宽度等）来支撑你的分析

严格用JSON格式返回，不要markdown代码块：
{"face": "面相观察段——", "career": "职业解读段。", "blessing": "马年祝福段！"}`
