import { lazy, Suspense, useRef, useState, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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

const MODEL_ROTATION = ['Gemini 3 Flash', 'DeepSeek', 'Kimi K2.5']

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
  const [modelIndex, setModelIndex] = useState(0)
  const [resultShareId, setResultShareId] = useState(null)
  const resultCacheRef = useRef(new Map())
  const restoringRef = useRef(false)

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

  useEffect(() => {
    const state = window.history.state
    if (!state || state.view !== 'idle') {
      window.history.replaceState({ view: 'idle' }, '')
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setModelIndex((prev) => (prev + 1) % MODEL_ROTATION.length)
    }, 700)

    return () => window.clearInterval(timer)
  }, [])

  // Dismiss result and return to idle
  const dismissResult = useCallback(() => {
    if (phase !== PHASE.RESULT) return
    if (window.history.state?.view === 'result') {
      window.history.back()
      return
    }
    setPhase(PHASE.IDLE)
    setFortunes(null)
    setPixelatedImage(null)
    setVisualizationData(null)
    setResultShareId(null)
  }, [phase])

  const openResultFromShare = useCallback(async (shareId) => {
    if (!shareId || restoringRef.current) return
    restoringRef.current = true

    try {
      const cached = resultCacheRef.current.get(shareId)
      if (cached) {
        setFortunes(cached.fortunes)
        setPixelatedImage(cached.pixelatedImage)
        setVisualizationData(cached.visualizationData)
        setResultShareId(shareId)
        setPhase(PHASE.RESULT)
        return
      }

      const resp = await fetch(`/api/share/${shareId}`)
      if (!resp.ok) throw new Error('share not found')
      const data = await resp.json()
      const restored = {
        fortunes: data.fortunes || null,
        pixelatedImage: data.pixelated_image || null,
        visualizationData: data.visualization_data || null,
      }

      resultCacheRef.current.set(shareId, restored)
      setFortunes(restored.fortunes)
      setPixelatedImage(restored.pixelatedImage)
      setVisualizationData(restored.visualizationData)
      setResultShareId(shareId)
      setPhase(PHASE.RESULT)
    } catch {
      setPhase(PHASE.IDLE)
      setFortunes(null)
      setPixelatedImage(null)
      setVisualizationData(null)
      setResultShareId(null)
    } finally {
      restoringRef.current = false
    }
  }, [])

  useEffect(() => {
    async function handlePopState(e) {
      const state = e.state || {}
      if (state.view === 'result' && state.shareId) {
        setActiveTab(TAB.FORTUNE)
        await openResultFromShare(state.shareId)
        return
      }

      setPhase(PHASE.IDLE)
      setFortunes(null)
      setPixelatedImage(null)
      setVisualizationData(null)
      setResultShareId(null)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [openResultFromShare])

  const handleShareCreated = useCallback((shareId) => {
    if (!shareId || shareId === resultShareId) return

    setResultShareId(shareId)
    resultCacheRef.current.set(shareId, {
      fortunes,
      pixelatedImage,
      visualizationData,
    })

    if (window.history.state?.view !== 'result' || window.history.state?.shareId !== shareId) {
      window.history.pushState({ view: 'result', shareId }, '')
    }
  }, [fortunes, pixelatedImage, resultShareId, visualizationData])

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <h1 className="pl-1 flex flex-1 min-w-0 items-baseline gap-2 sm:gap-2.5 whitespace-nowrap">
            <span className="font-hei-cn font-semibold text-base sm:text-2xl text-yellow-200/85 w-[9.8rem] sm:w-[13rem] shrink-0">
              <AnimatePresence mode="wait">
                <motion.span
                  key={MODEL_ROTATION[modelIndex]}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="block truncate"
                >
                  {MODEL_ROTATION[modelIndex]}
                </motion.span>
              </AnimatePresence>
            </span>
            <span className="font-hei-cn font-black text-base sm:text-2xl text-yellow-400 leading-none">
              AI相面
            </span>
          </h1>
          <AppTabs activeTab={activeTab} onChange={setActiveTab} className="shrink-0" />
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
                onShareCreated={handleShareCreated}
                embedded
                showTitle={false}
                showFooter={false}
              />
            ) : (
              <>
                <CameraView videoRef={videoRef} canvasRef={canvasRef} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/50 pointer-events-none" />

                <AnimatePresence mode="wait">
                  {phase === PHASE.IDLE && (
                    <IdleOverlay
                      key="idle"
                      faceCount={faceCount}
                      isReady={isReady}
                    />
                  )}

                  {phase === PHASE.ANALYZING && <AnalyzingOverlay key="analyzing" />}
                </AnimatePresence>

                {error && (
                  <div className="absolute top-4 left-4 right-4 bg-red-900/80 text-red-200 px-4 py-2 rounded-lg text-sm">
                    ⚠️ {error}
                  </div>
                )}

                {phase === PHASE.IDLE && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-4 sm:bottom-5 z-30 pointer-events-auto">
                    <button
                      onClick={startFortune}
                      disabled={!isReady}
                      className="relative px-8 py-3 sm:px-10 sm:py-4 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-calligraphy text-2xl sm:text-4xl whitespace-nowrap rounded-xl sm:rounded-2xl shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 animate-pulse-ring tracking-widest"
                    >
                      开始相面
                    </button>
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

      <div className="shrink-0 border-t border-yellow-400/10 bg-black/70 px-3 sm:px-4 py-4 sm:py-5">
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
