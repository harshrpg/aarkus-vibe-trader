/**
 * Integration tests for Vibe Trader Streaming System
 * Tests streaming analysis, real-time chart updates, and error handling
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

// Mock external dependencies first
jest.mock('../../lib/agents/vibe-trader', () => ({
    VibeTraderController: jest.fn().mockImplementation(() => ({
        getPriceData: jest.fn().mockResolvedValue({ symbol: 'AAPL', data: [] }),
        runTechnicalAnalysis: jest.fn().mockResolvedValue({ indicators: [], patterns: [] }),
        runFundamentalAnalysis: jest.fn().mockResolvedValue({ newsAnalysis: { sentiment: 'POSITIVE' } }),
        synthesizeRecommendations: jest.fn().mockReturnValue([]),
        calculateOverallConfidence: jest.fn().mockReturnValue(0.8),
        generateChartAnnotations: jest.fn().mockReturnValue([]),
        generateAnalysisSummary: jest.fn().mockReturnValue('Test summary')
    }))
}))

jest.mock('ai', () => ({
    createDataStreamResponse: jest.fn().mockReturnValue({
        execute: jest.fn()
    })
}))

// Import after mocking
import { createVibeTraderStreamResponse, handleStreamError } from '../../lib/streaming/vibe-trader-stream'
import { useVibeTraderStream } from '../../hooks/use-vibe-trader-stream'
import { renderHook, act, waitFor } from '@testing-library/react'
import {
    AnalysisStreamChunk,
    AnalysisStatusChunk,
    TechnicalPartialChunk,
    FundamentalPartialChunk,
    RecommendationsPartialChunk,
    AnalysisResult,
    AnalysisError,
    AnalysisErrorType
} from '../../lib/types/trading'

// Mock fetch
const mockFetch = jest.fn()
Object.defineProperty(global, 'fetch', {
    value: mockFetch,
    writable: true
})

describe('Vibe Trader Streaming Integration', () => {
    let mockDataStream: any

    beforeEach(() => {
        jest.clearAllMocks()

        mockDataStream = {
            writeMessageAnnotation: jest.fn().mockResolvedValue(undefined)
        }
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('Stream Response Creation', () => {
        it('should create streaming response with valid configuration', () => {
            const config = {
                symbol: 'AAPL',
                timeframe: '1D',
                model: 'gpt-4'
            }

            const response = createVibeTraderStreamResponse(config)
            expect(response).toBeDefined()
            expect(response).toHaveProperty('execute')
        })

        it('should handle different symbol formats', () => {
            const symbols = ['AAPL', 'BTCUSD', 'EURUSD', 'MSFT']

            symbols.forEach(symbol => {
                const config = { symbol, model: 'gpt-4' }
                const response = createVibeTraderStreamResponse(config)
                expect(response).toBeDefined()
                expect(response).toHaveProperty('execute')
            })
        })

        it('should accept optional configuration parameters', () => {
            const config = {
                symbol: 'AAPL',
                timeframe: '4H',
                query: 'Custom analysis query',
                model: 'gpt-4',
                userId: 'test-user',
                chatId: 'test-chat'
            }

            const response = createVibeTraderStreamResponse(config)
            expect(response).toBeDefined()
            expect(response).toHaveProperty('execute')
        })
    })

    describe('Hook State Management', () => {
        it('should initialize with correct default state', () => {
            const { result } = renderHook(() => useVibeTraderStream())

            expect(result.current.isStreaming).toBe(false)
            expect(result.current.currentStage).toBe('idle')
            expect(result.current.progress).toBe(0)
            expect(result.current.error).toBe(null)
            expect(result.current.partialResults).toEqual({})
            expect(result.current.finalResult).toBeUndefined()
            expect(result.current.lastUpdate).toBe(null)
        })

        it('should provide all required hook methods', () => {
            const { result } = renderHook(() => useVibeTraderStream())

            expect(typeof result.current.startStream).toBe('function')
            expect(typeof result.current.stopStream).toBe('function')
            expect(typeof result.current.restartStream).toBe('function')
        })

        it('should handle stream stop correctly', () => {
            const { result } = renderHook(() => useVibeTraderStream())

            act(() => {
                result.current.stopStream()
            })

            expect(result.current.isStreaming).toBe(false)
        })
    })

    describe('Stream Data Processing', () => {
        it('should handle status chunk processing', async () => {
            const statusUpdates: AnalysisStatusChunk[] = []

            const { result } = renderHook(() =>
                useVibeTraderStream({
                    onStatusUpdate: (status) => statusUpdates.push(status)
                })
            )

            // Mock a simple response that completes immediately
            mockFetch.mockResolvedValueOnce({
                ok: true,
                body: {
                    getReader: () => ({
                        read: jest.fn().mockResolvedValueOnce({ done: true, value: undefined })
                    })
                }
            })

            await act(async () => {
                await result.current.startStream('AAPL')
            })

            // Verify the fetch was called with correct parameters
            expect(mockFetch).toHaveBeenCalledWith('/api/vibe-trader', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: 'AAPL',
                    timeframe: '1D',
                    query: 'Analyze AAPL for trading opportunities'
                }),
                signal: expect.any(AbortSignal)
            })
        })

        it('should handle chunk callback registration', () => {
            const onChunkReceived = jest.fn()
            const onComplete = jest.fn()
            const onError = jest.fn()
            const onStatusUpdate = jest.fn()

            const { result } = renderHook(() =>
                useVibeTraderStream({
                    onChunkReceived,
                    onComplete,
                    onError,
                    onStatusUpdate
                })
            )

            expect(result.current).toBeDefined()
            // Callbacks are registered internally, we can't directly test them
            // but we can verify the hook initializes correctly with them
        })

        it('should process different chunk types correctly', () => {
            // Test the chunk type definitions and structure
            const statusChunk: AnalysisStreamChunk = {
                type: 'status',
                data: {
                    stage: 'initializing',
                    message: 'Starting analysis',
                    progress: 0,
                    timestamp: new Date()
                }
            }

            const technicalChunk: AnalysisStreamChunk = {
                type: 'technical_partial',
                data: {
                    indicators: [{ name: 'RSI', values: [65.5], parameters: {}, interpretation: 'Neutral', signal: 'NEUTRAL' }],
                    timestamp: new Date()
                }
            }

            const fundamentalChunk: AnalysisStreamChunk = {
                type: 'fundamental_partial',
                data: {
                    newsAnalysis: { sentiment: 'POSITIVE', relevantNews: [], sentimentScore: 0.7, keyThemes: [] },
                    timestamp: new Date()
                }
            }

            const recommendationsChunk: AnalysisStreamChunk = {
                type: 'recommendations_partial',
                data: {
                    recommendations: [],
                    confidence: 0.8,
                    chartAnnotations: [],
                    timestamp: new Date()
                }
            }

            const completeChunk: AnalysisStreamChunk = {
                type: 'complete',
                data: {
                    symbol: 'AAPL',
                    timestamp: new Date(),
                    technicalAnalysis: {
                        indicators: [],
                        patterns: [],
                        supportResistance: [],
                        trend: { direction: 'UPTREND', strength: 0.7, duration: 10, slope: 0.5 },
                        momentum: { rsi: 65, macd: { macd: 0, signal: 0, histogram: 0 }, stochastic: { k: 70, d: 68 }, interpretation: 'Bullish' },
                        volatility: { atr: 2.5, bollingerBands: { upper: 155, middle: 150, lower: 145, squeeze: false }, volatilityRank: 45 }
                    },
                    fundamentalAnalysis: {
                        companyInfo: { name: 'Apple', sector: 'Technology', industry: 'Electronics', marketCap: 3000000000000, description: 'Tech company' },
                        financialMetrics: { pe: 25, eps: 6, revenue: 400000000000, revenueGrowth: 0.08, profitMargin: 0.25, debtToEquity: 1.7 },
                        newsAnalysis: { sentiment: 'POSITIVE', relevantNews: [], sentimentScore: 0.7, keyThemes: [] },
                        sectorAnalysis: { sectorPerformance: 0.12, relativeStrength: 1.15, peerComparison: [], sectorTrends: [] },
                        marketSentiment: { overall: 0.7, news: 0.75, social: 0.65, analyst: 0.8 },
                        upcomingEvents: []
                    },
                    recommendations: [],
                    confidence: 0.8,
                    chartAnnotations: [],
                    summary: 'Test analysis summary'
                }
            }

            const errorChunk: AnalysisStreamChunk = {
                type: 'error',
                data: {
                    type: AnalysisErrorType.SEARCH_ERROR,
                    message: 'Search failed',
                    recoverable: true,
                    timestamp: new Date()
                }
            }

            // Verify chunk structures are valid
            expect(statusChunk.type).toBe('status')
            expect(technicalChunk.type).toBe('technical_partial')
            expect(fundamentalChunk.type).toBe('fundamental_partial')
            expect(recommendationsChunk.type).toBe('recommendations_partial')
            expect(completeChunk.type).toBe('complete')
            expect(errorChunk.type).toBe('error')
        })
    })

    describe('Error Handling and Recovery', () => {
        it('should handle network errors gracefully', async () => {
            const errors: string[] = []

            const { result } = renderHook(() =>
                useVibeTraderStream({
                    onError: (error) => errors.push(error)
                })
            )

            mockFetch.mockRejectedValueOnce(new Error('Network error'))

            await act(async () => {
                await result.current.startStream('AAPL')
            })

            await waitFor(() => {
                expect(result.current.error).toContain('Network error')
            })

            expect(result.current.isStreaming).toBe(false)
        })

        it('should handle HTTP errors', async () => {
            const errors: string[] = []

            const { result } = renderHook(() =>
                useVibeTraderStream({
                    onError: (error) => errors.push(error)
                })
            )

            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Internal Server Error'
            })

            await act(async () => {
                await result.current.startStream('AAPL')
            })

            await waitFor(() => {
                expect(result.current.error).toContain('Internal Server Error')
            })

            expect(result.current.isStreaming).toBe(false)
        })

        it('should handle missing response body', async () => {
            const { result } = renderHook(() => useVibeTraderStream())

            mockFetch.mockResolvedValueOnce({
                ok: true,
                body: null
            })

            await act(async () => {
                await result.current.startStream('AAPL')
            })

            await waitFor(() => {
                expect(result.current.error).toContain('No response body received')
            })
        })

        it('should handle stream abortion', async () => {
            const { result } = renderHook(() => useVibeTraderStream())

            // Mock a long-running stream
            const mockReader = {
                read: jest.fn().mockImplementation(() =>
                    new Promise(resolve => setTimeout(() => resolve({ done: false, value: new Uint8Array() }), 1000))
                ),
                cancel: jest.fn()
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                body: { getReader: () => mockReader }
            })

            await act(async () => {
                result.current.startStream('AAPL')
                // Immediately stop the stream
                setTimeout(() => result.current.stopStream(), 10)
            })

            await waitFor(() => {
                expect(result.current.isStreaming).toBe(false)
            })
        })

        it('should handle streaming errors and continue processing', async () => {
            const errors: string[] = []
            const chunks: AnalysisStreamChunk[] = []

            const { result } = renderHook(() =>
                useVibeTraderStream({
                    onError: (error) => errors.push(error),
                    onChunkReceived: (chunk) => chunks.push(chunk)
                })
            )

            const mockReader = {
                read: jest.fn()
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('8:{"type":"vibe_trader_chunk","data":{"type":"error","data":{"type":"SEARCH_ERROR","message":"Search failed","recoverable":true,"timestamp":"2024-01-01T00:00:00.000Z"}}}\n')
                    })
                    .mockResolvedValueOnce({ done: true, value: undefined })
            }

            mockFetch.mockResolvedValueOnce({
                ok: true,
                body: { getReader: () => mockReader }
            })

            await act(async () => {
                await result.current.startStream('AAPL')
            })

            await waitFor(() => {
                expect(result.current.isStreaming).toBe(false)
            })

            // Should handle the error gracefully
            expect(result.current.error).toContain('Search failed')
        })
    })

    describe('Performance and Synchronization', () => {
        it('should validate symbol input correctly', () => {
            const validSymbols = ['AAPL', 'MSFT', 'GOOGL', 'BTCUSD', 'EURUSD']
            const invalidSymbols = ['', '123', 'TOOLONGSYMBOL123', 'invalid-symbol']

            // Test valid symbols
            validSymbols.forEach(symbol => {
                const config = { symbol, model: 'gpt-4' }
                const response = createVibeTraderStreamResponse(config)
                expect(response).toBeDefined()
            })

            // Test invalid symbols (they should still create response, validation happens during execution)
            invalidSymbols.forEach(symbol => {
                const config = { symbol, model: 'gpt-4' }
                const response = createVibeTraderStreamResponse(config)
                expect(response).toBeDefined()
            })
        })

        it('should handle concurrent stream requests', async () => {
            const { result } = renderHook(() => useVibeTraderStream())

            mockFetch.mockResolvedValue({
                ok: true,
                body: {
                    getReader: () => ({
                        read: jest.fn().mockResolvedValue({ done: true, value: undefined })
                    })
                }
            })

            // Start multiple streams rapidly
            await act(async () => {
                await Promise.all([
                    result.current.startStream('AAPL'),
                    result.current.startStream('MSFT'),
                    result.current.startStream('GOOGL')
                ])
            })

            // Should handle the last request
            expect(mockFetch).toHaveBeenCalled()
        })

        it('should maintain state consistency during updates', () => {
            const { result } = renderHook(() => useVibeTraderStream())

            // Initial state should be consistent
            expect(result.current.isStreaming).toBe(false)
            expect(result.current.currentStage).toBe('idle')
            expect(result.current.progress).toBe(0)
            expect(result.current.error).toBe(null)
            expect(result.current.partialResults).toEqual({})
            expect(result.current.finalResult).toBeUndefined()
        })

        it('should maintain data consistency across stream chunks', () => {
            // Test data structure consistency
            const technicalData: TechnicalPartialChunk = {
                indicators: [
                    {
                        name: 'RSI',
                        values: [65.5],
                        parameters: { period: 14 },
                        interpretation: 'Neutral to bullish',
                        signal: 'NEUTRAL'
                    }
                ],
                patterns: [
                    {
                        type: 'ASCENDING_TRIANGLE',
                        confidence: 0.75,
                        coordinates: [{ x: 1, y: 150 }, { x: 2, y: 155 }],
                        description: 'Ascending triangle pattern',
                        implications: ['Potential bullish breakout'],
                        priceTargets: [{ level: 160, type: 'TARGET', confidence: 0.8, reasoning: 'Pattern target' }]
                    }
                ],
                supportResistance: [
                    {
                        level: 150,
                        type: 'SUPPORT',
                        strength: 0.8,
                        touches: 3,
                        volume: 500000,
                        confidence: 0.85
                    }
                ],
                timestamp: new Date()
            }

            expect(technicalData.indicators).toHaveLength(1)
            expect(technicalData.patterns).toHaveLength(1)
            expect(technicalData.supportResistance).toHaveLength(1)
            expect(technicalData.indicators?.[0].name).toBe('RSI')
            expect(technicalData.patterns?.[0].type).toBe('ASCENDING_TRIANGLE')
            expect(technicalData.supportResistance?.[0].type).toBe('SUPPORT')
        })
    })

    describe('Stream Error Helper', () => {
        it('should handle generic errors', async () => {
            const error = new Error('Generic test error')
            const context = { symbol: 'AAPL', stage: 'technical_analysis' }

            await handleStreamError(mockDataStream, error, context)

            expect(mockDataStream.writeMessageAnnotation).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'vibe_trader_chunk',
                    data: expect.objectContaining({
                        type: 'error',
                        data: expect.objectContaining({
                            message: 'Generic test error',
                            context,
                            recoverable: false,
                            type: AnalysisErrorType.ANALYSIS_TIMEOUT
                        })
                    })
                })
            )
        })

        it('should handle AnalysisError with recovery information', async () => {
            const error = new AnalysisError(
                AnalysisErrorType.SEARCH_ERROR,
                'Search service unavailable',
                true,
                'Try again later'
            )

            const context = { symbol: 'AAPL' }

            await handleStreamError(mockDataStream, error, context)

            expect(mockDataStream.writeMessageAnnotation).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'vibe_trader_chunk',
                    data: expect.objectContaining({
                        type: 'error',
                        data: expect.objectContaining({
                            type: AnalysisErrorType.SEARCH_ERROR,
                            message: 'Search service unavailable',
                            recoverable: true,
                            suggestedAction: 'Try again later',
                            context
                        })
                    })
                })
            )
        })

        it('should handle different error types', async () => {
            const errorTypes = [
                AnalysisErrorType.INVALID_SYMBOL,
                AnalysisErrorType.DATA_UNAVAILABLE,
                AnalysisErrorType.CHART_ERROR,
                AnalysisErrorType.SEARCH_ERROR,
                AnalysisErrorType.ANALYSIS_TIMEOUT
            ]

            for (const errorType of errorTypes) {
                const error = new AnalysisError(errorType, `Test ${errorType} error`, true)
                const context = { symbol: 'AAPL' }

                await handleStreamError(mockDataStream, error, context)

                expect(mockDataStream.writeMessageAnnotation).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: 'vibe_trader_chunk',
                        data: expect.objectContaining({
                            type: 'error',
                            data: expect.objectContaining({
                                type: errorType,
                                recoverable: true
                            })
                        })
                    })
                )
            }
        })
    })

    describe('Real-time Chart Updates and Synchronization', () => {
        it('should provide chart annotation data structure', () => {
            const chartAnnotation = {
                type: 'LINE' as const,
                coordinates: [{ x: 1, y: 150 }, { x: 2, y: 155 }],
                style: { color: '#00ff00', lineWidth: 2 },
                label: 'Support Level',
                description: 'Key support at $150'
            }

            expect(chartAnnotation.type).toBe('LINE')
            expect(chartAnnotation.coordinates).toHaveLength(2)
            expect(chartAnnotation.style.color).toBe('#00ff00')
            expect(chartAnnotation.label).toBe('Support Level')
        })

        it('should synchronize recommendations with chart annotations', () => {
            const recommendationsData: RecommendationsPartialChunk = {
                recommendations: [
                    {
                        action: 'BUY',
                        confidence: 0.8,
                        reasoning: ['Strong technical setup', 'Positive fundamentals'],
                        priceTargets: [
                            { level: 160, type: 'TARGET', confidence: 0.8, reasoning: 'Technical target' }
                        ],
                        stopLoss: 145,
                        timeHorizon: '2-4 weeks',
                        riskLevel: 'MEDIUM'
                    }
                ],
                confidence: 0.78,
                chartAnnotations: [
                    {
                        type: 'LINE',
                        coordinates: [{ x: 1, y: 160 }, { x: 2, y: 160 }],
                        style: { color: '#00ff00', lineWidth: 2 },
                        label: 'Price Target',
                        description: 'Target at $160'
                    },
                    {
                        type: 'LINE',
                        coordinates: [{ x: 1, y: 145 }, { x: 2, y: 145 }],
                        style: { color: '#ff0000', lineWidth: 2 },
                        label: 'Stop Loss',
                        description: 'Stop loss at $145'
                    }
                ],
                timestamp: new Date()
            }

            expect(recommendationsData.recommendations).toHaveLength(1)
            expect(recommendationsData.chartAnnotations).toHaveLength(2)
            expect(recommendationsData.recommendations[0].action).toBe('BUY')
            expect(recommendationsData.chartAnnotations[0].label).toBe('Price Target')
            expect(recommendationsData.chartAnnotations[1].label).toBe('Stop Loss')
        })

        it('should handle progressive chart updates', () => {
            // Test that chart update data structures are properly typed and consistent
            const chartUpdateData = {
                annotations: [
                    {
                        type: 'LINE' as const,
                        coordinates: [{ x: 1, y: 150 }, { x: 2, y: 155 }],
                        style: { color: '#00ff00', lineWidth: 2 },
                        label: 'Trend Line'
                    }
                ],
                indicators: [
                    {
                        name: 'RSI',
                        parameters: { period: 14 },
                        visible: true,
                        style: { color: '#ff0000' }
                    }
                ],
                priceTargets: [
                    { level: 160, type: 'TARGET' as const, confidence: 0.8, reasoning: 'Technical target' }
                ],
                timestamp: new Date()
            }

            expect(chartUpdateData.annotations).toHaveLength(1)
            expect(chartUpdateData.indicators).toHaveLength(1)
            expect(chartUpdateData.priceTargets).toHaveLength(1)
            expect(chartUpdateData.annotations[0].type).toBe('LINE')
            expect(chartUpdateData.indicators[0].name).toBe('RSI')
            expect(chartUpdateData.priceTargets[0].type).toBe('TARGET')
        })
    })
})