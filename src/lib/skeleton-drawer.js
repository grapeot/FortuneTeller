/**
 * Skeleton drawing utilities for MediaPipe Holistic landmarks.
 * Draws pose and hand skeletons on canvas.
 */

// ── Pose Landmark Indices (33 landmarks) ────────────────────────────────────

const POSE_LANDMARKS = {
  NOSE: 0,
  RIGHT_EYE_INNER: 1,
  RIGHT_EYE: 2,
  RIGHT_EYE_OUTER: 3,
  LEFT_EYE_INNER: 4,
  LEFT_EYE: 5,
  LEFT_EYE_OUTER: 6,
  RIGHT_EAR: 7,
  LEFT_EAR: 8,
  MOUTH_RIGHT: 9,
  MOUTH_LEFT: 10,
  RIGHT_SHOULDER: 11,
  LEFT_SHOULDER: 12,
  RIGHT_ELBOW: 13,
  LEFT_ELBOW: 14,
  RIGHT_WRIST: 15,
  LEFT_WRIST: 16,
  RIGHT_PINKY: 17,
  LEFT_PINKY: 18,
  RIGHT_INDEX: 19,
  LEFT_INDEX: 20,
  RIGHT_THUMB: 21,
  LEFT_THUMB: 22,
  RIGHT_HIP: 23,
  LEFT_HIP: 24,
  RIGHT_KNEE: 25,
  LEFT_KNEE: 26,
  RIGHT_ANKLE: 27,
  LEFT_ANKLE: 28,
  RIGHT_HEEL: 29,
  LEFT_HEEL: 30,
  RIGHT_FOOT_INDEX: 31,
  LEFT_FOOT_INDEX: 32,
}

// ── Pose Connections (skeleton structure) ────────────────────────────────────
// Note: Face connections are removed - we only draw body skeleton, not face

