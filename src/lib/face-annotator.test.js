import { describe, it, expect } from 'vitest'
import { formatMeasurements, buildVisualizationData } from './face-annotator'

describe('formatMeasurements', () => {
  it('should return empty string for null input', () => {
    expect(formatMeasurements(null)).toBe('')
  })

  it('should return empty string for undefined input', () => {
    expect(formatMeasurements(undefined)).toBe('')
  })

  it('should format measurements as readable text', () => {
    const measurements = {
      三停比例: { 上庭: 33, 中庭: 34, 下庭: 33 },
      脸型: '椭圆形',
      面部宽高比: 0.72,
      印堂宽度: '开阔',
      田宅宫: '宽广',
      颧骨: '平和',
      鼻翼宽度: '饱满',
      下巴: '适中',
    }

    const result = formatMeasurements(measurements)

    expect(result).toContain('面部测量数据')
    expect(result).toContain('上庭33%')
    expect(result).toContain('中庭34%')
    expect(result).toContain('下庭33%')
    expect(result).toContain('椭圆形')
    expect(result).toContain('0.72')
    expect(result).toContain('开阔')
    expect(result).toContain('宽广')
    expect(result).toContain('饱满')
    expect(result).toContain('适中')
  })

  it('should include all required measurement fields', () => {
    const measurements = {
      三停比例: { 上庭: 30, 中庭: 40, 下庭: 30 },
      脸型: '方形',
      面部宽高比: 0.88,
      印堂宽度: '较窄',
      田宅宫: '较窄',
      颧骨: '突出',
      鼻翼宽度: '适中',
      下巴: '方阔',
    }

    const result = formatMeasurements(measurements)
    const lines = result.split('\n')

    // Should have 9 lines: header + 8 data lines
    expect(lines.length).toBe(9)
    expect(lines[0]).toContain('面部测量数据')
  })
})

describe('buildVisualizationData', () => {
  function makeSyntheticFaceLandmarks() {
    const points = []
    const cx = 0.5
    const cy = 0.5
    const rx = 0.2
    const ry = 0.3
    for (let i = 0; i < 478; i += 1) {
      const t = (i / 478) * Math.PI * 2
      points.push({
        x: cx + Math.cos(t) * rx,
        y: cy + Math.sin(t) * ry,
      })
    }
    return points
  }

  it('keeps a face-like aspect ratio after normalization', () => {
    const landmarks = makeSyntheticFaceLandmarks()
    const visualization = buildVisualizationData(landmarks, { three_parts: [0.33, 0.34, 0.33] })

    expect(visualization.aspect_ratio).toBeGreaterThan(0.55)
    expect(visualization.aspect_ratio).toBeLessThan(0.85)
    expect(visualization.aspect_ratio).toBeCloseTo(2 / 3, 1)
  })

  it('normalizes points into [0,1] range and preserves spread', () => {
    const landmarks = makeSyntheticFaceLandmarks()
    const visualization = buildVisualizationData(landmarks, null)
    const xs = visualization.landmarks.map(([x]) => x)
    const ys = visualization.landmarks.map(([, y]) => y)

    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...xs)).toBeLessThanOrEqual(1)
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...ys)).toBeLessThanOrEqual(1)

    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.75)
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(0.75)
  })
})
