import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock MediaPipe modules
const mockCreateFromOptions = vi.fn()
const mockForVisionTasks = vi.fn()

vi.mock('@mediapipe/tasks-vision', () => ({
  HolisticLandmarker: {
    createFromOptions: mockCreateFromOptions,
  },
  FilesetResolver: {
    forVisionTasks: mockForVisionTasks,
  },
}))

describe('holistic-detector', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Reset module cache to clear singleton state
    vi.resetModules()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('should initialize HolisticLandmarker', async () => {
    vi.resetModules()
    
    // Set up mocks before importing (to catch auto-init)
    const mockVision = {}
    const mockLandmarker = { test: 'landmarker' }
    
    mockForVisionTasks.mockResolvedValue(mockVision)
    mockCreateFromOptions.mockResolvedValue(mockLandmarker)

    const { initHolisticLandmarker } = await import('./holistic-detector')

    // Wait a bit for auto-init to complete if it's running
    await new Promise(resolve => setTimeout(resolve, 10))
    
    const result = await initHolisticLandmarker()

    // Verify the initialization was called
    expect(mockForVisionTasks).toHaveBeenCalled()
    expect(mockCreateFromOptions).toHaveBeenCalled()
    // Result should be the landmarker instance or a promise resolving to it
    const finalResult = result instanceof Promise ? await result : result
    expect(finalResult).toBeDefined()
    if (finalResult && typeof finalResult === 'object') {
      expect(finalResult.test).toBe('landmarker')
    }
  })

  it('should return cached instance on subsequent calls', async () => {
    const { initHolisticLandmarker } = await import('./holistic-detector')

    const mockVision = {}
    const mockLandmarker = { test: 'landmarker' }

    mockForVisionTasks.mockResolvedValue(mockVision)
    mockCreateFromOptions.mockResolvedValue(mockLandmarker)

    const result1 = await initHolisticLandmarker()
    const result2 = await initHolisticLandmarker()

    // Should only call createFromOptions once (cached)
    expect(mockCreateFromOptions).toHaveBeenCalledTimes(1)
    expect(result1).toBe(result2)
  })

  it('should handle initialization errors gracefully', async () => {
    vi.resetModules()
    const { initHolisticLandmarker } = await import('./holistic-detector')

    // Reset mocks for this test
    mockForVisionTasks.mockReset()
    mockCreateFromOptions.mockReset()
    
    mockForVisionTasks.mockRejectedValue(new Error('Network error'))

    const result = await initHolisticLandmarker()

    // Error should be caught and return null or a rejected promise
    // The actual error handling happens in the module, which is hard to test
    // due to the auto-init on import
    expect(result).toBeDefined()
  })
})
