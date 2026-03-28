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
  const [fortunes, setFortunes] = useState(null)
  const [pixelatedImage, setPixelatedImage] = useState(null)
  const [visualizationData, setVisualizationData] = useState(null)
  const [activeTab, setActiveTab] = useState(getInitialTab)
  const [resultShareId, setResultShareId] = useState(null)
  const resultCacheRef = useRef(new Map())
  const resultShareIdRef = useRef(null)
  const restoringRef = useRef(false)

  const { isReady, faceCount, error } = useFaceDetection(videoRef, canvasRef, {
    enabled: activeTab === TAB.FORTUNE && phase === PHASE.IDLE,
  })

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
    setResultShareId(null)
    resultShareIdRef.current = null
  }, [activeTab])

  useEffect(() => {
    const state = window.history.state
    if (!state || state.view !== 'idle') {
      window.history.replaceState({ view: 'idle' }, '')
    }
  }, [])

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
    resultShareIdRef.current = null
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
        resultShareIdRef.current = shareId
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
      resultShareIdRef.current = shareId
      setPhase(PHASE.RESULT)
    } catch {
      setPhase(PHASE.IDLE)
      setFortunes(null)
      setPixelatedImage(null)
      setVisualizationData(null)
      setResultShareId(null)
      resultShareIdRef.current = null
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
      resultShareIdRef.current = null
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [openResultFromShare])

  const handleShareCreated = useCallback((shareId) => {
    if (!shareId || shareId === resultShareIdRef.current) return
    setResultShareId(shareId)
    resultShareIdRef.current = shareId
    resultCacheRef.current.set(shareId, { fortunes, pixelatedImage, visualizationData })
    if (window.history.state?.view !== 'result' || window.history.state?.shareId !== shareId) {
      window.history.pushState({ view: 'result', shareId }, '')
    }
  }, [fortunes, pixelatedImage, visualizationData])

  const startFortune = useCallback(async () => {
    if (activeTab !== TAB.FORTUNE || phase !== PHASE.IDLE || isProcessingRef.current) return
    isProcessingRef.current = true
    try {
      const captureResult = await captureAndAnnotate(videoRef.current)
      if (!captureResult) { console.error('Failed to capture face image'); return }

      const originalImage = captureResult.originalDataUrl || null
      const measurements = captureResult.measurements || null
      const vizData = captureResult.visualizationData || null

      setPhase(PHASE.ANALYZING)

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
      setFortunes(multiModelFortunes)
      setPhase(PHASE.RESULT)
    } catch (err) {
      console.error('Error in fortune telling:', err)
      setPhase(PHASE.IDLE)
    } finally {
      isProcessingRef.current = false
    }
  }, [activeTab, phase])

  useEffect(() => {
    function handleKeyDown(e) {
      if (activeTab !== TAB.FORTUNE) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (phase === PHASE.IDLE) startFortune()
        else if (phase === PHASE.RESULT) dismissResult()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTab, phase, startFortune, dismissResult])

  return (
    <div className="h-screen w-screen overflow-hidden select-none flex flex-col" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Header */}
      <div
        className="relative z-50 shrink-0 px-4 sm:px-5 py-2.5"
        style={{
          backgroundColor: 'rgba(245,244,240,0.92)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Brand: Superlinear AI logo + 相面 */}
          <div className="flex items-center gap-2.5 shrink-0">
            <img
              src="/assets/superlinear-ai-logo.png"
              alt="Superlinear AI"
              style={{ height: '22px', width: 'auto', opacity: 0.9 }}
            />
            <div className="w-px h-4 shrink-0" style={{ backgroundColor: 'var(--border-light)' }} />
            <span className="font-calligraphy text-xl leading-none" style={{ color: 'var(--text-primary)' }}>相面</span>
          </div>
          <AppTabs activeTab={activeTab} onChange={setActiveTab} className="shrink-0" />
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {activeTab === TAB.FORTUNE ? (
          phase === PHASE.RESULT && fortunes ? (
            <div className="absolute inset-0">
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
            </div>
          ) : (
            <div className="h-full overflow-y-auto flex flex-col items-center px-4 pt-4 pb-4 gap-3">
              {/* Camera card */}
              <div
                className="relative w-full shrink-0 rounded-2xl overflow-hidden"
                style={{
                  maxWidth: '360px',
                  aspectRatio: '3/4',
                  border: '1px solid var(--border)',
                  boxShadow: '0 2px 16px rgba(28,26,22,0.07)',
                }}
              >
                <CameraView videoRef={videoRef} canvasRef={canvasRef} />
                <AnimatePresence mode="wait">
                  {phase === PHASE.ANALYZING && <AnalyzingOverlay key="analyzing" />}
                </AnimatePresence>
              </div>

              {/* Status + features + button */}
              <AnimatePresence mode="wait">
                {phase === PHASE.IDLE && (
                  <IdleOverlay key="idle" faceCount={faceCount} isReady={isReady} error={error} onStart={startFortune} />
                )}
              </AnimatePresence>
            </div>
          )
        ) : activeTab === TAB.GUIDE ? (
          <Suspense fallback={<div className="h-full w-full flex items-center justify-center font-hei-cn text-sm animate-pulse-soft" style={{ color: 'var(--text-muted)' }}>加载指南中…</div>}>
            <FaceReadingGuidePage />
          </Suspense>
        ) : (
          <Suspense fallback={<div className="h-full w-full flex items-center justify-center font-hei-cn text-sm animate-pulse-soft" style={{ color: 'var(--text-muted)' }}>加载页面中…</div>}>
            <InsidePage />
          </Suspense>
        )}
      </div>

      {/* Footer */}
      <div
        className="shrink-0 px-4 sm:px-5 py-2.5 sm:py-3"
        style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-base)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <p className="font-hei-cn text-[11px] sm:text-xs" style={{ color: 'var(--text-muted)' }}>
            分析过程仅取一帧画面，分析后立即销毁，不保存原始图像。分享页仅使用像素化匿名图像。
          </p>
          <p className="font-hei-cn text-[11px] sm:text-xs shrink-0" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
            {BRAND.name} v{BRAND.version}
          </p>
        </div>
      </div>
    </div>
  )
}
