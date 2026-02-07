import { useRef, useState, useCallback, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useFaceDetection } from './hooks/useFaceDetection'
import { generateAIFortune } from './lib/ai-fortune'
import { TIMING, BRAND } from './lib/config'
import CameraView from './components/CameraView'
import IdleOverlay from './components/IdleOverlay'
import AnalyzingOverlay from './components/AnalyzingOverlay'
import ResultOverlay from './components/ResultOverlay'

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
  const [fortune, setFortune] = useState(null)

  // Face detection is active only during IDLE phase
  const { isReady, faceCount, error } = useFaceDetection(videoRef, canvasRef, {
    enabled: phase === PHASE.IDLE,
  })

  // Dismiss result and return to idle
  const dismissResult = useCallback(() => {
    if (phase !== PHASE.RESULT) return
    setPhase(PHASE.IDLE)
    setFortune(null)
  }, [phase])

  // Start fortune telling — AI call runs in parallel with animation
  const startFortune = useCallback(async () => {
    if (phase !== PHASE.IDLE) return

    setPhase(PHASE.ANALYZING)

    // Run AI generation and minimum animation timer in parallel
    const [generatedFortune] = await Promise.all([
      generateAIFortune(),
      new Promise((resolve) => setTimeout(resolve, TIMING.analyzeDuration)),
    ])

    setFortune(generatedFortune)
    setPhase(PHASE.RESULT)
  }, [phase])

  // Keyboard shortcut: Space or Enter
  //   IDLE   → start fortune
  //   RESULT → dismiss and return to IDLE
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

      {/* Decorative lanterns (PNG with transparency) */}
      <img
        src="/assets/lantern.png"
        alt=""
        className="absolute top-0 left-4 w-20 opacity-60 pointer-events-none"
        onError={(e) => { e.target.style.display = 'none' }}
      />
      <img
        src="/assets/lantern.png"
        alt=""
        className="absolute top-0 right-4 w-20 opacity-60 pointer-events-none"
        onError={(e) => { e.target.style.display = 'none' }}
      />
      <img
        src="/assets/clouds.jpg"
        alt=""
        className="absolute bottom-0 left-0 right-0 h-24 object-cover opacity-20 pointer-events-none"
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

        {phase === PHASE.RESULT && fortune && (
          <ResultOverlay
            key="result"
            fortune={fortune}
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
        <div className="absolute bottom-3 right-4 text-xs text-gray-600">
          {BRAND.name} · MediaPipe Face Detection
        </div>
      )}

      {/* AI source indicator (debug) */}
      {fortune?.source === 'ai' && phase === PHASE.RESULT && (
        <div className="absolute top-3 right-4 text-xs text-green-700">
          ✦ AI Generated
        </div>
      )}
    </div>
  )
}
