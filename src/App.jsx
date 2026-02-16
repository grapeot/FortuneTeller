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
      <div className="relative z-50 shrink-0 px-3 sm:px-4 py-2.5 border-b border-yellow-400/15 bg-black/65 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <h1 className="pl-1 flex items-baseline gap-2 sm:gap-3 whitespace-nowrap overflow-hidden">
            <span className="font-en text-xs sm:text-sm md:text-base text-yellow-200/80 truncate">
              Gemini 3 Flash · DeepSeek · Kimi K2.5
            </span>
            <span className="font-calligraphy text-3xl sm:text-4xl md:text-5xl text-yellow-400 text-glow-warm leading-none">
              AI相面
            </span>
          </h1>
          <AppTabs activeTab={activeTab} onChange={setActiveTab} />
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {activeTab === TAB.FORTUNE ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none"
              style={{ backgroundImage: 'url(/assets/bg-cny.jpg)' }}
            />

            {phase === PHASE.RESULT && fortunes ? (
              <ResultOverlay
                key="result"
                fortunes={fortunes}
                pixelatedImage={pixelatedImage}
                visualizationData={visualizationData}
                onDismiss={dismissResult}
                embedded
                showTitle={false}
                showFooter={false}
              />
            ) : (
              <>
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
                </AnimatePresence>

                {error && (
                  <div className="absolute top-4 left-4 right-4 bg-red-900/80 text-red-200 px-4 py-2 rounded-lg text-sm">
                    ⚠️ {error}
                  </div>
                )}
              </>
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

      <div className="shrink-0 border-t border-yellow-400/10 bg-black/70 px-3 sm:px-4 py-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
          <p className="font-serif-cn text-[11px] sm:text-xs text-gray-400">
            本过程会获取一帧影像用于面相分析，分析后立即销毁，不会保存。分享仅使用匿名化、像素化风格图像。
          </p>
          <p className="font-serif-cn text-[11px] sm:text-xs text-gray-500">
            {BRAND.name} · MediaPipe Face Detection
          </p>
        </div>
      </div>
    </div>
  )
}
