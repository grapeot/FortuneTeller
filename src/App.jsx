import { lazy, Suspense, useRef, useState, useCallback, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useFaceDetection } from './hooks/useFaceDetection'
import { useHolisticDetection } from './hooks/useHolisticDetection'
import { generateAIFortune } from './lib/ai-fortune'
import { captureAndAnnotate } from './lib/face-annotator'
import { TIMING, BRAND } from './lib/config'
import CameraView from './components/CameraView'
import IdleOverlay from './components/IdleOverlay'
import AnalyzingOverlay from './components/AnalyzingOverlay'
import ResultOverlay from './components/ResultOverlay'
import QRCodeIcon from './components/QRCodeIcon'
import AppTabs from './components/AppTabs'

const FaceReadingGuidePage = lazy(() => import('./components/FaceReadingGuidePage'))
const InsidePage = lazy(() => import('./components/InsidePage'))

/** App states */
const PHASE = {
  IDLE: 'idle',
  ANALYZING: 'analyzing',
  RESULT: 'result',
}

const TAB = {
  FORTUNE: 'fortune',
  GUIDE: 'guide',
  INSIDE: 'inside',
}

function getInitialTab() {
  const tab = new URLSearchParams(window.location.search).get('tab')
  return Object.values(TAB).includes(tab) ? tab : TAB.FORTUNE
}

export default function App() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const isProcessingRef = useRef(false)

  const [phase, setPhase] = useState(PHASE.IDLE)
  const [fortunes, setFortunes] = useState(null) // { gemini: null, grok: {...} }
  const [pixelatedImage, setPixelatedImage] = useState(null)
  const [visualizationData, setVisualizationData] = useState(null)
  const [activeTab, setActiveTab] = useState(getInitialTab)

  // Face detection is active only during IDLE phase
  const { isReady, faceCount, error } = useFaceDetection(videoRef, canvasRef, {
    enabled: activeTab === TAB.FORTUNE && phase === PHASE.IDLE,
  })

  // Holistic detection for pose + hand skeleton visualization (IDLE phase only)
  useHolisticDetection(videoRef, canvasRef, {
    enabled: activeTab === TAB.FORTUNE && phase === PHASE.IDLE,
  })

  useEffect(() => {
    const url = new URL(window.location.href)
    if (activeTab === TAB.FORTUNE) {
      url.searchParams.delete('tab')
    } else {
      url.searchParams.set('tab', activeTab)
    }
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }, [activeTab])

  useEffect(() => {
    if (activeTab === TAB.FORTUNE) return
    isProcessingRef.current = false
    setPhase(PHASE.IDLE)
    setFortunes(null)
    setPixelatedImage(null)
    setVisualizationData(null)
  }, [activeTab])

  // Dismiss result and return to idle
  const dismissResult = useCallback(() => {
    if (phase !== PHASE.RESULT) return
    setPhase(PHASE.IDLE)
    setFortunes(null)
    setPixelatedImage(null)
    setVisualizationData(null)
  }, [phase])

  // Start fortune telling — capture face + annotate, then AI call runs in parallel with animation
  const startFortune = useCallback(async () => {
    // Prevent race condition: check phase and processing state
    if (activeTab !== TAB.FORTUNE || phase !== PHASE.IDLE || isProcessingRef.current) return
    
    isProcessingRef.current = true

    try {
      // Capture face image and measurements BEFORE switching phase (video is still active)
      const captureResult = await captureAndAnnotate(videoRef.current)
      if (!captureResult) {
        console.error('Failed to capture face image')
        // Could show error message to user here
        return
      }
      
      const originalImage = captureResult.originalDataUrl || null
      const measurements = captureResult.measurements || null
      const vizData = captureResult.visualizationData || null

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
      setVisualizationData(vizData)
      setFortunes(multiModelFortunes) // { gemini: {...}, grok: {...} }
      setPhase(PHASE.RESULT)
    } catch (err) {
      console.error('Error in fortune telling:', err)
      // Reset to IDLE on error
      setPhase(PHASE.IDLE)
    } finally {
      isProcessingRef.current = false
    }
  }, [activeTab, phase])

  // Keyboard shortcut: Space or Enter
  useEffect(() => {
    function handleKeyDown(e) {
      if (activeTab !== TAB.FORTUNE) return
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
  }, [activeTab, phase, startFortune, dismissResult])

  return (
    <div className="h-screen w-screen bg-black overflow-hidden select-none flex flex-col">
      <div className="relative z-50 shrink-0 pt-3 px-3 sm:px-4">
        <AppTabs activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <div className="relative flex-1 overflow-hidden">
        {activeTab === TAB.FORTUNE ? (
          <>
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none"
            style={{ backgroundImage: 'url(/assets/bg-cny.jpg)' }}
          />
          <CameraView videoRef={videoRef} canvasRef={canvasRef} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/50 pointer-events-none" />

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
                visualizationData={visualizationData}
                onDismiss={dismissResult}
              />
            )}
          </AnimatePresence>

          {error && (
            <div className="absolute top-16 left-4 right-4 bg-red-900/80 text-red-200 px-4 py-2 rounded-lg text-sm">
              ⚠️ {error}
            </div>
          )}

          {phase === PHASE.IDLE && (
            <div className="absolute bottom-3 right-4 text-xs text-gray-600 flex items-center gap-2">
              {BRAND.name} · MediaPipe Face Detection
            </div>
          )}

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

          {fortunes?.grok?.source === 'ai' && phase === PHASE.RESULT && (
            <div className="absolute top-14 right-4 text-xs text-green-700">
              ✦ AI Generated
            </div>
          )}
          </>
        ) : activeTab === TAB.GUIDE ? (
          <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-yellow-200 font-serif-cn">加载指南中...</div>}>
            <FaceReadingGuidePage />
          </Suspense>
        ) : (
          <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-yellow-200 font-serif-cn">加载页面中...</div>}>
            <InsidePage />
          </Suspense>
        )}
      </div>
    </div>
  )
}
