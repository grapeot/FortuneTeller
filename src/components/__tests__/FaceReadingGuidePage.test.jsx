import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FaceReadingGuidePage from '../FaceReadingGuidePage'

describe('FaceReadingGuidePage', () => {
  it('renders guide title and chapter index entries', () => {
    render(<FaceReadingGuidePage />)
    expect(screen.getAllByText('相面学指南').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/第一章：相学核心逻辑与识人体系/).length).toBeGreaterThan(0)
  })

  it('allows clicking chapter index', () => {
    render(<FaceReadingGuidePage />)
    const chapterBtn = screen.getByRole('button', { name: /第一章：相学核心逻辑与识人体系/ })
    fireEvent.click(chapterBtn)
    expect(chapterBtn).toBeInTheDocument()
  })

  it('opens mobile chapter menu from hamburger button', () => {
    render(<FaceReadingGuidePage />)
    fireEvent.click(screen.getByRole('button', { name: '打开章节目录' }))
    expect(screen.getByRole('dialog', { name: '章节目录' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(screen.queryByRole('dialog', { name: '章节目录' })).not.toBeInTheDocument()
  })

  it('renders markdown emphasis as semantic elements', () => {
    const { container } = render(<FaceReadingGuidePage />)
    expect(container.querySelector('strong')).toBeInTheDocument()
  })
})
