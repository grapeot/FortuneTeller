import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateFortune,
  resetUsedCombos,
  getTotalCombinations,
  faceReadings,
  careerReadings,
  blessings,
} from './fortune.js'

describe('Fortune Engine', () => {
  beforeEach(() => {
    resetUsedCombos()
  })

  it('should return an object with face, career, blessing, and full fields', () => {
    const result = generateFortune()
    expect(result).toHaveProperty('face')
    expect(result).toHaveProperty('career')
    expect(result).toHaveProperty('blessing')
    expect(result).toHaveProperty('full')
  })

  it('full should be the concatenation of face + career + blessing', () => {
    const result = generateFortune()
    expect(result.full).toBe(`${result.face}${result.career}${result.blessing}`)
  })

  it('face reading should come from the faceReadings pool', () => {
    const result = generateFortune()
    expect(faceReadings).toContain(result.face)
  })

  it('career reading should come from the careerReadings pool', () => {
    const result = generateFortune()
    expect(careerReadings).toContain(result.career)
  })

  it('blessing should come from the blessings pool', () => {
    const result = generateFortune()
    expect(blessings).toContain(result.blessing)
  })

  it('should generate different results on subsequent calls (no immediate repeat)', () => {
    const results = new Set()
    // Generate 20 fortunes and check we get multiple unique ones
    for (let i = 0; i < 20; i++) {
      results.add(generateFortune().full)
    }
    // With 1200 combinations and anti-repeat logic, 20 calls should give at least 15 unique
    expect(results.size).toBeGreaterThanOrEqual(15)
  })

  it('should have the expected pool sizes', () => {
    expect(faceReadings.length).toBe(8)
    expect(careerReadings.length).toBe(15)
    expect(blessings.length).toBe(10)
  })

  it('getTotalCombinations should return 1200', () => {
    expect(getTotalCombinations()).toBe(1200)
  })

  it('all face readings should end with ——', () => {
    for (const reading of faceReadings) {
      expect(reading).toMatch(/——$/)
    }
  })

  it('all blessings should end with ！', () => {
    for (const blessing of blessings) {
      expect(blessing).toMatch(/！$/)
    }
  })

  it('should not contain 龙年 in any pool (should be 马年)', () => {
    const allText = [
      ...faceReadings,
      ...careerReadings,
      ...blessings,
    ].join('')
    expect(allText).not.toContain('龙年')
  })

  it('should handle generating 100+ fortunes without crashing', () => {
    for (let i = 0; i < 150; i++) {
      const result = generateFortune()
      expect(result.full).toBeTruthy()
    }
  })
})
