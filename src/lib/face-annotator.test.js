import { describe, it, expect } from 'vitest'
import { formatMeasurements } from './face-annotator'

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
