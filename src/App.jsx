import { useRef, useState, useCallback, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useFaceDetection } from './hooks/useFaceDetection'
import { generateAIFortune } from './lib/ai-fortune'
import { captureAndAnnotate } from './lib/face-annotator'
import { TIMING, BRAND } from './lib/config'
import CameraView from './components/CameraView'
import IdleOverlay from './components/IdleOverlay'
import AnalyzingOverlay from './components/AnalyzingOverlay'
import ResultOverlay from './components/ResultOverlay'
import QRCodeIcon from './components/QRCodeIcon'

/** App states */
const PHASE = {
  IDLE: 'idle',
  ANALYZING: 'analyzing',
  RESULT: 'result',
}

export default function App() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  const [phase, setPhase] = useState(PHASE.IDLE)
  const [fortunes, setFortunes] = useState(null) // { gemini: {...}, grok: {...} }
  const [pixelatedImage, setPixelatedImage] = useState(null)

  // Face detection is active only during IDLE phase
  const { isReady, faceCount, error } = useFaceDetection(videoRef, canvasRef, {
    enabled: phase === PHASE.IDLE,
  })

  // Dismiss result and return to idle
  const dismissResult = useCallback(() => {
    if (phase !== PHASE.RESULT) return
    setPhase(PHASE.IDLE)
    setFortunes(null)
    setPixelatedImage(null)
  }, [phase])

  // Start fortune telling — capture face + annotate, then AI call runs in parallel with animation
  const startFortune = useCallback(async () => {
    if (phase !== PHASE.IDLE) return

    // Capture face image and measurements BEFORE switching phase (video is still active)
    const captureResult = await captureAndAnnotate(videoRef.current)
    const originalImage = captureResult?.originalDataUrl || null
    const measurements = captureResult?.measurements || null

    setPhase(PHASE.ANALYZING)

    // Run AI fortune (multi-model), pixelated avatar, and minimum animation timer all in parallel
    const pixelatePromise = originalImage
      ? fetch('/api/pixelate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: originalImage }),
        })
          .then((r) => r.ok ? r.json() : null)
          .then((d) => d?.pixelated_image || null)
          .catch(() => null)
      : Promise.resolve(null)

    const [multiModelFortunes, pixelated] = await Promise.all([
      generateAIFortune(originalImage, measurements),
      pixelatePromise,
      new Promise((resolve) => setTimeout(resolve, TIMING.analyzeDuration)),
    ])

    setPixelatedImage(pixelated)
    setFortunes(multiModelFortunes) // { gemini: {...}, grok: {...} }
    setPhase(PHASE.RESULT)
  }, [phase])

  // Keyboard shortcut: Space or Enter
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (phase === PHASE.IDLE) {
          startFortune()
        } else if (phase === PHASE.RESULT) {
          dismissResult()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [phase, startFortune, dismissResult])

  return (
    <div className="relative h-screen w-screen bg-black overflow-hidden select-none">
      {/* Background image (Chinese New Year theme) */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none"
        style={{ backgroundImage: 'url(/assets/bg-cny.jpg)' }}
      />

      {/* Camera feed (always visible as background) */}
      <CameraView videoRef={videoRef} canvasRef={canvasRef} />

      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/50 pointer-events-none" />

      {/* Decorative lanterns (PNG with transparency) - 200% size */}
      <img
        src="/assets/lantern.png"
        alt=""
        className="absolute top-0 left-4 w-40 opacity-60 pointer-events-none"
        onError={(e) => { e.target.style.display = 'none' }}
      />
      <img
        src="/assets/lantern.png"
        alt=""
        className="absolute top-0 right-4 w-40 opacity-60 pointer-events-none"
        onError={(e) => { e.target.style.display = 'none' }}
      />

      {/* Phase-based overlays */}
      <AnimatePresence mode="wait">
        {phase === PHASE.IDLE && (
          <IdleOverlay
            key="idle"
            faceCount={faceCount}
            isReady={isReady}
            onStart={startFortune}
          />
        )}

        {phase === PHASE.ANALYZING && <AnalyzingOverlay key="analyzing" />}

        {phase === PHASE.RESULT && fortunes && (
          <ResultOverlay
            key="result"
            fortunes={fortunes}
            pixelatedImage={pixelatedImage}
            onDismiss={dismissResult}
          />
        )}
      </AnimatePresence>

      {/* Error display */}
      {error && (
        <div className="absolute top-4 left-4 right-4 bg-red-900/80 text-red-200 px-4 py-2 rounded-lg text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Brand watermark */}
      {phase === PHASE.IDLE && (
        <div className="absolute bottom-3 right-4 text-xs text-gray-600 flex items-center gap-2">
          {BRAND.name} · MediaPipe Face Detection
        </div>
      )}

      {/* GitHub + QR Code links */}
      <div className="absolute bottom-3 left-4 flex items-center gap-3">
        <a
          href="https://github.com/grapeot/FortuneTeller"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-500 hover:text-gray-300 transition-colors opacity-60 hover:opacity-90"
          aria-label="View on GitHub"
        >
          <svg
            className="w-6 h-6"
            fill="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
        </a>
        <QRCodeIcon />
      </div>

      {/* AI source indicator (debug) */}
      {fortunes?.gemini?.source === 'ai' && phase === PHASE.RESULT && (
        <div className="absolute top-3 right-4 text-xs text-green-700">
          ✦ AI Generated
        </div>
      )}
    </div>
  )
}
