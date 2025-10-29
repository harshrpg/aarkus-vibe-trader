/**
 * Simplified Component tests for Vibe Trader UI components
 * Tests core functionality without external dependencies
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import '@testing-library/jest-dom'

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  TrendingDown: () => <div data-testid="trending-down-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  Newspaper: () => <div data-testid="newspaper-icon" />,
  Target: () => <div data-testid="target-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronUp: () => <div data-testid="chevron-up-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  Minus: () => <div data-testid="minus-icon" />,
  DollarSign: () => <div data-testid="dollar-sign-icon" />,
  Info: () => <div data-testid="info-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  EyeOff: () => <div data-testid="eye-off-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  Layers: () => <div data-testid="layers-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  Wifi: () => <div data-testid="wifi-icon" />,
  WifiOff: () => <div data-testid="wifi-off-icon" />
}))

// Mock the chart bridge
jest.mock('../../lib/tv/bridge', () => ({
  ready: Promise.resolve(),
  setSymbol: jest.fn().mockResolvedValue(undefined),
  applyIndicator: jest.fn().mockResolvedValue({}),
  applyMultipleIndicators: jest.fn().mockResolvedValue([]),
  drawPattern: jest.fn().mockResolvedValue({}),
  drawMultiplePatterns: jest.fn().mockResolvedValue([]),
  drawPriceTarget: jest.fn().mockResolvedValue({}),
  drawMultiplePriceTargets: jest.fn().mockResolvedValue([]),
  drawSupportResistanceLevel: jest.fn().mockResolvedValue({}),
  clearAllIndicators: jest.fn().mockResolvedValue(undefined),
  clearAllPatterns: jest.fn().mockResolvedValue(undefined),
  clearAllPriceTargets: jest.fn().mockResolvedValue(undefined),
  getAppliedIndicators: jest.fn().mockReturnValue([]),
  getAppliedPatterns: jest.fn().mockReturnValue([]),
  getAppliedPriceTargets: jest.fn().mockReturnValue([]),
  removeIndicator: jest.fn().mockResolvedValue(undefined),
  removePattern: jest.fn().mockResolvedValue(undefined),
  removePriceTarget: jest.fn().mockResolvedValue(undefined)
}))

import { VibeTraderChat } from '../../components/vibe-trader-chat'
import { VibeTraderLoading, VibeTraderError } from '../../components/vibe-trader-loading-states'

describe('VibeTraderChat Component', () => {
  const mockOnAnalysisRequest = jest.fn()

  beforeEach(() => {
    mockOnAnalysisRequest.mockClear()
  })

  it('renders chat interface with basic elements', () => {
    render(<VibeTraderChat onAnalysisRequest={mockOnAnalysisRequest} />)

    expect(screen.getByText('Vibe Trader Analysis')).toBeInTheDocument()
    expect(screen.getByText('Get AI-powered technical and fundamental analysis for any trading symbol')).toBeInTheDocument()
  })

  it('has symbol and query input fields', () => {
    render(<VibeTraderChat onAnalysisRequest={mockOnAnalysisRequest} />)

    const symbolInput = screen.getByLabelText('Trading Symbol')
    const queryInput = screen.getByLabelText('Analysis Request')
    
    expect(symbolInput).toBeInTheDocument()
    expect(queryInput).toBeInTheDocument()
    expect(symbolInput).toHaveAttribute('placeholder', 'Enter symbol (e.g., AAPL, BTCUSD)')
  })

  it('has analyze button', () => {
    render(<VibeTraderChat onAnalysisRequest={mockOnAnalysisRequest} />)

    const submitButton = screen.getByRole('button', { name: /analyze symbol/i })
    expect(submitButton).toBeInTheDocument()
  })

  it('shows validation error for empty symbol', () => {
    render(<VibeTraderChat onAnalysisRequest={mockOnAnalysisRequest} />)

    const queryInput = screen.getByLabelText('Analysis Request')
    const submitButton = screen.getByRole('button', { name: /analyze symbol/i })

    fireEvent.change(queryInput, { target: { value: 'Test analysis' } })
    fireEvent.click(submitButton)

    expect(screen.getByText('Please enter a trading symbol')).toBeInTheDocument()
    expect(mockOnAnalysisRequest).not.toHaveBeenCalled()
  })

  it('shows validation error for empty query', () => {
    render(<VibeTraderChat onAnalysisRequest={mockOnAnalysisRequest} />)

    const symbolInput = screen.getByLabelText('Trading Symbol')
    const submitButton = screen.getByRole('button', { name: /analyze symbol/i })

    fireEvent.change(symbolInput, { target: { value: 'AAPL' } })
    fireEvent.click(submitButton)

    expect(screen.getByText('Please enter your analysis request')).toBeInTheDocument()
    expect(mockOnAnalysisRequest).not.toHaveBeenCalled()
  })

  it('submits valid form data', () => {
    render(<VibeTraderChat onAnalysisRequest={mockOnAnalysisRequest} />)

    const symbolInput = screen.getByLabelText('Trading Symbol')
    const queryInput = screen.getByLabelText('Analysis Request')
    const submitButton = screen.getByRole('button', { name: /analyze symbol/i })

    fireEvent.change(symbolInput, { target: { value: 'AAPL' } })
    fireEvent.change(queryInput, { target: { value: 'Technical analysis please' } })
    fireEvent.click(submitButton)

    expect(mockOnAnalysisRequest).toHaveBeenCalledWith('AAPL', 'Technical analysis please')
  })

  it('shows loading state when analysis is in progress', () => {
    render(<VibeTraderChat onAnalysisRequest={mockOnAnalysisRequest} isLoading={true} />)

    const submitButton = screen.getByRole('button', { name: /analyzing/i })
    expect(submitButton).toBeDisabled()
    expect(screen.getByText('Analyzing...')).toBeInTheDocument()
  })

  it('shows symbol suggestions when focused', () => {
    render(<VibeTraderChat onAnalysisRequest={mockOnAnalysisRequest} />)

    const symbolInput = screen.getByLabelText('Trading Symbol')
    fireEvent.focus(symbolInput)

    // Should show popular symbols
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument()
    expect(screen.getByText('Tesla Inc.')).toBeInTheDocument()
  })

  it('displays analysis templates', () => {
    render(<VibeTraderChat onAnalysisRequest={mockOnAnalysisRequest} />)

    expect(screen.getByText('Quick Analysis Templates')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Analyze SYMBOL for swing trading opportunities/i })).toBeInTheDocument()
  })
})

describe('VibeTraderLoading Component', () => {
  const mockOnTimeout = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    mockOnTimeout.mockClear()
    mockOnCancel.mockClear()
  })

  it('renders loading interface with symbol', () => {
    render(
      <VibeTraderLoading 
        stage="technical" 
        progress={50} 
        symbol="AAPL"
        onTimeout={mockOnTimeout}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Analyzing AAPL')).toBeInTheDocument()
    expect(screen.getByText('AI-powered technical and fundamental analysis in progress')).toBeInTheDocument()
  })

  it('shows progress information', () => {
    render(
      <VibeTraderLoading 
        stage="technical" 
        progress={50} 
        symbol="AAPL"
      />
    )

    expect(screen.getByText('Analysis Progress')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('Technical Analysis')).toBeInTheDocument()
  })

  it('displays different stages correctly', () => {
    const { rerender } = render(
      <VibeTraderLoading stage="initializing" progress={10} symbol="AAPL" />
    )

    expect(screen.getByText('Initializing')).toBeInTheDocument()
    expect(screen.getByText('Setting up analysis environment')).toBeInTheDocument()

    rerender(<VibeTraderLoading stage="fundamental" progress={70} symbol="AAPL" />)

    expect(screen.getByText('Fundamental Research')).toBeInTheDocument()
    expect(screen.getByText('Gathering market news and company data')).toBeInTheDocument()
  })

  it('shows cancel button when provided', () => {
    render(
      <VibeTraderLoading 
        stage="technical" 
        progress={25} 
        symbol="AAPL"
        onCancel={mockOnCancel}
      />
    )

    const cancelButton = screen.getByRole('button', { name: /cancel analysis/i })
    expect(cancelButton).toBeInTheDocument()

    fireEvent.click(cancelButton)
    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('shows loading skeletons', () => {
    render(<VibeTraderLoading stage="technical" progress={25} symbol="AAPL" />)

    expect(screen.getByText('Technical Analysis')).toBeInTheDocument()
    expect(screen.getByText('Fundamental Research')).toBeInTheDocument()
  })
})

describe('VibeTraderError Component', () => {
  const mockOnRetry = jest.fn()
  const mockOnGoBack = jest.fn()

  beforeEach(() => {
    mockOnRetry.mockClear()
    mockOnGoBack.mockClear()
  })

  it('renders error interface with message', () => {
    const error = {
      type: 'INVALID_SYMBOL' as const,
      message: 'The symbol "INVALID" is not recognized',
      recoverable: true,
      suggestedAction: 'Try using a valid symbol like AAPL'
    }

    render(
      <VibeTraderError 
        error={error}
        symbol="INVALID"
        onRetry={mockOnRetry}
        onGoBack={mockOnGoBack}
      />
    )

    expect(screen.getByText('Invalid Trading Symbol')).toBeInTheDocument()
    expect(screen.getByText('Failed to analyze INVALID')).toBeInTheDocument()
    expect(screen.getByText('The symbol "INVALID" is not recognized')).toBeInTheDocument()
  })

  it('shows different error types', () => {
    const dataError = {
      type: 'DATA_UNAVAILABLE' as const,
      message: 'Market data is currently unavailable',
      recoverable: true
    }

    const { rerender } = render(<VibeTraderError error={dataError} />)
    expect(screen.getByText('Market Data Unavailable')).toBeInTheDocument()

    const timeoutError = {
      type: 'ANALYSIS_TIMEOUT' as const,
      message: 'Analysis timed out after 30 seconds',
      recoverable: true
    }

    rerender(<VibeTraderError error={timeoutError} />)
    expect(screen.getByText('Analysis Timeout')).toBeInTheDocument()
  })

  it('provides suggested actions', () => {
    const error = {
      type: 'INVALID_SYMBOL' as const,
      message: 'Invalid symbol',
      recoverable: true
    }

    render(<VibeTraderError error={error} />)

    expect(screen.getByText('What you can do')).toBeInTheDocument()
    expect(screen.getByText('Check the symbol spelling and try again')).toBeInTheDocument()
  })

  it('shows retry button for recoverable errors', () => {
    const error = {
      type: 'NETWORK_ERROR' as const,
      message: 'Network connection failed',
      recoverable: true
    }

    render(
      <VibeTraderError 
        error={error}
        onRetry={mockOnRetry}
        onGoBack={mockOnGoBack}
      />
    )

    const retryButton = screen.getByRole('button', { name: /try again/i })
    expect(retryButton).toBeInTheDocument()

    fireEvent.click(retryButton)
    expect(mockOnRetry).toHaveBeenCalled()
  })

  it('shows go back button', () => {
    const error = {
      type: 'CHART_ERROR' as const,
      message: 'Chart failed to load',
      recoverable: false
    }

    render(
      <VibeTraderError 
        error={error}
        onGoBack={mockOnGoBack}
      />
    )

    const goBackButton = screen.getByRole('button', { name: /go back/i })
    expect(goBackButton).toBeInTheDocument()

    fireEvent.click(goBackButton)
    expect(mockOnGoBack).toHaveBeenCalled()
  })

  it('displays error code', () => {
    const error = {
      type: 'SEARCH_ERROR' as const,
      message: 'Search service unavailable',
      recoverable: true
    }

    render(<VibeTraderError error={error} />)
    expect(screen.getByText('Error Code: SEARCH_ERROR')).toBeInTheDocument()
  })

  it('handles non-recoverable errors', () => {
    const error = {
      type: 'UNKNOWN' as const,
      message: 'An unexpected error occurred',
      recoverable: false
    }

    render(<VibeTraderError error={error} onRetry={mockOnRetry} />)

    // Should not show retry button for non-recoverable errors
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
  })
})

describe('Component Integration', () => {
  it('components can be rendered together without conflicts', () => {
    const mockOnAnalysisRequest = jest.fn()
    const mockOnRetry = jest.fn()

    const error = {
      type: 'NETWORK_ERROR' as const,
      message: 'Network error',
      recoverable: true
    }

    render(
      <div>
        <VibeTraderChat onAnalysisRequest={mockOnAnalysisRequest} />
        <VibeTraderLoading stage="technical" progress={50} symbol="AAPL" />
        <VibeTraderError error={error} onRetry={mockOnRetry} />
      </div>
    )

    expect(screen.getByText('Vibe Trader Analysis')).toBeInTheDocument()
    expect(screen.getByText('Analyzing AAPL')).toBeInTheDocument()
    expect(screen.getByText('Network Connection Error')).toBeInTheDocument()
  })

  it('maintains consistent styling and behavior', () => {
    const mockOnAnalysisRequest = jest.fn()

    render(<VibeTraderChat onAnalysisRequest={mockOnAnalysisRequest} />)

    // Check for consistent button styling
    const analyzeButton = screen.getByRole('button', { name: /analyze symbol/i })
    expect(analyzeButton).toHaveClass('w-full') // Full width button

    // Check for consistent input styling
    const symbolInput = screen.getByLabelText('Trading Symbol')
    expect(symbolInput).toHaveAttribute('type', 'text')
  })
})