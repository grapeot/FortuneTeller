import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FaceReadingGuidePage from '../FaceReadingGuidePage'

describe('FaceReadingGuidePage', () => {
  it('renders guide title and chapter index entries', () => {
    render(<FaceReadingGuidePage />)
    expect(screen.getByText('相面学指南')).toBeInTheDocument()
    expect(screen.getAllByText(/第一章：相学核心逻辑与识人体系/).length).toBeGreaterThan(0)
  })

  it('allows clicking chapter index', () => {
    render(<FaceReadingGuidePage />)
    const chapterBtn = screen.getByRole('button', { name: /第一章：相学核心逻辑与识人体系/ })
    fireEvent.click(chapterBtn)
    expect(chapterBtn).toBeInTheDocument()
  })

  it('shows mobile chapter select', () => {
    render(<FaceReadingGuidePage />)
    const select = screen.getByLabelText('章节跳转')
    expect(select).toBeInTheDocument()
    fireEvent.change(select, { target: { value: select.querySelector('option')?.value } })
  })

  it('renders markdown emphasis as semantic elements', () => {
    const { container } = render(<FaceReadingGuidePage />)
    expect(container.querySelector('strong')).toBeInTheDocument()
  })
})