const POSE_CONNECTIONS = [
  // Skip face connections - we don't want to draw face skeleton
  // Torso
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],
  // Left arm
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
  [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
  [POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.LEFT_INDEX],
  [POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.LEFT_PINKY],
  [POSE_LANDMARKS.LEFT_INDEX, POSE_LANDMARKS.LEFT_PINKY],
  // Right arm
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
  [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],
  [POSE_LANDMARKS.RIGHT_WRIST, POSE_LANDMARKS.RIGHT_INDEX],
  [POSE_LANDMARKS.RIGHT_WRIST, POSE_LANDMARKS.RIGHT_PINKY],
  [POSE_LANDMARKS.RIGHT_INDEX, POSE_LANDMARKS.RIGHT_PINKY],
  // Left leg
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
  [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
  [POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.LEFT_HEEL],
  [POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.LEFT_FOOT_INDEX],
  [POSE_LANDMARKS.LEFT_HEEL, POSE_LANDMARKS.LEFT_FOOT_INDEX],
  // Right leg
  [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
  [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
  [POSE_LANDMARKS.RIGHT_ANKLE, POSE_LANDMARKS.RIGHT_HEEL],
  [POSE_LANDMARKS.RIGHT_ANKLE, POSE_LANDMARKS.RIGHT_FOOT_INDEX],
  [POSE_LANDMARKS.RIGHT_HEEL, POSE_LANDMARKS.RIGHT_FOOT_INDEX],
]

// ── Hand Landmark Indices (21 landmarks per hand) ────────────────────────────

const HAND_LANDMARKS = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_FINGER_MCP: 5,
  INDEX_FINGER_PIP: 6,
  INDEX_FINGER_DIP: 7,
  INDEX_FINGER_TIP: 8,
  MIDDLE_FINGER_MCP: 9,
  MIDDLE_FINGER_PIP: 10,
  MIDDLE_FINGER_DIP: 11,
  MIDDLE_FINGER_TIP: 12,
  RING_FINGER_MCP: 13,
  RING_FINGER_PIP: 14,
  RING_FINGER_DIP: 15,
  RING_FINGER_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
}

// ── Hand Connections (skeleton structure) ─────────────────────────────────────

const HAND_CONNECTIONS = [
  // Wrist to palm
  [HAND_LANDMARKS.WRIST, HAND_LANDMARKS.THUMB_CMC],
  [HAND_LANDMARKS.WRIST, HAND_LANDMARKS.INDEX_FINGER_MCP],
  [HAND_LANDMARKS.WRIST, HAND_LANDMARKS.MIDDLE_FINGER_MCP],
  [HAND_LANDMARKS.WRIST, HAND_LANDMARKS.RING_FINGER_MCP],
  [HAND_LANDMARKS.WRIST, HAND_LANDMARKS.PINKY_MCP],
  // Thumb
  [HAND_LANDMARKS.THUMB_CMC, HAND_LANDMARKS.THUMB_MCP],
  [HAND_LANDMARKS.THUMB_MCP, HAND_LANDMARKS.THUMB_IP],
  [HAND_LANDMARKS.THUMB_IP, HAND_LANDMARKS.THUMB_TIP],
  // Index finger
  [HAND_LANDMARKS.INDEX_FINGER_MCP, HAND_LANDMARKS.INDEX_FINGER_PIP],
  [HAND_LANDMARKS.INDEX_FINGER_PIP, HAND_LANDMARKS.INDEX_FINGER_DIP],
  [HAND_LANDMARKS.INDEX_FINGER_DIP, HAND_LANDMARKS.INDEX_FINGER_TIP],
  // Middle finger
  [HAND_LANDMARKS.MIDDLE_FINGER_MCP, HAND_LANDMARKS.MIDDLE_FINGER_PIP],
  [HAND_LANDMARKS.MIDDLE_FINGER_PIP, HAND_LANDMARKS.MIDDLE_FINGER_DIP],
  [HAND_LANDMARKS.MIDDLE_FINGER_DIP, HAND_LANDMARKS.MIDDLE_FINGER_TIP],
  // Ring finger
  [HAND_LANDMARKS.RING_FINGER_MCP, HAND_LANDMARKS.RING_FINGER_PIP],
  [HAND_LANDMARKS.RING_FINGER_PIP, HAND_LANDMARKS.RING_FINGER_DIP],
  [HAND_LANDMARKS.RING_FINGER_DIP, HAND_LANDMARKS.RING_FINGER_TIP],
  // Pinky
  [HAND_LANDMARKS.PINKY_MCP, HAND_LANDMARKS.PINKY_PIP],
  [HAND_LANDMARKS.PINKY_PIP, HAND_LANDMARKS.PINKY_DIP],
  [HAND_LANDMARKS.PINKY_DIP, HAND_LANDMARKS.PINKY_TIP],
  // Connect finger bases
  [HAND_LANDMARKS.THUMB_CMC, HAND_LANDMARKS.INDEX_FINGER_MCP],
  [HAND_LANDMARKS.INDEX_FINGER_MCP, HAND_LANDMARKS.MIDDLE_FINGER_MCP],
  [HAND_LANDMARKS.MIDDLE_FINGER_MCP, HAND_LANDMARKS.RING_FINGER_MCP],
  [HAND_LANDMARKS.RING_FINGER_MCP, HAND_LANDMARKS.PINKY_MCP],
]

// ── Drawing Functions ────────────────────────────────────────────────────────

/**
 * Draw pose skeleton on canvas
 */
export function drawPoseSkeleton(ctx, landmarks, width, height) {
  if (!landmarks || landmarks.length === 0) return

  ctx.strokeStyle = '#00ff00' // Green for pose
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const drawConnection = (startIdx, endIdx) => {
    // Skip connections involving face landmarks (indices 0-10)
    if (startIdx <= 10 || endIdx <= 10) return
    
    const start = landmarks[startIdx]
    const end = landmarks[endIdx]
    if (!start || !end) return
    
    // Check visibility if available
    const startVis = start.visibility !== undefined ? start.visibility : 1
    const endVis = end.visibility !== undefined ? end.visibility : 1
    if (startVis < 0.5 || endVis < 0.5) return

    const x1 = start.x * width
    const y1 = start.y * height
    const x2 = end.x * width
    const y2 = end.y * height

    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }

  // Draw all connections (face connections already removed from POSE_CONNECTIONS)
  for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
    if (startIdx < landmarks.length && endIdx < landmarks.length) {
      drawConnection(startIdx, endIdx)
    }
  }

  // Draw landmarks as dots (skip face landmarks: 0-10)
  ctx.fillStyle = '#00ff00'
  for (let i = 0; i < landmarks.length; i++) {
    // Skip face landmarks (indices 0-10: nose, eyes, ears, mouth)
    if (i <= 10) continue
    
    const landmark = landmarks[i]
    if (!landmark) continue
    
    // Check visibility if available
    const vis = landmark.visibility !== undefined ? landmark.visibility : 1
    if (vis < 0.5) continue

    const x = landmark.x * width
    const y = landmark.y * height

    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fill()
  }
}

/**
 * Draw hand skeleton on canvas
 */
export function drawHandSkeleton(ctx, landmarks, width, height) {
  if (!landmarks || landmarks.length === 0) return

  ctx.strokeStyle = '#ff00ff' // Magenta for hands
  ctx.lineWidth = 3 // Make lines thicker for better visibility
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const drawConnection = (startIdx, endIdx) => {
    const start = landmarks[startIdx]
    const end = landmarks[endIdx]
    if (!start || !end) return
    
    // Hand landmarks may not have visibility property, so check if it exists
    // But don't skip if visibility is not available (assume visible)
    const startVis = start.visibility !== undefined ? start.visibility : 1
    const endVis = end.visibility !== undefined ? end.visibility : 1
    // Only skip if visibility is explicitly low
    if (startVis < 0.3 || endVis < 0.3) return

    const x1 = start.x * width
    const y1 = start.y * height
    const x2 = end.x * width
    const y2 = end.y * height

    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }

  // Draw all connections first (skeleton lines)
  for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
    if (startIdx < landmarks.length && endIdx < landmarks.length) {
      drawConnection(startIdx, endIdx)
    }
  }

  // Draw landmarks as dots (smaller, so they don't obscure the skeleton)
  ctx.fillStyle = '#ff00ff'
  for (let i = 0; i < landmarks.length; i++) {
    const landmark = landmarks[i]
    if (!landmark) continue
    
    // Hand landmarks may not have visibility property
    const vis = landmark.visibility !== undefined ? landmark.visibility : 1
    // Only skip if visibility is explicitly very low
    if (vis < 0.3) continue

    const x = landmark.x * width
    const y = landmark.y * height

    ctx.beginPath()
    ctx.arc(x, y, 2, 0, Math.PI * 2)
    ctx.fill()
  }
}

