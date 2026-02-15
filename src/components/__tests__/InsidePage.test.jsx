import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import InsidePage from '../InsidePage'

describe('InsidePage', () => {
  it('renders required external links', () => {
    render(<InsidePage />)

    expect(screen.getByRole('link', { name: /基于 AI Builder Space 构建/ })).toHaveAttribute(
      'href',
      'https://space.ai-builders.com/',
    )
    expect(screen.getByRole('link', { name: /开源代码（GitHub）/ })).toHaveAttribute(
      'href',
      'https://github.com/grapeot/FortuneTeller.git',
    )
    expect(screen.getByRole('link', { name: /三小时构建完整 App 课程/ })).toHaveAttribute(
      'href',
      'https://ai-builders.com/',
    )
  })
})
