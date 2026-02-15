import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AppTabs from '../AppTabs'

describe('AppTabs', () => {
  it('renders all tabs', () => {
    render(<AppTabs activeTab="fortune" onChange={() => {}} />)
    expect(screen.getByText('相面')).toBeInTheDocument()
    expect(screen.getByText('相面学指南')).toBeInTheDocument()
    expect(screen.getByText('内部实现')).toBeInTheDocument()
  })

  it('calls onChange when clicking tab', () => {
    const onChange = vi.fn()
    render(<AppTabs activeTab="fortune" onChange={onChange} />)
    fireEvent.click(screen.getByText('相面学指南'))
    expect(onChange).toHaveBeenCalledWith('guide')
  })
})
