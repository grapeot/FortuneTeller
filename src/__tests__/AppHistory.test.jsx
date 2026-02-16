import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { useEffect } from 'react'
import App from '../App'

vi.mock('../hooks/useFaceDetection', () => ({
  useFaceDetection: () => ({ isReady: true, faceCount: 1, error: null }),
}))

vi.mock('../hooks/useHolisticDetection', () => ({
  useHolisticDetection: () => {},
}))

vi.mock('../lib/face-annotator', () => ({
  captureAndAnnotate: vi.fn().mockResolvedValue({
    originalDataUrl: 'data:image/jpeg;base64,abc',
    measurements: {},
    visualizationData: null,
  }),
}))

vi.mock('../lib/ai-fortune', () => ({
  generateAIFortune: vi.fn().mockResolvedValue({
    gemini: null,
    grok: { face: 'face', career: 'career', blessing: 'blessing' },
  }),
}))

vi.mock('../lib/config', () => ({
  TIMING: { analyzeDuration: 0 },
  BRAND: { name: 'TestBrand' },
}))

vi.mock('../components/CameraView', () => ({
  default: () => <div>camera</div>,
}))

vi.mock('../components/IdleOverlay', () => ({
  default: () => <div>idle</div>,
}))

vi.mock('../components/AnalyzingOverlay', () => ({
  default: () => <div>analyzing</div>,
}))

vi.mock('../components/AppTabs', () => ({
  default: () => <div>tabs</div>,
}))

vi.mock('../components/ResultOverlay', () => ({
  default: ({ onDismiss, onShareCreated }) => {
    useEffect(() => {
      if (onShareCreated) onShareCreated('abc123')
    }, [onShareCreated])
    return <button onClick={onDismiss}>dismiss result</button>
  },
}))

describe('App history state navigation', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        fortunes: { gemini: null, grok: { face: 'f', career: 'c', blessing: 'b' } },
        pixelated_image: null,
        visualization_data: null,
      }),
    }))
  })

  it('pushes result state and can restore overlay from popstate', async () => {
    render(<App />)

    fireEvent.click(screen.getByText('开始相面'))

    await waitFor(() => {
      expect(window.history.state).toEqual({ view: 'result', shareId: 'abc123' })
      expect(screen.getByText('dismiss result')).toBeInTheDocument()
    })

    await act(async () => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { view: 'idle' } }))
    })

    await waitFor(() => {
      expect(screen.queryByText('dismiss result')).not.toBeInTheDocument()
    })

    await act(async () => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { view: 'result', shareId: 'abc123' } }))
    })

    await waitFor(() => {
      expect(screen.getByText('dismiss result')).toBeInTheDocument()
    })
  })
})
