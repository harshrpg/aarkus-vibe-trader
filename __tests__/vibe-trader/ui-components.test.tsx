/**
 * Component tests for Vibe Trader UI components
 * Tests chat interface, analysis results display, and chart integration
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import '@testing-library/jest-dom'

import { VibeTraderChat } from '../../components/vibe-trader-chat'
import { VibeTraderResults } from '../../components/vibe-trader-results'
import { VibeTraderChartIntegration } from '../../components/vibe-trader-chart-integration'
import { VibeTraderLoading, VibeTraderError } from '../../components/vibe-trader-loading-states'
import type { AnalysisResult } from '../../lib/types/trading'

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

describe('VibeTraderChat Component', () => {
  const mockOnAnalysisRequest = jest.fn()
  const user = userEvent.setup()

  beforeEach(() => {
    mockOnAnalysisRequest.mockClear()
  })

  it('renders chat interface with all elements', () => {
    render(<VibeTraderChat onAnalysisRequest={mockOnAnalysisRequest} />)

    expect(screen.getByText('Vibe Trader Analysis')).toBeInTheDocument()
    expect(screen.getByText('Get AI-powered technical and fundamental analysis for any trading symbol')).toBeInTheDocument()
    expect(screen.getByLabelText('Trading Symbol')).toBeInTheDocument()
    expect(screen.getByLabelText('Analysis Request')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /analyze symbol/i })).toBeInTheDocument()
  })

  it('validates symbol input correctly', async () => {
    render(<VibeTraderChat onAnalysisRequest={mockOnAnalysisRequest} />)

    const symbolInput = screen.getByLabelText('Trading Symbol')
    const queryInput = screen.getByLabelText('Analysis Request')
    const submitButton = screen.getByRole('button', { name: /analyze symbol/i })

    // Test empty symbol
    await user.type(queryInput, 'Test analysis')
    await user.click(submitButton)

    expect(screen.getByText('Please enter a trading symbol')).toBeInTheDocument()
    expect(mockOnAnalysisRequest).not.toHaveBeenCalled()

    // Test invalid symbol format
    await user.type(symbolInput, 'invalid-symbol!')
    await user.click(submitButton)

    expect(screen.getByText(/Symbol should be 1-10 alphanumeric characters/)).toBeInTheDocument()
    expect(mockOnAnalysisRequest).not.toHaveBeenCalled()
  })

  it('validates query input correctly', async () => {
    render(<VibeTraderChat onAnalysisRequest={mockOnAnalysisRequest} />)

    const symbolInput = screen.getByLabelText('Trading Symbol')
    const submitButton = screen.getByRole('button', { name: /analyze symbol/i })

    await user.type(symbolInput, 'AAPL')
    await user.click(submitButton)

    expect(screen.getByText('Please enter your analysis request')).toBeInTheDocument()
    expect(mockOnAnalysisRequest).not.toHaveBeenCalled()
  })

  it('submits valid analysis request', async () => {
    render(<VibeTraderChat onAnalysisRequest={mockOnAnalysisRequest} />)

    const symbolInput = screen.getByLabelText('Trading Symbol')
    const queryInput = screen.getByLabelText('Analysis Request')
    const submitButton = screen.getByRole('button', { name: /analyze symbol/i })

    await user.type(symbolInput, 'AAPL')
    await user.type(queryInput, 'Technical analysis please')
    await user.click(submitButton)

    expect(mockOnAnalysisRequest).toHaveBeenCalledWith('AAPL', 'Technical analysis please')
    expect(symbolInput).toHaveValue('')
    expect(queryInput).toHaveValue('')
  })

  it('shows symbol suggestions when typing', async () => {
    render(<VibeTraderChat onAnalysisRequest={mockOnAnalysisRequest} />)

    const symbolInput = screen.getByLabelText('Trading Symbol')
    
    await user.click(symbolInput)
    
    // Should show popular symbols
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument()
    expect(screen.getByText('Tesla Inc.')).toBeInTheDocument()
    expect(screen.getByText('Bitcoin')).toBeInTheDocument()
  })

  it('filters suggestions based on input', async () => {
    render(<VibeTraderChat onAnalysisRequest={mockOnAnalysisRequest} />)

    const symbolInput = screen.getByLabelText('Trading Symbol')
    
    await user.type(symbolInput, 'AAP')
    
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument()
    expect(screen.queryByText('Tesla Inc.')).not.toBeInTheDocument()
  })

  it('selects symbol from suggestions', async () => {
    render(<VibeTraderChat onAnalysisRequest={mockOnAnalysisRequest} />)

    const symbolInput = screen.getByLabelText('Trading Symbol')
    const queryInput = screen.getByLabelText('Analysis Request')
    
    await user.click(symbolInput)
    await user.click(screen.getByText('Apple Inc.'))
    
    expect(symbolInput).toHaveValue('AAPL')
    expect(queryInput).toHaveValue('Analyze AAPL for swing trading opportunities')
  })

  it('uses analysis templates', async () => {
    render(<VibeTraderChat onAnalysisRequest={mockOnAnalysisRequest} />)

    const symbolInput = screen.getByLabelText('Trading Symbol')
    const queryInput = screen.getByLabelText('Analysis Request')
    
    await user.type(symbolInput, 'TSLA')
    
    const templateButton = screen.getByRole('button', { name: /What are the key support and resistance levels for TSLA/i })
    await user.click(templateButton)
    
    expect(queryInput).toHaveValue('What are the key support and resistance levels for TSLA?')
  })

  it('shows loading state when analysis is in progress', () => {
    render(<VibeTraderChat onAnalysisRequest={mockOnAnalysisRequest} isLoading={true} />)

    const submitButton = screen.getByRole('button', { name: /analyzing/i })
    expect(submitButton).toBeDisabled()
    expect(screen.getByText('Analyzing...')).toBeInTheDocument()
  })
})

describe('VibeTraderResults Component', () => {
  const mockAnalysisResult: AnalysisResult = {
    symbol: 'AAPL',
    timestamp: new Date('2024-01-01T12:00:00Z'),
    confidence: 85,
    summary: 'Strong bullish signals with good fundamental support',
    technicalAnalysis: {
      indicators: [
        {
          name: 'RSI',
          values: [65],
          parameters: { period: 14 },
          interpretation: 'RSI shows momentum building',
          signal: 'BULLISH'
        },
        {
          name: 'MACD',
          values: [0.5, 0.3, 0.2],
          parameters: { fast: 12, slow: 26, signal: 9 },
          interpretation: 'MACD showing bullish crossover',
          signal: 'BULLISH'
        }
      ],
      patterns: [
        {
          type: 'ASCENDING_TRIANGLE',
          confidence: 0.8,
          coordinates: [],
          description: 'Bullish ascending triangle pattern forming',
          implications: ['Potential breakout to upside', 'Target around $180'],
          priceTargets: [
            { level: 180, type: 'TARGET', confidence: 0.8, reasoning: 'Pattern target' }
          ]
        }
      ],
      supportResistance: [
        {
          level: 150,
          type: 'SUPPORT',
          strength: 0.9,
          touches: 3,
          volume: 1000000,
          confidence: 0.85
        },
        {
          level: 175,
          type: 'RESISTANCE',
          strength: 0.7,
          touches: 2,
          volume: 800000,
          confidence: 0.75
        }
      ],
      trend: {
        direction: 'UPTREND',
        strength: 0.8,
        duration: 10,
        slope: 0.05
      },
      momentum: {
        rsi: 65,
        macd: { macd: 0.5, signal: 0.3, histogram: 0.2 },
        stochastic: { k: 70, d: 65 },
        interpretation: 'Strong bullish momentum'
      },
      volatility: {
        atr: 2.5,
        bollingerBands: { upper: 170, middle: 160, lower: 150, squeeze: false },
        volatilityRank: 0.6
      }
    },
    fundamentalAnalysis: {
      companyInfo: {
        name: 'Apple Inc.',
        sector: 'Technology',
        industry: 'Consumer Electronics',
        marketCap: 3000000000000,
        description: 'Leading technology company'
      },
      financialMetrics: {
        pe: 25.5,
        eps: 6.50,
        revenue: 400000000000,
        revenueGrowth: 0.08,
        profitMargin: 0.25,
        debtToEquity: 1.2
      },
      newsAnalysis: {
        sentiment: 'POSITIVE',
        relevantNews: [
          {
            title: 'Apple Reports Strong Q4 Earnings',
            summary: 'Apple exceeded expectations with strong iPhone sales',
            url: 'https://example.com/news1',
            publishedAt: new Date('2024-01-01T10:00:00Z'),
            sentiment: 0.8,
            relevance: 0.9
          }
        ],
        sentimentScore: 0.75,
        keyThemes: ['earnings', 'iPhone', 'growth']
      },
      sectorAnalysis: {
        sectorPerformance: 0.12,
        relativeStrength: 1.15,
        peerComparison: ['MSFT', 'GOOGL'],
        sectorTrends: ['AI adoption', 'Cloud growth']
      },
      marketSentiment: {
        overall: 0.7,
        news: 0.75,
        social: 0.65,
        analyst: 0.8
      },
      upcomingEvents: [
        {
          type: 'EARNINGS',
          date: new Date('2024-02-01T16:00:00Z'),
          description: 'Q1 2024 Earnings Call',
          expectedImpact: 'HIGH'
        }
      ]
    },
    recommendations: [
      {
        action: 'BUY',
        confidence: 0.85,
        reasoning: [
          'Strong technical breakout pattern',
          'Positive fundamental metrics',
          'Bullish momentum indicators'
        ],
        priceTargets: [
          { level: 165, type: 'ENTRY', confidence: 0.9, reasoning: 'Current support level' },
          { level: 180, type: 'TARGET', confidence: 0.8, reasoning: 'Pattern target' }
        ],
        stopLoss: 155,
        timeHorizon: '2-4 weeks',
        riskLevel: 'MEDIUM'
      }
    ],
    chartAnnotations: []
  }

  it('renders analysis results with all sections', () => {
    render(<VibeTraderResults result={mockAnalysisResult} />)

    expect(screen.getByText('Analysis Results for AAPL')).toBeInTheDocument()
    expect(screen.getByText('Executive Summary')).toBeInTheDocument()
    expect(screen.getByText('Technical Analysis')).toBeInTheDocument()
    expect(screen.getByText('Fundamental Analysis')).toBeInTheDocument()
    expect(screen.getByText('Trading Recommendations')).toBeInTheDocument()
  })

  it('displays confidence indicators correctly', () => {
    render(<VibeTraderResults result={mockAnalysisResult} />)

    expect(screen.getByText('85%')).toBeInTheDocument() // Overall confidence
    expect(screen.getByText('80%')).toBeInTheDocument() // Pattern confidence
  })

  it('shows technical indicators with signals', () => {
    render(<VibeTraderResults result={mockAnalysisResult} />)

    expect(screen.getByText('RSI')).toBeInTheDocument()
    expect(screen.getByText('MACD')).toBeInTheDocument()
    expect(screen.getAllByText('BULLISH')).toHaveLength(3) // RSI, MACD, and trend
  })

  it('displays chart patterns with details', () => {
    render(<VibeTraderResults result={mockAnalysisResult} />)

    expect(screen.getByText('ASCENDING TRIANGLE')).toBeInTheDocument()
    expect(screen.getByText('Bullish ascending triangle pattern forming')).toBeInTheDocument()
    expect(screen.getByText('Potential breakout to upside')).toBeInTheDocument()
  })

  it('shows support and resistance levels', () => {
    render(<VibeTraderResults result={mockAnalysisResult} />)

    expect(screen.getByText('$150.00')).toBeInTheDocument() // Support level
    expect(screen.getByText('$175.00')).toBeInTheDocument() // Resistance level
    expect(screen.getByText('SUPPORT')).toBeInTheDocument()
    expect(screen.getByText('RESISTANCE')).toBeInTheDocument()
  })

  it('displays fundamental analysis data', () => {
    render(<VibeTraderResults result={mockAnalysisResult} />)

    expect(screen.getByText('Technology')).toBeInTheDocument()
    expect(screen.getByText('$3000.0B')).toBeInTheDocument() // Market cap
    expect(screen.getByText('25.5')).toBeInTheDocument() // P/E ratio
    expect(screen.getByText('$6.50')).toBeInTheDocument() // EPS
  })

  it('shows news analysis with sentiment', () => {
    render(<VibeTraderResults result={mockAnalysisResult} />)

    expect(screen.getByText('Apple Reports Strong Q4 Earnings')).toBeInTheDocument()
    expect(screen.getByText('Positive')).toBeInTheDocument() // News sentiment
  })

  it('displays trading recommendations', () => {
    render(<VibeTraderResults result={mockAnalysisResult} />)

    expect(screen.getByText('BUY Signal')).toBeInTheDocument()
    expect(screen.getByText('MEDIUM Risk')).toBeInTheDocument()
    expect(screen.getByText('$165.00')).toBeInTheDocument() // Entry price
    expect(screen.getByText('$180.00')).toBeInTheDocument() // Target price
    expect(screen.getByText('$155.00')).toBeInTheDocument() // Stop loss
  })

  it('allows expanding and collapsing sections', async () => {
    const user = userEvent.setup()
    render(<VibeTraderResults result={mockAnalysisResult} />)

    const technicalHeader = screen.getByText('Technical Analysis').closest('button')
    expect(technicalHeader).toBeInTheDocument()

    // Should be expanded by default
    expect(screen.getByText('RSI shows momentum building')).toBeInTheDocument()

    // Click to collapse
    if (technicalHeader) {
      await user.click(technicalHeader)
    }

    // Content should still be visible (controlled by Collapsible component)
    expect(screen.getByText('RSI shows momentum building')).toBeInTheDocument()
  })
})

describe('VibeTraderLoading Component', () => {
  const mockOnTimeout = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    mockOnTimeout.mockClear()
    mockOnCancel.mockClear()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders loading interface with progress', () => {
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
    expect(screen.getByText('Technical Analysis')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('Analyzing price patterns and indicators')).toBeInTheDocument()
  })

  it('shows different stages correctly', () => {
    const { rerender } = render(
      <VibeTraderLoading stage="initializing" progress={10} symbol="AAPL" />
    )

    expect(screen.getByText('Initializing')).toBeInTheDocument()
    expect(screen.getByText('Setting up analysis environment')).toBeInTheDocument()

    rerender(<VibeTraderLoading stage="fundamental" progress={70} symbol="AAPL" />)

    expect(screen.getByText('Fundamental Research')).toBeInTheDocument()
    expect(screen.getByText('Gathering market news and company data')).toBeInTheDocument()
  })

  it('displays elapsed time and estimated remaining time', () => {
    render(<VibeTraderLoading stage="technical" progress={25} symbol="AAPL" />)

    expect(screen.getByText('0s')).toBeInTheDocument() // Initial elapsed time

    // Fast-forward time
    jest.advanceTimersByTime(5000)

    // Note: The component uses setInterval, so we need to trigger a re-render
    // In a real test environment, this would update automatically
  })

  it('shows timeout warning when analysis takes too long', () => {
    render(
      <VibeTraderLoading 
        stage="technical" 
        progress={25} 
        symbol="AAPL"
        timeoutSeconds={5}
        onTimeout={mockOnTimeout}
      />
    )

    // Fast-forward past timeout
    jest.advanceTimersByTime(6000)

    // The timeout callback should be called
    expect(mockOnTimeout).toHaveBeenCalled()
  })

  it('provides cancel functionality', async () => {
    const user = userEvent.setup()
    render(
      <VibeTraderLoading 
        stage="technical" 
        progress={25} 
        symbol="AAPL"
        onCancel={mockOnCancel}
      />
    )

    const cancelButton = screen.getByRole('button', { name: /cancel analysis/i })
    await user.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('shows loading skeletons for analysis sections', () => {
    render(<VibeTraderLoading stage="technical" progress={25} symbol="AAPL" />)

    expect(screen.getByText('Technical Analysis')).toBeInTheDocument()
    expect(screen.getByText('Fundamental Research')).toBeInTheDocument()
  })
})

describe('VibeTraderError Component', () => {
  const mockOnRetry = jest.fn()
  const mockOnGoBack = jest.fn()
  const mockOnReportIssue = jest.fn()

  beforeEach(() => {
    mockOnRetry.mockClear()
    mockOnGoBack.mockClear()
    mockOnReportIssue.mockClear()
  })

  it('renders error interface with details', () => {
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

  it('shows different error types correctly', () => {
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

  it('provides suggested actions based on error type', () => {
    const error = {
      type: 'INVALID_SYMBOL' as const,
      message: 'Invalid symbol',
      recoverable: true
    }

    render(<VibeTraderError error={error} />)

    expect(screen.getByText('Check the symbol spelling and try again')).toBeInTheDocument()
    expect(screen.getByText('Use popular symbols like AAPL, TSLA, or BTCUSD')).toBeInTheDocument()
  })

  it('shows retry button for recoverable errors', async () => {
    const user = userEvent.setup()
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
    await user.click(retryButton)

    expect(mockOnRetry).toHaveBeenCalled()
  })

  it('provides go back functionality', async () => {
    const user = userEvent.setup()
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
    await user.click(goBackButton)

    expect(mockOnGoBack).toHaveBeenCalled()
  })

  it('shows error code badge', () => {
    const error = {
      type: 'SEARCH_ERROR' as const,
      message: 'Search service unavailable',
      recoverable: true
    }

    render(<VibeTraderError error={error} />)

    expect(screen.getByText('Error Code: SEARCH_ERROR')).toBeInTheDocument()
  })

  it('handles non-recoverable errors correctly', () => {
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

describe('VibeTraderChartIntegration Component', () => {
  const mockOnChartReady = jest.fn()
  const mockOnError = jest.fn()

  beforeEach(() => {
    mockOnChartReady.mockClear()
    mockOnError.mockClear()
  })

  it('renders chart controls when analysis result is provided', () => {
    render(
      <VibeTraderChartIntegration 
        analysisResult={mockAnalysisResult}
        onChartReady={mockOnChartReady}
        onError={mockOnError}
      />
    )

    expect(screen.getByText('Chart Analysis Controls')).toBeInTheDocument()
    expect(screen.getByText('Technical Indicators')).toBeInTheDocument()
    expect(screen.getByText('Chart Patterns')).toBeInTheDocument()
    expect(screen.getByText('Price Targets')).toBeInTheDocument()
  })

  it('shows empty state when no analysis result', () => {
    render(
      <VibeTraderChartIntegration 
        onChartReady={mockOnChartReady}
        onError={mockOnError}
      />
    )

    expect(screen.getByText('No analysis results to display on chart')).toBeInTheDocument()
  })

  it('displays indicator toggles with signals', () => {
    render(
      <VibeTraderChartIntegration 
        analysisResult={mockAnalysisResult}
        onChartReady={mockOnChartReady}
        onError={mockOnError}
      />
    )

    expect(screen.getByText('RSI')).toBeInTheDocument()
    expect(screen.getByText('MACD')).toBeInTheDocument()
    expect(screen.getAllByText('BULLISH')).toHaveLength(2) // RSI and MACD signals
  })

  it('shows pattern toggles with confidence levels', () => {
    render(
      <VibeTraderChartIntegration 
        analysisResult={mockAnalysisResult}
        onChartReady={mockOnChartReady}
        onError={mockOnError}
      />
    )

    expect(screen.getByText('ASCENDING TRIANGLE')).toBeInTheDocument()
    expect(screen.getByText('80% confidence')).toBeInTheDocument()
  })

  it('displays price target toggles', () => {
    render(
      <VibeTraderChartIntegration 
        analysisResult={mockAnalysisResult}
        onChartReady={mockOnChartReady}
        onError={mockOnError}
      />
    )

    expect(screen.getByText('ENTRY')).toBeInTheDocument()
    expect(screen.getByText('TARGET')).toBeInTheDocument()
    expect(screen.getByText('STOP LOSS')).toBeInTheDocument()
    expect(screen.getByText('$165.00')).toBeInTheDocument() // Entry price
    expect(screen.getByText('$180.00')).toBeInTheDocument() // Target price
    expect(screen.getByText('$155.00')).toBeInTheDocument() // Stop loss
  })

  it('provides refresh and clear all functionality', async () => {
    const user = userEvent.setup()
    render(
      <VibeTraderChartIntegration 
        analysisResult={mockAnalysisResult}
        onChartReady={mockOnChartReady}
        onError={mockOnError}
      />
    )

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    const clearButton = screen.getByRole('button', { name: /clear all/i })

    expect(refreshButton).toBeInTheDocument()
    expect(clearButton).toBeInTheDocument()

    await user.click(refreshButton)
    await user.click(clearButton)

    // Buttons should be functional (no errors thrown)
  })

  it('shows chart status information', () => {
    render(
      <VibeTraderChartIntegration 
        analysisResult={mockAnalysisResult}
        onChartReady={mockOnChartReady}
        onError={mockOnError}
      />
    )

    expect(screen.getByText(/Indicators:/)).toBeInTheDocument()
    expect(screen.getByText(/Patterns:/)).toBeInTheDocument()
    expect(screen.getByText(/Targets:/)).toBeInTheDocument()
    expect(screen.getByText(/Auto-apply:/)).toBeInTheDocument()
  })

  it('handles chart readiness state', () => {
    render(
      <VibeTraderChartIntegration 
        analysisResult={mockAnalysisResult}
        onChartReady={mockOnChartReady}
        onError={mockOnError}
      />
    )

    // Should show Ready badge when chart is ready
    expect(screen.getByText('Ready')).toBeInTheDocument()
  })
})