const DEFAULT_CONTOURS = {
  face_oval: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109],
  left_brow: [70, 63, 105, 66, 107],
  right_brow: [300, 293, 334, 296, 336],
  left_eye: [33, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7],
  right_eye: [362, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382],
  nose_bridge: [6, 197, 195, 5, 4, 1],
  nose_wings: [48, 115, 220, 45, 4, 275, 440, 344, 278],
  upper_lip: [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291],
  lower_lip: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291],
  inner_upper_lip: [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308],
  inner_lower_lip: [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308],
  lip_seam: [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308],
}

const MEASUREMENT_LABELS = {
  three_parts: '三停比例',
  three_horizontal_sections: '横向三宽',
  tian_zhai_gong_height_eye_ratio: '田宅宫（眼宽倍数）',
  tian_zhai_gong_height_face_ratio: '田宅宫（脸高占比）',
  eye_to_eyebrow_avg: '眉眼平均距离',
  eye_to_eyebrow_left: '左眉眼距离',
  eye_to_eyebrow_right: '右眉眼距离',
}

const KEY_LM = {
  foreheadTop: 10,
  leftBrowPeak: 105,
  rightBrowPeak: 334,
  noseBottom: 2,
  chin: 152,
  leftBrowInner: 70,
  rightBrowInner: 300,
  leftNoseWing: 48,
  rightNoseWing: 278,
  leftEyeTop: 159,
  rightEyeTop: 386,
}

const ANNO_TEXT_SIZE = 28
const ANNO_STROKE = 2
const VIEW_PAD_X = 96
const VIEW_PAD_Y = 90
const LABEL_RIGHT_GAP = 120

function getPoint(points, idx) {
  const p = points[idx]
  if (!p) return null
  if (Array.isArray(p) && p.length >= 2) return [p[0], p[1]]
  if (typeof p === 'object' && p !== null && 'x' in p && 'y' in p) return [p.x, p.y]
  return null
}

function pointsToPath(points, indices, width, height, close = false) {
  const valid = indices
    .map((idx) => getPoint(points, idx))
    .filter(Boolean)
    .map(([x, y]) => `${x * width},${y * height}`)

  if (valid.length < 2) return ''
  const cmd = `M ${valid[0]} L ${valid.slice(1).join(' L ')}`
  return close ? `${cmd} Z` : cmd
}

function toCanvasPoint(points, idx, width, height) {
  const p = getPoint(points, idx)
  if (!p) return null
  return { x: p[0] * width, y: p[1] * height }
}

function readThreeParts(measurements) {
  const m = measurements || {}
  const cn = m['三停比例']
  if (cn && typeof cn === 'object') {
    return [cn['上庭'], cn['中庭'], cn['下庭']].map((v) => (typeof v === 'number' ? v : null))
  }
  if (Array.isArray(m.three_parts) && m.three_parts.length >= 3) {
    return m.three_parts.slice(0, 3).map((v) => (typeof v === 'number' ? Math.round(v * 100) : null))
  }
  return [null, null, null]
}

export function normalizeMeasurementRows(measurements) {
  const formatValue = (value) => {
    if (Array.isArray(value)) {
      return value
        .map((v) => formatValue(v))
        .join(' / ')
    }
    if (typeof value === 'number') return value.toFixed(3)
    if (typeof value === 'object' && value !== null) {
      return Object.entries(value)
        .map(([k, v]) => `${k}:${formatValue(v)}`)
        .join(' | ')
    }
    return String(value)
  }

  if (!measurements) return []
  return Object.entries(measurements)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => ({
      key,
      label: MEASUREMENT_LABELS[key] || key,
      value: formatValue(value),
    }))
}

