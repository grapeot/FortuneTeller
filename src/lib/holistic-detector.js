/**
 * HolisticLandmarker initialization module.
 * Provides pose, hand, and face detection using MediaPipe HolisticLandmarker.
 */

import { HolisticLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

// ── Singleton HolisticLandmarker ───────────────────────────────────────────────

let holisticInstance = null
let holisticLoading = null

/**
 * Initialize HolisticLandmarker (cached singleton). Call early to preload.
 */
export async function initHolisticLandmarker() {
  if (holisticInstance) return holisticInstance
  if (holisticLoading) return holisticLoading

  holisticLoading = (async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
      )
      holisticInstance = await HolisticLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/1/holistic_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minPoseTrackingConfidence: 0.5,
        minHandLandmarkConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minHandTrackingConfidence: 0.5,
      })
      return holisticInstance
    } catch (err) {
      console.warn('HolisticLandmarker init failed:', err)
      holisticLoading = null
      return null
    }
  })()

  return holisticLoading
}

// Start preloading on import
initHolisticLandmarker()
