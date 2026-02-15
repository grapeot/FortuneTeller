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

  if (!points || points.length === 0) return null

  return (
    <div className="w-full max-w-sm rounded-xl border border-yellow-400/20 bg-gradient-to-b from-[#101526] to-[#161b2c] p-3">
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
    </div>
  )
}
