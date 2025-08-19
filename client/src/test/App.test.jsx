/**
 * App Component Tests
 * Tests for the main React application
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

// Mock the port config to avoid network calls in tests
vi.mock('../utils/portConfig.js', () => ({
  default: {
    initialize: vi.fn(),
    getConfig: vi.fn(() => ({
      server: 3000,
      client: 5173,
      websocket: 3000
    }))
  }
}))

// Mock WebSocket hook
vi.mock('../hooks/useWebSocket', () => ({
  default: () => ({
    isConnected: false,
    messages: []
  })
}))

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    expect(screen.getByText('ManitoDebug')).toBeInTheDocument()
  })

  it('displays the main application title', () => {
    render(<App />)
    const title = screen.getByText('ManitoDebug')
    expect(title).toBeInTheDocument()
  })

  it('shows ready to analyze state when no scan results', () => {
    render(<App />)
    const readyText = screen.getByText('Ready to Analyze')
    expect(readyText).toBeInTheDocument()
  })
})
