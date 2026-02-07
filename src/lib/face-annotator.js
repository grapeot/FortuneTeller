/**
 * Face annotation module.
 *
 * Uses MediaPipe FaceLandmarker (478 landmarks) to:
 * 1. Detect facial landmarks from a video frame
 * 2. Draw face-reading annotations (三停 divisions, 十二宫位 labels, key feature markers)
 * 3. Calculate facial measurements (三停 ratios, face shape, etc.)
 *
 * The annotated image is shown to the user AND sent to the AI for more informed analysis.
 */

import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

// ── Singleton FaceLandmarker ──────────────────────────────────────────────

let landmarkerInstance = null
let landmarkerLoading = null

/**
 * Initialize FaceLandmarker (cached singleton). Call early to preload.
 */
export async function initLandmarker() {
  if (landmarkerInstance) return landmarkerInstance
  if (landmarkerLoading) return landmarkerLoading

  landmarkerLoading = (async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
      )
      landmarkerInstance = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'IMAGE',
        numFaces: 1,
      })
      return landmarkerInstance
    } catch (err) {
      console.warn('FaceLandmarker init failed:', err)
      landmarkerLoading = null
      return null
    }
  })()

  return landmarkerLoading
}

// Start preloading on import
initLandmarker()

// ── Key MediaPipe landmark indices ────────────────────────────────────────

const LM = {
  foreheadTop: 10,        // 天庭 top
  foreheadMid: 151,       // 官禄宫
  glabella: 9,            // 印堂 (between eyebrows)
  noseBridgeTop: 6,       // 山根
  noseTip: 1,             // 准头
  noseBottom: 2,          // 鼻底
  leftNoseWing: 48,       // 左鼻翼
  rightNoseWing: 278,     // 右鼻翼
  leftEyeOuter: 33,       // 左夫妻宫
  leftEyeInner: 133,
  rightEyeOuter: 362,     // 右夫妻宫
  rightEyeInner: 263,
  leftEyeTop: 159,
  leftEyeBottom: 145,
  rightEyeTop: 386,
  rightEyeBottom: 374,
  leftBrowInner: 70,      // 左眉头
  leftBrowOuter: 107,     // 左眉尾
  leftBrowPeak: 105,      // 左眉峰
  rightBrowInner: 300,    // 右眉头
  rightBrowOuter: 336,    // 右眉尾
  rightBrowPeak: 334,     // 右眉峰
  upperLip: 13,
  lowerLip: 14,
  lipTop: 0,              // 人中底部
  lipBottom: 17,
  chin: 152,              // 地阁
  leftCheekbone: 234,     // 左颧骨
  rightCheekbone: 454,    // 右颧骨
  leftJaw: 172,           // 左腮骨
  rightJaw: 397,          // 右腮骨
  leftTemple: 54,         // 左太阳穴
  rightTemple: 284,       // 右太阳穴
  philtrum: 164,          // 人中
}

// ── Main export ───────────────────────────────────────────────────────────

/**
 * Capture a face from video, detect landmarks, create annotated image + measurements.
 *
 * @param {HTMLVideoElement} videoEl
 * @param {object} [options]
 * @param {number} [options.maxWidth=640]
 * @param {number} [options.quality=0.85]
 * @returns {Promise<{originalDataUrl, annotatedDataUrl, measurements}|null>}
 */
export async function captureAndAnnotate(videoEl, options = {}) {
  const { maxWidth = 640, quality = 0.85 } = options

  if (!videoEl || videoEl.readyState < 2) return null

  const vw = videoEl.videoWidth
  const vh = videoEl.videoHeight
  if (!vw || !vh) return null

  const scale = Math.min(1, maxWidth / vw)
  const cw = Math.round(vw * scale)
  const ch = Math.round(vh * scale)

  // Capture raw frame
  const rawCanvas = document.createElement('canvas')
  rawCanvas.width = cw
  rawCanvas.height = ch
  const rawCtx = rawCanvas.getContext('2d')
  rawCtx.drawImage(videoEl, 0, 0, cw, ch)

  const originalDataUrl = rawCanvas.toDataURL('image/jpeg', quality)

  // Detect landmarks
  let landmarks = null
  try {
    const landmarker = await initLandmarker()
    if (landmarker) {
      const result = landmarker.detect(rawCanvas)
      if (result.faceLandmarks?.length > 0) {
        landmarks = result.faceLandmarks[0]
      }
    }
  } catch (err) {
    console.warn('Landmark detection failed:', err)
  }

  // Create annotated image + measurements
  let annotatedDataUrl = null
  let measurements = null

  if (landmarks) {
    const annotatedCanvas = drawAnnotations(rawCanvas, landmarks, cw, ch)
    annotatedDataUrl = annotatedCanvas.toDataURL('image/jpeg', quality)
    measurements = calculateMeasurements(landmarks, cw, ch)
  }

  return { originalDataUrl, annotatedDataUrl, measurements }
}

