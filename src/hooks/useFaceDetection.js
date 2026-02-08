import { useRef, useEffect, useState, useCallback } from 'react'
import { FilesetResolver, FaceDetector } from '@mediapipe/tasks-vision'

/**
 * Hook that sets up a webcam feed and runs MediaPipe Face Detection in real-time.
 *
 * @param {React.RefObject<HTMLVideoElement>} videoRef
 * @param {React.RefObject<HTMLCanvasElement>} canvasRef
 * @param {object} options
 * @param {boolean} [options.enabled=true] - Whether detection is active
 * @param {string} [options.boxColor='#facc15'] - Detection box color (Tailwind yellow-400)
 * @param {number} [options.lineWidth=3] - Detection box line width
 * @returns {{ isReady: boolean, isDetecting: boolean, faceCount: number, error: string|null }}
 */
export function useFaceDetection(videoRef, canvasRef, options = {}) {
  const { enabled = true, boxColor = '#facc15', lineWidth = 3 } = options

  const detectorRef = useRef(null)
  const animFrameRef = useRef(null)
  const [isReady, setIsReady] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [faceCount, setFaceCount] = useState(0)
  const [error, setError] = useState(null)

  // Draw detection boxes on the canvas
  const drawDetections = useCallback(
    (detections) => {
      const canvas = canvasRef.current
      const video = videoRef.current
      if (!canvas || !video) return

      // Match canvas size to video
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        console.warn('Canvas 2d context not available')
        return
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Flip horizontally because video is mirrored but canvas is not
      ctx.save()
      ctx.scale(-1, 1)
      ctx.translate(-canvas.width, 0)

      for (const det of detections) {
        const box = det.boundingBox
        if (!box) continue

        ctx.strokeStyle = boxColor
        ctx.lineWidth = lineWidth
        ctx.strokeRect(box.originX, box.originY, box.width, box.height)

        // Draw confidence score (text needs to be flipped back)
        const score = Math.round((det.categories?.[0]?.score ?? 0) * 100)
        ctx.save()
        ctx.scale(-1, 1)
        ctx.translate(-box.originX - box.width, box.originY)
        ctx.fillStyle = boxColor
        ctx.font = '16px monospace'
        ctx.fillText(`${score}%`, 0, -6)
        ctx.restore()
      }

      ctx.restore()

      // Draw holistic skeletons after face detection boxes
      // This ensures skeletons are drawn on top and not cleared
      if (window.__drawHolisticSkeletons) {
        window.__drawHolisticSkeletons(ctx, canvas.width, canvas.height)
      }
    },
    [canvasRef, videoRef, boxColor, lineWidth]
  )

  useEffect(() => {
    // Clear error state when disabling or re-enabling
    if (!enabled) {
      setError(null)
      setIsReady(false)
      setIsDetecting(false)
      return
    }

    let cancelled = false

    async function init() {
      try {
        // Load MediaPipe Vision WASM
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
        )
        if (cancelled) return

        // Create face detector
        detectorRef.current = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.5,
        })
        if (cancelled) return

        // Start webcam
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        const video = videoRef.current
        if (!video) return

        video.srcObject = stream
        await video.play()

        setIsReady(true)
        setIsDetecting(true)
        detectLoop()
      } catch (err) {
        console.error('Face detection init error:', err)
        setError(err.message || 'Failed to initialize face detection')
      }
    }

    function detectLoop() {
      if (cancelled || !detectorRef.current || !videoRef.current) return

      try {
        const video = videoRef.current
        if (video.readyState >= 2) {
          const result = detectorRef.current.detectForVideo(video, performance.now())
          const detections = result.detections || []
          setFaceCount(detections.length)
          drawDetections(detections)
        }
      } catch (err) {
        // Silently handle per-frame errors (e.g., video not ready)
      }

      animFrameRef.current = requestAnimationFrame(detectLoop)
    }

    init()

    return () => {
      cancelled = true
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop())
      }
      if (detectorRef.current) {
        detectorRef.current.close()
        detectorRef.current = null
      }
      setIsDetecting(false)
    }
  }, [enabled, videoRef, canvasRef, drawDetections])

  return { isReady, isDetecting, faceCount, error }
}
