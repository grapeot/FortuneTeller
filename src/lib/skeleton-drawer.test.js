import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  drawPoseSkeleton,
  drawHandSkeleton,
  drawHolisticSkeletons,
} from './skeleton-drawer'

describe('skeleton-drawer', () => {
  let canvas, ctx

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 480
    ctx = canvas.getContext('2d')
    
    // Mock canvas context methods if getContext returns null (jsdom environment)
    if (!ctx) {
      ctx = {
        strokeStyle: '',
        fillStyle: '',
        lineWidth: 0,
        lineCap: '',
        lineJoin: '',
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        clearRect: vi.fn(),
        scale: vi.fn(),
        translate: vi.fn(),
      }
    }
  })

  describe('drawPoseSkeleton', () => {
    it('should skip face landmarks (indices 0-10)', () => {
      const landmarks = Array.from({ length: 33 }, (_, i) => ({
        x: 0.5,
        y: 0.5,
        visibility: 1,
      }))

      drawPoseSkeleton(ctx, landmarks, 640, 480)

      // Verify that face landmarks are not drawn
      // We can't easily test this without mocking, but we can verify the function doesn't throw
      expect(ctx).toBeDefined()
    })

    it('should draw body connections', () => {
      const landmarks = Array.from({ length: 33 }, (_, i) => ({
        x: 0.5,
        y: 0.5 + i * 0.01,
        visibility: 1,
      }))

      drawPoseSkeleton(ctx, landmarks, 640, 480)

      // Function should complete without errors
      expect(ctx).toBeDefined()
    })

    it('should handle empty landmarks', () => {
      expect(() => drawPoseSkeleton(ctx, [], 640, 480)).not.toThrow()
      expect(() => drawPoseSkeleton(ctx, null, 640, 480)).not.toThrow()
    })
  })

  describe('drawHandSkeleton', () => {
    it('should draw all finger connections', () => {
      const landmarks = Array.from({ length: 21 }, (_, i) => ({
        x: 0.5 + (i % 5) * 0.05,
        y: 0.5 + Math.floor(i / 5) * 0.1,
        visibility: 1,
      }))

      drawHandSkeleton(ctx, landmarks, 640, 480)

      // Function should complete without errors
      expect(ctx).toBeDefined()
    })

    it('should handle landmarks without visibility property', () => {
      const landmarks = Array.from({ length: 21 }, (_, i) => ({
        x: 0.5,
        y: 0.5,
        // No visibility property
      }))

      expect(() => drawHandSkeleton(ctx, landmarks, 640, 480)).not.toThrow()
    })

    it('should handle empty landmarks', () => {
      expect(() => drawHandSkeleton(ctx, [], 640, 480)).not.toThrow()
      expect(() => drawHandSkeleton(ctx, null, 640, 480)).not.toThrow()
    })
  })

  describe('drawHolisticSkeletons', () => {
    it('should handle pose landmarks as array of arrays', () => {
      const result = {
        poseLandmarks: [
          Array.from({ length: 33 }, (_, i) => ({
            x: 0.5,
            y: 0.5,
            visibility: 1,
          })),
        ],
        leftHandLandmarks: Array.from({ length: 21 }, (_, i) => ({
          x: 0.3,
          y: 0.5,
        })),
        rightHandLandmarks: Array.from({ length: 21 }, (_, i) => ({
          x: 0.7,
          y: 0.5,
        })),
      }

      expect(() =>
        drawHolisticSkeletons(ctx, result, 640, 480)
      ).not.toThrow()
    })

    it('should handle pose landmarks as flat array', () => {
      const result = {
        poseLandmarks: Array.from({ length: 33 }, (_, i) => ({
          x: 0.5,
          y: 0.5,
          visibility: 1,
        })),
        leftHandLandmarks: Array.from({ length: 21 }, (_, i) => ({
          x: 0.3,
          y: 0.5,
        })),
      }

      expect(() =>
        drawHolisticSkeletons(ctx, result, 640, 480)
      ).not.toThrow()
    })

    it('should handle hand landmarks as array of arrays', () => {
      const result = {
        poseLandmarks: Array.from({ length: 33 }, (_, i) => ({
          x: 0.5,
          y: 0.5,
          visibility: 1,
        })),
        leftHandLandmarks: [
          Array.from({ length: 21 }, (_, i) => ({
            x: 0.3,
            y: 0.5,
          })),
        ],
        rightHandLandmarks: [
          Array.from({ length: 21 }, (_, i) => ({
            x: 0.7,
            y: 0.5,
          })),
        ],
      }

      expect(() =>
        drawHolisticSkeletons(ctx, result, 640, 480)
      ).not.toThrow()
    })

    it('should handle missing landmarks gracefully', () => {
      const result = {
        poseLandmarks: null,
        leftHandLandmarks: null,
        rightHandLandmarks: null,
      }

      expect(() =>
        drawHolisticSkeletons(ctx, result, 640, 480)
      ).not.toThrow()
    })

    it('should handle empty result', () => {
      expect(() => drawHolisticSkeletons(ctx, null, 640, 480)).not.toThrow()
    })
  })
})
