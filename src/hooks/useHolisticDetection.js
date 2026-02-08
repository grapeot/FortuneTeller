import { useRef, useEffect } from 'react'
import { initHolisticLandmarker } from '../lib/holistic-detector'
import { drawHolisticSkeletons } from '../lib/skeleton-drawer'

/**
 * Hook that uses HolisticLandmarker to detect and visualize pose + hand skeletons.
 * This is for visualization only and does not affect the face detection algorithm.
 *
 * @param {React.RefObject<HTMLVideoElement>} videoRef
 * @param {React.RefObject<HTMLCanvasElement>} canvasRef
 * @param {object} options
 * @param {boolean} [options.enabled=true] - Whether detection is active
 * @returns {{ isReady: boolean }}
 */
export function useHolisticDetection(videoRef, canvasRef, options = {}) {
  const { enabled = true } = options

  const landmarkerRef = useRef(null)
  const animFrameRef = useRef(null)
  const latestResultRef = useRef(null)
  const drawSkeletonsRef = useRef(null)

  // Draw skeletons function that will be called from useFaceDetection
  // Use ref instead of useCallback to avoid hook order issues
  drawSkeletonsRef.current = (ctx, width, height) => {
    const result = latestResultRef.current
    if (!result) {
      return
    }

    // Flip horizontally because video is mirrored but canvas is not
    ctx.save()
    ctx.scale(-1, 1)
    ctx.translate(-width, 0)

    // Draw skeletons (will be drawn on top of face detection boxes)
    drawHolisticSkeletons(ctx, result, width, height)

    ctx.restore()
  }

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    async function init() {
      try {
        // Initialize HolisticLandmarker
        const landmarker = await initHolisticLandmarker()
        if (cancelled || !landmarker) {
          console.warn('HolisticLandmarker not available')
          return
        }

        landmarkerRef.current = landmarker
        console.log('HolisticLandmarker initialized')

        // Start detection loop
        detectLoop()
      } catch (err) {
        console.error('Holistic detection init error:', err)
      }
    }

    function detectLoop() {
      if (cancelled || !landmarkerRef.current || !videoRef.current) return

      try {
        const video = videoRef.current
        if (video.readyState >= 2) {
          const result = landmarkerRef.current.detectForVideo(video, performance.now())
          if (result) {
            latestResultRef.current = result
            // Debug: log detection results occasionally
            if (Math.random() < 0.01) { // Log 1% of frames
              const poseLm = result.poseLandmarks
              const leftLm = result.leftHandLandmarks
              const rightLm = result.rightHandLandmarks
              
              // Check if poseLandmarks is array of arrays
              const poseCount = Array.isArray(poseLm) 
                ? (Array.isArray(poseLm[0]) ? poseLm[0].length : poseLm.length)
                : 0
              
              console.log('Holistic detection result:', {
                poseArrayLength: Array.isArray(poseLm) ? poseLm.length : 0,
                poseLandmarkCount: poseCount,
                leftHand: Array.isArray(leftLm) ? leftLm.length : 0,
                rightHand: Array.isArray(rightLm) ? rightLm.length : 0,
                poseSample: poseLm?.[0],
                poseFirstLandmark: Array.isArray(poseLm?.[0]) ? poseLm[0][0] : poseLm?.[0],
              })
            }
          }
        }
      } catch (err) {
        console.warn('Holistic detection error:', err)
      }

      animFrameRef.current = requestAnimationFrame(detectLoop)
    }

    // Register draw function globally so useFaceDetection can call it
    window.__drawHolisticSkeletons = drawSkeletonsRef.current
    
    // Debug: log when initialized
    console.log('useHolisticDetection: initialized, draw function registered')

    init()

    return () => {
      cancelled = true
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
      // Clean up global function
      if (window.__drawHolisticSkeletons === drawSkeletonsRef.current) {
        delete window.__drawHolisticSkeletons
      }
    }
  }, [enabled, videoRef, canvasRef])

  return { isReady: !!landmarkerRef.current }
}