export default function LandmarkVisualization({ visualizationData, showLabel = true, showMeasurements = true }) {
  const points = visualizationData?.landmarks
  const contours = visualizationData?.contour_indices || DEFAULT_CONTOURS
  const measurements = visualizationData?.measurements || null
  const aspectRatio = Number(visualizationData?.aspect_ratio) > 0 ? Number(visualizationData.aspect_ratio) : 1
  const svgHeight = 1000
  const svgWidth = Math.max(500, Math.round(svgHeight * aspectRatio))
  const viewLeft = -VIEW_PAD_X
  const viewTop = -VIEW_PAD_Y
  const viewWidth = svgWidth + VIEW_PAD_X * 2 + LABEL_RIGHT_GAP
  const viewHeight = svgHeight + VIEW_PAD_Y * 2

  if (!points || points.length === 0) return null

  const measurementRows = normalizeMeasurementRows(measurements)
  const [upperPct, middlePct, lowerPct] = readThreeParts(measurements)

  const forehead = toCanvasPoint(points, KEY_LM.foreheadTop, svgWidth, svgHeight)
  const leftBrowPeak = toCanvasPoint(points, KEY_LM.leftBrowPeak, svgWidth, svgHeight)
  const rightBrowPeak = toCanvasPoint(points, KEY_LM.rightBrowPeak, svgWidth, svgHeight)
  const browY = leftBrowPeak && rightBrowPeak ? (leftBrowPeak.y + rightBrowPeak.y) / 2 : null
  const noseBottom = toCanvasPoint(points, KEY_LM.noseBottom, svgWidth, svgHeight)
  const chin = toCanvasPoint(points, KEY_LM.chin, svgWidth, svgHeight)

  const leftBrowInner = toCanvasPoint(points, KEY_LM.leftBrowInner, svgWidth, svgHeight)
  const rightBrowInner = toCanvasPoint(points, KEY_LM.rightBrowInner, svgWidth, svgHeight)
  const leftNoseWing = toCanvasPoint(points, KEY_LM.leftNoseWing, svgWidth, svgHeight)
  const rightNoseWing = toCanvasPoint(points, KEY_LM.rightNoseWing, svgWidth, svgHeight)
  const leftEyeTop = toCanvasPoint(points, KEY_LM.leftEyeTop, svgWidth, svgHeight)
  const rightEyeTop = toCanvasPoint(points, KEY_LM.rightEyeTop, svgWidth, svgHeight)

  return (
    <div className="w-full rounded-xl border border-yellow-400/20 bg-gradient-to-b from-[#101526] to-[#161b2c] p-3">
      <svg viewBox={`${viewLeft} ${viewTop} ${viewWidth} ${viewHeight}`} className="w-full h-auto">
        <defs>
          <marker id="dim-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
            <path d="M 0 0 L 8 4 L 0 8 z" fill="rgba(255,215,0,0.85)" />
          </marker>
        </defs>

        {Object.entries(contours).map(([name, indices]) => {
          const close = name.includes('eye') || name.includes('oval')
          const d = pointsToPath(points, indices, svgWidth, svgHeight, close)
          if (!d) return null
          return (
            <path
              key={name}
              d={d}
              fill="none"
              stroke="rgba(255,215,0,0.78)"
              strokeWidth={name.includes('face_oval') || name.includes('brow') ? 2.2 : name.includes('lip_seam') ? 1.8 : 1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )
        })}

        {/* 三庭工程标注 */}
        {forehead && browY && noseBottom && chin && (
          <g>
            {[forehead.y, browY, noseBottom.y, chin.y].map((y, i) => (
              <line
                key={`guide-${i}`}
                x1={svgWidth * 0.08}
                x2={svgWidth * 0.92}
                y1={y}
                y2={y}
                stroke="rgba(255,215,0,0.35)"
                strokeWidth="1.3"
                strokeDasharray="8 6"
              />
            ))}

            {[
              { key: 'upper', y1: forehead.y, y2: browY, label: `上庭${upperPct !== null ? ` ${upperPct}%` : ''}` },
              { key: 'middle', y1: browY, y2: noseBottom.y, label: `中庭${middlePct !== null ? ` ${middlePct}%` : ''}` },
              { key: 'lower', y1: noseBottom.y, y2: chin.y, label: `下庭${lowerPct !== null ? ` ${lowerPct}%` : ''}` },
            ].map((seg) => (
              <g key={seg.key}>
                <line
                  x1={svgWidth + 36}
                  y1={seg.y1}
                  x2={svgWidth + 36}
                  y2={seg.y2}
                  stroke="rgba(255,215,0,0.9)"
                  strokeWidth={ANNO_STROKE}
                  markerStart="url(#dim-arrow)"
                  markerEnd="url(#dim-arrow)"
                />
                <text
                  x={svgWidth + 54}
                  y={(seg.y1 + seg.y2) / 2 + 6}
                  fill="rgba(255,215,0,0.95)"
                  fontSize={ANNO_TEXT_SIZE}
                >
                  {seg.label}
                </text>
              </g>
            ))}
          </g>
        )}

        {/* 印堂宽度 */}
        {leftBrowInner && rightBrowInner && (
          <g>
            <line
              x1={leftBrowInner.x}
              y1={Math.min(leftBrowInner.y, rightBrowInner.y) - 26}
              x2={rightBrowInner.x}
              y2={Math.min(leftBrowInner.y, rightBrowInner.y) - 26}
              stroke="rgba(255,215,0,0.85)"
              strokeWidth={ANNO_STROKE}
              markerStart="url(#dim-arrow)"
              markerEnd="url(#dim-arrow)"
            />
            <text
              x={(leftBrowInner.x + rightBrowInner.x) / 2 - 40}
              y={Math.min(leftBrowInner.y, rightBrowInner.y) - 34}
              fill="rgba(255,215,0,0.9)"
              fontSize={ANNO_TEXT_SIZE}
            >
              印堂
            </text>
          </g>
        )}

        {/* 鼻翼宽度 */}
        {leftNoseWing && rightNoseWing && (
          <g>
            <line
              x1={leftNoseWing.x}
              y1={Math.max(leftNoseWing.y, rightNoseWing.y) + 22}
              x2={rightNoseWing.x}
              y2={Math.max(leftNoseWing.y, rightNoseWing.y) + 22}
              stroke="rgba(255,215,0,0.85)"
              strokeWidth={ANNO_STROKE}
              markerStart="url(#dim-arrow)"
              markerEnd="url(#dim-arrow)"
            />
            <text
              x={(leftNoseWing.x + rightNoseWing.x) / 2 - 40}
              y={Math.max(leftNoseWing.y, rightNoseWing.y) + 44}
              fill="rgba(255,215,0,0.9)"
              fontSize={ANNO_TEXT_SIZE}
            >
              鼻翼
            </text>
          </g>
        )}

        {/* 田宅宫（眉眼间距） */}
        {leftBrowPeak && rightBrowPeak && leftEyeTop && rightEyeTop && (
          <g>
            <line
              x1={leftEyeTop.x - 18}
              y1={leftBrowPeak.y}
              x2={leftEyeTop.x - 18}
              y2={leftEyeTop.y}
              stroke="rgba(255,215,0,0.85)"
              strokeWidth={ANNO_STROKE}
              markerStart="url(#dim-arrow)"
              markerEnd="url(#dim-arrow)"
            />
            <line
              x1={rightEyeTop.x + 18}
              y1={rightBrowPeak.y}
              x2={rightEyeTop.x + 18}
              y2={rightEyeTop.y}
              stroke="rgba(255,215,0,0.85)"
              strokeWidth={ANNO_STROKE}
              markerStart="url(#dim-arrow)"
              markerEnd="url(#dim-arrow)"
            />
            <text
              x={rightEyeTop.x + 28}
              y={rightBrowPeak.y - 8}
              fill="rgba(255,215,0,0.9)"
              fontSize={ANNO_TEXT_SIZE}
            >
              田宅宫
            </text>
          </g>
        )}
      </svg>
      {showLabel && <p className="text-xs text-yellow-300/60 text-center mt-1 font-serif-cn">面相特征检测结果</p>}
      {showMeasurements && measurementRows.length > 0 && (
        <div className="mt-3 rounded-lg border border-yellow-400/15 bg-black/25 px-2 py-2">
          <p className="text-[11px] text-yellow-300/70 font-serif-cn mb-1">测量结果</p>
          <div className="space-y-1">
            {measurementRows.map((row) => (
              <div key={row.key} className="flex items-start justify-between gap-2 text-[11px] leading-4">
                <span className="text-yellow-100/70 font-serif-cn">{row.label}</span>
                <span className="text-yellow-200/85 font-mono text-right">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
