import { describe, it, expect, vi } from 'vitest'
import { captureVideoFrame } from './capture-face'

describe('captureVideoFrame', () => {
  it('should return null for null/undefined video element', () => {
    expect(captureVideoFrame(null)).toBeNull()
    expect(captureVideoFrame(undefined)).toBeNull()
  })

  it('should return null when video is not ready', () => {
    const mockVideo = { readyState: 0, videoWidth: 0, videoHeight: 0 }
    expect(captureVideoFrame(mockVideo)).toBeNull()
  })

  it('should return null when video has no dimensions', () => {
    const mockVideo = { readyState: 4, videoWidth: 0, videoHeight: 0 }
    expect(captureVideoFrame(mockVideo)).toBeNull()
  })

  it('should capture frame from ready video', () => {
    const mockCtx = {
      drawImage: vi.fn(),
    }

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockCtx),
      toDataURL: vi.fn(() => 'data:image/jpeg;base64,abc123'),
    }

    // Mock document.createElement to return our mock canvas
    const origCreateElement = document.createElement
    document.createElement = vi.fn((tag) => {
      if (tag === 'canvas') return mockCanvas
      return origCreateElement.call(document, tag)
    })

    const mockVideo = {
      readyState: 4,
      videoWidth: 1280,
      videoHeight: 720,
    }

    const result = captureVideoFrame(mockVideo)

    expect(result).toBe('data:image/jpeg;base64,abc123')
    expect(mockCanvas.width).toBe(640) // maxWidth default
    expect(mockCanvas.height).toBe(360) // proportional
    expect(mockCtx.drawImage).toHaveBeenCalledWith(mockVideo, 0, 0, 640, 360)
    expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.85)

    // Restore
    document.createElement = origCreateElement
  })

  it('should respect custom maxWidth option', () => {
    const mockCtx = { drawImage: vi.fn() }
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockCtx),
      toDataURL: vi.fn(() => 'data:image/jpeg;base64,xyz'),
    }

    const origCreateElement = document.createElement
    document.createElement = vi.fn((tag) => {
      if (tag === 'canvas') return mockCanvas
      return origCreateElement.call(document, tag)
    })

    const mockVideo = {
      readyState: 4,
      videoWidth: 1920,
      videoHeight: 1080,
    }

    captureVideoFrame(mockVideo, { maxWidth: 320 })

    expect(mockCanvas.width).toBe(320)
    expect(mockCanvas.height).toBe(180) // proportional scaling

    document.createElement = origCreateElement
  })
})
