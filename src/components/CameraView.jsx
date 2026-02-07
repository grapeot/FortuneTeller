import { forwardRef } from 'react'

/**
 * CameraView renders a video + canvas overlay for face detection.
 * The video is mirrored (selfie mode) and the canvas overlays detection boxes.
 */
const CameraView = forwardRef(function CameraView({ videoRef, canvasRef }, ref) {
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      {/* Video: mirrored for user comfort (selfie mode) */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover mirror"
        autoPlay
        playsInline
        muted
      />
      {/* Canvas: NOT mirrored, so detection boxes and text render correctly */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  )
})

export default CameraView
