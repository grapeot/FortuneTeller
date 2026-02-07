/**
 * Capture a face screenshot from a video element.
 *
 * Draws the current video frame to an offscreen canvas and returns
 * a JPEG base64 data URI string suitable for multimodal AI APIs.
 *
 * @param {HTMLVideoElement} videoEl - The live video element
 * @param {object} [options]
 * @param {number} [options.maxWidth=640] - Max width (height scales proportionally)
 * @param {number} [options.quality=0.85] - JPEG quality (0-1)
 * @returns {string|null} base64 data URI or null if capture fails
 */
export function captureVideoFrame(videoEl, options = {}) {
  const { maxWidth = 640, quality = 0.85 } = options

  if (!videoEl || videoEl.readyState < 2) return null

  const vw = videoEl.videoWidth
  const vh = videoEl.videoHeight
  if (!vw || !vh) return null

  // Scale down if needed (keep aspect ratio)
  const scale = Math.min(1, maxWidth / vw)
  const cw = Math.round(vw * scale)
  const ch = Math.round(vh * scale)

  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch

  const ctx = canvas.getContext('2d')
  ctx.drawImage(videoEl, 0, 0, cw, ch)

  return canvas.toDataURL('image/jpeg', quality)
}