/**
 * Draw face landmarks as dots (no skeleton connections)
 * Selects the most important 20-33 landmarks for face reading
 */
export function drawFaceLandmarks(ctx, landmarks, width, height) {
  if (!landmarks || landmarks.length === 0) return

  // Select the most important landmarks for face reading (from face-annotator.js LM object)
  // These are key points for 三停, 十二宫位, and facial features
  const IMPORTANT_FACE_LANDMARKS = [
    10,   // 天庭 top (foreheadTop)
    151,  // 官禄宫 (foreheadMid)
    9,    // 印堂 (glabella)
    6,    // 山根 (noseBridgeTop)
    1,    // 准头 (noseTip)
    2,    // 鼻底 (noseBottom)
    48,   // 左鼻翼 (leftNoseWing)
    278,  // 右鼻翼 (rightNoseWing)
    33,   // 左夫妻宫 (leftEyeOuter)
    133,  // 左眼内角 (leftEyeInner)
    362,  // 右夫妻宫 (rightEyeOuter)
    263,  // 右眼内角 (rightEyeInner)
    159,  // 左眼上 (leftEyeTop)
    145,  // 左眼下 (leftEyeBottom)
    386,  // 右眼上 (rightEyeTop)
    374,  // 右眼下 (rightEyeBottom)
    70,   // 左眉头 (leftBrowInner)
    107,  // 左眉尾 (leftBrowOuter)
    105,  // 左眉峰 (leftBrowPeak)
    300,  // 右眉头 (rightBrowInner)
    336,  // 右眉尾 (rightBrowOuter)
    334,  // 右眉峰 (rightBrowPeak)
    13,   // 上唇 (upperLip)
    14,   // 下唇 (lowerLip)
    0,    // 人中底部 (lipTop)
    17,   // 唇底 (lipBottom)
    152,  // 地阁 (chin)
    234,  // 左颧骨 (leftCheekbone)
    454,  // 右颧骨 (rightCheekbone)
    172,  // 左腮骨 (leftJaw)
    397,  // 右腮骨 (rightJaw)
    54,   // 左太阳穴 (leftTemple)
    284,  // 右太阳穴 (rightTemple)
    164,  // 人中 (philtrum)
  ]

  ctx.fillStyle = '#ffff00' // Yellow for face landmarks
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1

  for (const idx of IMPORTANT_FACE_LANDMARKS) {
    if (idx >= landmarks.length) continue
    
    const landmark = landmarks[idx]
    if (!landmark) continue

    const x = landmark.x * width
    const y = landmark.y * height

    // Draw landmark as a filled circle with border
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
}

/**
 * Draw all skeletons from HolisticLandmarker result
 * Draws pose skeleton (body), hand skeletons, and face landmarks
 */
export function drawHolisticSkeletons(ctx, result, width, height) {
  if (!result) {
    return
  }

  // Draw face landmarks as dots (no skeleton)
  if (result.faceLandmarks && Array.isArray(result.faceLandmarks)) {
    let faceLandmarks = result.faceLandmarks
    
    // If first element is an array, it's an array of faces - take the first one
    if (faceLandmarks.length > 0 && Array.isArray(faceLandmarks[0])) {
      faceLandmarks = faceLandmarks[0]
    }
    
    // Check if we have valid landmarks
    if (faceLandmarks && faceLandmarks.length > 0 && typeof faceLandmarks[0] === 'object' && 'x' in faceLandmarks[0]) {
      drawFaceLandmarks(ctx, faceLandmarks, width, height)
    }
  }

  // Draw pose skeleton (body) - but skip face-related connections
  // HolisticLandmarker returns poseLandmarks as an array of landmarks
  if (result.poseLandmarks && Array.isArray(result.poseLandmarks)) {
    let poseLandmarks = result.poseLandmarks
    
    // If first element is an array, it's an array of poses - take the first one
    if (poseLandmarks.length > 0 && Array.isArray(poseLandmarks[0])) {
      poseLandmarks = poseLandmarks[0]
    }
    
    // Check if we have valid landmarks (should be objects with x, y properties)
    if (poseLandmarks && poseLandmarks.length > 0 && typeof poseLandmarks[0] === 'object' && 'x' in poseLandmarks[0]) {
      drawPoseSkeleton(ctx, poseLandmarks, width, height)
    }
  }

  // Draw hand skeletons
  // HolisticLandmarker returns handLandmarks as arrays
  if (result.leftHandLandmarks && Array.isArray(result.leftHandLandmarks)) {
    let leftHandLandmarks = result.leftHandLandmarks
    
    // If first element is an array, it's an array of hands - take the first one
    if (leftHandLandmarks.length > 0 && Array.isArray(leftHandLandmarks[0])) {
      leftHandLandmarks = leftHandLandmarks[0]
    }
    
    // Check if we have valid landmarks
    if (leftHandLandmarks && leftHandLandmarks.length > 0 && typeof leftHandLandmarks[0] === 'object' && 'x' in leftHandLandmarks[0]) {
      drawHandSkeleton(ctx, leftHandLandmarks, width, height)
    }
  }
  
  if (result.rightHandLandmarks && Array.isArray(result.rightHandLandmarks)) {
    let rightHandLandmarks = result.rightHandLandmarks
    
    // If first element is an array, it's an array of hands - take the first one
    if (rightHandLandmarks.length > 0 && Array.isArray(rightHandLandmarks[0])) {
      rightHandLandmarks = rightHandLandmarks[0]
    }
    
    // Check if we have valid landmarks
    if (rightHandLandmarks && rightHandLandmarks.length > 0 && typeof rightHandLandmarks[0] === 'object' && 'x' in rightHandLandmarks[0]) {
      drawHandSkeleton(ctx, rightHandLandmarks, width, height)
    }
  }
}
