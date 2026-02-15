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

function pointsToPath(points, indices, close = false) {
  const valid = indices
    .map((idx) => points[idx])
    .filter(Boolean)
    .map(([x, y]) => `${x * 1000},${y * 1000}`)

  if (valid.length < 2) return ''
  const cmd = `M ${valid[0]} L ${valid.slice(1).join(' L ')}`
  return close ? `${cmd} Z` : cmd
}

export default function LandmarkVisualization({ visualizationData }) {
  const points = visualizationData?.landmarks
  const contours = visualizationData?.contour_indices || DEFAULT_CONTOURS
  const measurements = visualizationData?.measurements || null

  if (!points || points.length === 0) return null

  const formatValue = (value) => {
    if (Array.isArray(value)) {
      return value
        .map((v) => (typeof v === 'number' ? v.toFixed(3) : String(v)))
        .join(' / ')
    }
    if (typeof value === 'number') return value.toFixed(3)
    return String(value)
  }

  const measurementRows = measurements
    ? Object.entries(measurements)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => ({
          key,
          label: MEASUREMENT_LABELS[key] || key,
          value: formatValue(value),
        }))
    : []

  return (
    <div className="w-full rounded-xl border border-yellow-400/20 bg-gradient-to-b from-[#101526] to-[#161b2c] p-3">
      <svg viewBox="0 0 1000 1000" className="w-full h-auto">
        {Object.entries(contours).map(([name, indices]) => {
          const close = name.includes('eye') || name.includes('oval')
          const d = pointsToPath(points, indices, close)
          if (!d) return null
          return (
            <path
              key={name}
              d={d}
              fill="none"
              stroke="rgba(255,215,0,0.78)"
              strokeWidth={name.includes('face_oval') || name.includes('brow') ? 2.2 : 1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )
        })}
      </svg>
      <p className="text-xs text-yellow-300/60 text-center mt-1 font-serif-cn">隐私轮廓图（HTML/SVG 渲染）</p>
      {measurementRows.length > 0 && (
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
