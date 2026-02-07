import { useRef, useState, useCallback, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useFaceDetection } from './hooks/useFaceDetection'
import { generateFortune } from './lib/fortune'
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

/** Duration constants (ms) */
const ANALYZE_DURATION = 2500
const RESULT_DURATION = 6000

export default function App() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  const [phase, setPhase] = useState(PHASE.IDLE)
  const [fortune, setFortune] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(0)

  // Face detection is active only during IDLE phase
  const { isReady, faceCount, error } = useFaceDetection(videoRef, canvasRef, {
    enabled: phase === PHASE.IDLE,
  })

  // Start fortune telling
  const startFortune = useCallback(() => {
    if (phase !== PHASE.IDLE) return

    setPhase(PHASE.ANALYZING)

    // After analysis animation, show result
    setTimeout(() => {
      setFortune(generateFortune())
      setPhase(PHASE.RESULT)
      setSecondsLeft(Math.ceil(RESULT_DURATION / 1000))

      // Auto-return to idle after result duration
      setTimeout(() => {
        setPhase(PHASE.IDLE)
        setFortune(null)
        setSecondsLeft(0)
      }, RESULT_DURATION)
    }, ANALYZE_DURATION)
  }, [phase])

  // Countdown timer during result phase
  useEffect(() => {
    if (phase !== PHASE.RESULT || secondsLeft <= 0) return

    const timer = setTimeout(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
    }, 1000)

    return () => clearTimeout(timer)
  }, [phase, secondsLeft])

  // Keyboard shortcut: Space or Enter to start
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.key === ' ' || e.key === 'Enter') && phase === PHASE.IDLE) {
        e.preventDefault()
        startFortune()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [phase, startFortune])

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

      {/* Decorative elements */}
      <img
        src="/assets/lantern.jpg"
        alt=""
        className="absolute top-0 left-4 w-20 opacity-40 pointer-events-none"
      />
      <img
        src="/assets/lantern.jpg"
        alt=""
        className="absolute top-0 right-4 w-20 opacity-40 pointer-events-none"
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
            secondsLeft={secondsLeft}
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
          AI Course Developer · MediaPipe Face Detection
        </div>
      )}
    </div>
  )
}
