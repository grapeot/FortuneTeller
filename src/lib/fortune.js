/**
 * Fortune Engine - 三池随机抽取拼接
 *
 * Pool A: 面相观察句 (face readings)
 * Pool B: 职业解读句 (career readings)
 * Pool C: 马年祝福句 (horse year blessings)
 *
 * Combination count: 8 × 15 × 10 = 1200 unique results
 */

export const faceReadings = [
  '天庭饱满，眉宇开阔——',
  '眼神坚毅，颧骨挺拔——',
  '面相方正，下巴有力——',
  '印堂发亮，双目有神——',
  '鼻梁高挺，唇形方正——',
  '耳垂厚实，额头宽广——',
  '眉骨突出，目光深远——',
  '两颧饱满，神采奕奕——',
]

export const careerReadings = [
  '必是L65以上的Principal！这骨相，Connect评分想低都难。',
  '一看就是Senior级别，写的Design Doc能当教材。',
  'L63体质，代码一把过，On-call从不翻车。',
  '面相至少L67，CVP见了都得客气三分。',
  'IC路线天花板体质！Staff Engineer转世。',
  '这是刚拿到Exceed Expectations的面相。',
  '天生SDE命格，架构图信手拈来。',
  'PM面相无疑——用户需求，一眼看穿。',
  'Manager气场拉满，1:1的时候下属都不敢摸鱼。',
  'Data Scientist骨相，P-value想不显著都难。',
  'System Design面试官看了都想给Strong Hire。',
  '写Code Review Comments的气质，一针见血型。',
  '天生Oncall体质——但所有alert都是false positive。',
  'Sprint Planning的时候，Story Points估得又准又快。',
  '这面相做Applied Scientist，paper产量翻倍。',
]

export const blessings = [
  '马到成功，新Feature一次上线！',
  '一马当先，Performance Review拿S！',
  '万马奔腾，Pipeline全绿！',
  '马年大吉，Bug全消，代码质量UP！',
  '龙马精神，Deploy从不Rollback！',
  '新年PR秒Approve，零Comments！',
  '马年运势：prod零incident，pager从不响！',
  '祝您马年 git push --force 都不出事！',
  '新春快乐，Tech Debt今年全还清！',
  '马年offer满天飞，TC翻倍不是梦！',
]

// Track recently used combos to avoid short-term repeats
const usedCombos = new Set()
const MAX_TRACKED = 100

/**
 * Generate a random fortune by picking one item from each pool.
 * Avoids repeating the same combination within the last MAX_TRACKED calls.
 *
 * @returns {{ face: string, career: string, blessing: string, full: string }}
 */
export function generateFortune() {
  let a, b, c, key

  do {
    a = Math.floor(Math.random() * faceReadings.length)
    b = Math.floor(Math.random() * careerReadings.length)
    c = Math.floor(Math.random() * blessings.length)
    key = `${a}-${b}-${c}`
  } while (usedCombos.has(key) && usedCombos.size < MAX_TRACKED)

  usedCombos.add(key)
  // Evict oldest entries when we hit the limit
  if (usedCombos.size > MAX_TRACKED) {
    const first = usedCombos.values().next().value
    usedCombos.delete(first)
  }

  return {
    face: faceReadings[a],
    career: careerReadings[b],
    blessing: blessings[c],
    full: `${faceReadings[a]}${careerReadings[b]}${blessings[c]}`,
  }
}

/**
 * Reset the used combos tracker (useful for testing).
 */
export function resetUsedCombos() {
  usedCombos.clear()
}

/**
 * Get the total number of possible unique combinations.
 */
export function getTotalCombinations() {
  return faceReadings.length * careerReadings.length * blessings.length
}