// ── Face wireframe landmark sequences ─────────────────────────────────────

const FACE_OVAL = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109]
const LEFT_EYE = [33,160,159,158,157,173,133,155,154,153,145,144,163,7]
const RIGHT_EYE = [362,385,386,387,388,466,263,249,390,373,374,380,381,382]
const LEFT_BROW = [70,63,105,66,107]
const RIGHT_BROW = [300,293,334,296,336]
const UPPER_LIP = [61,185,40,39,37,0,267,269,270,409,291]
const LOWER_LIP = [61,146,91,181,84,17,314,405,321,375,291]
const NOSE_BRIDGE = [6,197,195,5,4,1]
const NOSE_BOTTOM = [48,4,278]

// ── Annotation drawing ────────────────────────────────────────────────────

const GOLD = '#ffd700'
const GOLD_DIM = 'rgba(255, 215, 0, 0.5)'
const LABEL_BG = 'rgba(0, 0, 0, 0.65)'

/**
 * Draw face-reading annotations on a privacy-safe dark background.
 * Only a wireframe silhouette of the face is shown – no real face pixels.
 */
function drawAnnotations(sourceCanvas, landmarks, w, h) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  // Dark gradient background instead of real face
  const grad = ctx.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, '#0f0f23')
  grad.addColorStop(1, '#1a1a2e')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  // Draw face wireframe
  const px = (idx) => ({ x: landmarks[idx].x * w, y: landmarks[idx].y * h })
  const mapPx = (arr) => arr.map(i => px(i))

  ctx.strokeStyle = 'rgba(255, 215, 0, 0.25)'
  ctx.lineWidth = 1.2
  drawPath(ctx, mapPx(FACE_OVAL), true)

  ctx.lineWidth = 0.8
  drawPath(ctx, mapPx(LEFT_EYE), true)
  drawPath(ctx, mapPx(RIGHT_EYE), true)
  drawPath(ctx, mapPx(LEFT_BROW))
  drawPath(ctx, mapPx(RIGHT_BROW))
  drawPath(ctx, mapPx(NOSE_BRIDGE))
  drawPath(ctx, mapPx(NOSE_BOTTOM))
  drawPath(ctx, mapPx(UPPER_LIP))
  drawPath(ctx, mapPx(LOWER_LIP))

  // Key points (reuse px helper from wireframe above)
  const browY = (px(LM.leftBrowPeak).y + px(LM.rightBrowPeak).y) / 2
  const noseBottomY = px(LM.noseBottom).y
  const chinY = px(LM.chin).y
  const foreheadY = px(LM.foreheadTop).y

  // ── 三停 division lines ──
  ctx.setLineDash([6, 4])
  ctx.strokeStyle = GOLD_DIM
  ctx.lineWidth = 1

  // Upper/Middle boundary (eyebrow line)
  drawHLine(ctx, w * 0.08, w * 0.92, browY)
  // Middle/Lower boundary (nose bottom)
  drawHLine(ctx, w * 0.08, w * 0.92, noseBottomY)

  ctx.setLineDash([])

  // 三停 labels on far right
  const upperH = browY - foreheadY
  const middleH = noseBottomY - browY
  const lowerH = chinY - noseBottomY
  const totalH = upperH + middleH + lowerH
  const upperPct = Math.round((upperH / totalH) * 100)
  const middlePct = Math.round((middleH / totalH) * 100)
  const lowerPct = 100 - upperPct - middlePct

  const fontSize = Math.max(11, Math.round(w * 0.02))
  ctx.font = `bold ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`

  drawBadge(ctx, `上停 ${upperPct}%`, w - 8, (foreheadY + browY) / 2, 'right', fontSize)
  drawBadge(ctx, `中停 ${middlePct}%`, w - 8, (browY + noseBottomY) / 2, 'right', fontSize)
  drawBadge(ctx, `下停 ${lowerPct}%`, w - 8, (noseBottomY + chinY) / 2, 'right', fontSize)

  // ── Feature markers with labels ──
  // Format: [name, landmark point, label side ('left'|'right'), y-offset for label stacking]
  const features = [
    // Left column
    { name: '天庭', pt: px(LM.foreheadTop), side: 'left', yShift: 12 },
    { name: '官禄宫', pt: px(LM.foreheadMid), side: 'left', yShift: 0 },
    { name: '印堂', pt: px(LM.glabella), side: 'left', yShift: 0 },
    { name: '田宅宫', pt: midpoint(px(LM.leftBrowInner), px(LM.leftEyeInner)), side: 'left', yShift: 0 },
    { name: '颧骨', pt: px(LM.leftCheekbone), side: 'left', yShift: 0 },
    { name: '法令', pt: { x: px(LM.leftNoseWing).x - 4, y: (px(LM.leftNoseWing).y + px(LM.lipTop).y * 2) / 3 }, side: 'left', yShift: 0 },
    // Right column
    { name: '山根', pt: px(LM.noseBridgeTop), side: 'right', yShift: 0 },
    { name: '夫妻宫', pt: px(LM.rightEyeOuter), side: 'right', yShift: 0 },
    { name: '准头', pt: px(LM.noseTip), side: 'right', yShift: 0 },
    { name: '鼻翼', pt: px(LM.rightNoseWing), side: 'right', yShift: 0 },
    // Bottom center
    { name: '人中', pt: px(LM.philtrum), side: 'center', yShift: 0 },
    { name: '地阁', pt: px(LM.chin), side: 'center', yShift: 10 },
  ]

  const labelMargin = w * 0.04
  const labelFontSize = Math.max(10, Math.round(w * 0.018))
  ctx.font = `${labelFontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`

  for (const f of features) {
    // Draw marker dot
    drawDot(ctx, f.pt.x, f.pt.y, 3)

    // Calculate label position
    let labelX, labelY, align
    if (f.side === 'left') {
      labelX = labelMargin
      labelY = f.pt.y + f.yShift
      align = 'left'
    } else if (f.side === 'right') {
      labelX = w - labelMargin
      labelY = f.pt.y + f.yShift
      align = 'right'
    } else {
      labelX = f.pt.x
      labelY = f.pt.y + 16 + f.yShift
      align = 'center'
    }

    // Draw connecting line
    ctx.strokeStyle = GOLD_DIM
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(f.pt.x, f.pt.y)
    if (f.side === 'center') {
      ctx.lineTo(labelX, labelY - 4)
    } else {
      ctx.lineTo(labelX + (align === 'left' ? ctx.measureText(f.name).width + 6 : -ctx.measureText(f.name).width - 6), labelY - labelFontSize * 0.3)
    }
    ctx.stroke()

    // Draw label with background
    drawLabel(ctx, f.name, labelX, labelY, align, labelFontSize)
  }

  return canvas
}

// ── Drawing helpers ───────────────────────────────────────────────────────

function drawPath(ctx, points, close = false) {
  if (points.length < 2) return
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y)
  }
  if (close) ctx.closePath()
  ctx.stroke()
}

function drawHLine(ctx, x1, x2, y) {
  ctx.beginPath()
  ctx.moveTo(x1, y)
  ctx.lineTo(x2, y)
  ctx.stroke()
}

function drawDot(ctx, x, y, r) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = GOLD
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'
  ctx.lineWidth = 0.5
  ctx.stroke()
}

function drawLabel(ctx, text, x, y, align, fontSize) {
  ctx.font = `${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`
  const metrics = ctx.measureText(text)
  const tw = metrics.width
  const th = fontSize
  const pad = 3

  let lx = x
  if (align === 'right') lx = x - tw
  else if (align === 'center') lx = x - tw / 2

  // Background
  ctx.fillStyle = LABEL_BG
  ctx.fillRect(lx - pad, y - th + 1, tw + pad * 2, th + pad)

  // Text
  ctx.fillStyle = GOLD
  ctx.textBaseline = 'bottom'
  ctx.textAlign = 'left'
  ctx.fillText(text, lx, y + 2)
}

function drawBadge(ctx, text, x, y, align, fontSize) {
  ctx.font = `bold ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`
  const metrics = ctx.measureText(text)
  const tw = metrics.width
  const th = fontSize
  const pad = 4

  let lx = x
  if (align === 'right') lx = x - tw
  else if (align === 'center') lx = x - tw / 2

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
  ctx.fillRect(lx - pad, y - th / 2 - pad, tw + pad * 2, th + pad * 2)

  ctx.fillStyle = GOLD
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillText(text, lx, y)
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

// ── Measurements calculation ──────────────────────────────────────────────

/**
 * Calculate facial measurements useful for AI analysis.
 */
function calculateMeasurements(landmarks, w, h) {
  const px = (idx) => ({
    x: landmarks[idx].x * w,
    y: landmarks[idx].y * h,
  })

  const dist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)

  // 三停
  const foreheadY = px(LM.foreheadTop).y
  const browY = (px(LM.leftBrowPeak).y + px(LM.rightBrowPeak).y) / 2
  const noseBottomY = px(LM.noseBottom).y
  const chinY = px(LM.chin).y

  const upper = browY - foreheadY
  const middle = noseBottomY - browY
  const lower = chinY - noseBottomY
  const total = upper + middle + lower

  // Face width at different levels
  const templeWidth = dist(px(LM.leftTemple), px(LM.rightTemple))
  const cheekWidth = dist(px(LM.leftCheekbone), px(LM.rightCheekbone))
  const jawWidth = dist(px(LM.leftJaw), px(LM.rightJaw))
  const faceHeight = chinY - foreheadY

  // Eye measurements
  const eyeSpacing = dist(px(LM.leftEyeInner), px(LM.rightEyeInner))
  const leftEyeWidth = dist(px(LM.leftEyeOuter), px(LM.leftEyeInner))
  const rightEyeWidth = dist(px(LM.rightEyeOuter), px(LM.rightEyeInner))

  // Eyebrow-eye distance (田宅宫)
  const leftTianZhai = px(LM.leftEyeTop).y - px(LM.leftBrowPeak).y
  const rightTianZhai = px(LM.rightEyeTop).y - px(LM.rightBrowPeak).y

  // Nose measurements
  const noseLength = dist(px(LM.noseBridgeTop), px(LM.noseTip))
  const noseWidth = dist(px(LM.leftNoseWing), px(LM.rightNoseWing))

  // 印堂 width (between eyebrow inner points)
  const yintangWidth = dist(px(LM.leftBrowInner), px(LM.rightBrowInner))

  // Face shape classification
  const widthRatio = cheekWidth / faceHeight
  let faceShape = '椭圆形'
  if (widthRatio > 0.85) faceShape = '方形'
  else if (widthRatio > 0.75) faceShape = '圆形'
  else if (widthRatio < 0.6) faceShape = '长形'
  if (jawWidth > cheekWidth * 0.95 && widthRatio > 0.75) faceShape = '方形'
  if (cheekWidth > templeWidth * 1.1 && cheekWidth > jawWidth * 1.1) faceShape = '菱形'
  if (templeWidth > jawWidth * 1.15) faceShape = '心形'

  return {
    三停比例: {
      上停: Math.round((upper / total) * 100),
      中停: Math.round((middle / total) * 100),
      下停: 100 - Math.round((upper / total) * 100) - Math.round((middle / total) * 100),
    },
    脸型: faceShape,
    面部宽高比: Math.round(widthRatio * 100) / 100,
    印堂宽度: yintangWidth > eyeSpacing * 0.7 ? '开阔' : yintangWidth > eyeSpacing * 0.5 ? '适中' : '较窄',
    田宅宫: (leftTianZhai + rightTianZhai) / 2 > leftEyeWidth * 0.4 ? '宽广' : '较窄',
    颧骨: cheekWidth > jawWidth * 1.08 ? '突出' : '平和',
    鼻翼宽度: noseWidth > eyeSpacing * 0.85 ? '饱满' : '适中',
    下巴: jawWidth > cheekWidth * 0.85 ? '方阔' : jawWidth > cheekWidth * 0.7 ? '适中' : '尖窄',
  }
}

/**
 * Format measurements as a concise text block for inclusion in AI prompt.
 */
export function formatMeasurements(m) {
  if (!m) return ''
  return [
    `【面部测量数据】`,
    `三停比例：上停${m.三停比例.上停}% / 中停${m.三停比例.中停}% / 下停${m.三停比例.下停}%`,
    `脸型：${m.脸型}`,
    `面部宽高比：${m.面部宽高比}`,
    `印堂：${m.印堂宽度}`,
    `田宅宫：${m.田宅宫}`,
    `颧骨：${m.颧骨}`,
    `鼻翼：${m.鼻翼宽度}`,
    `下巴/腮骨：${m.下巴}`,
  ].join('\n')
}
