/**
 * Integration tests for Vibe Trader Analysis Controller
 * Tests complete analysis workflow, natural language query handling, and error recovery
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

// Mock all external dependencies before importing
jest.mock('../../lib/utils/registry', () => ({
    getModel: jest.fn().mockReturnValue({
        modelId: 'test-model',
        apiIdentifier: 'test'
    })
}))

jest.mock('ai', () => ({
    smoothStream: jest.fn().mockReturnValue({}),
    streamText: jest.fn()
}))

jest.mock('../../lib/agents/technical-analyzer', () => ({
    TechnicalAnalysisEngine: {
        analyzePrice: jest.fn().mockResolvedValue({
            indicators: [{
                name: 'RSI',
                values: [50],
                parameters: { period: 14 },
                interpretation: 'Neutral RSI',
                signal: 'NEUTRAL'
            }],
            patterns: [],
            supportResistance: [{
                level: 100,
                type: 'SUPPORT',
                strength: 0.7,
                touches: 3,
                volume: 1000000,
                confidence: 0.7
            }],
            trend: { direction: 'SIDEWAYS', strength: 0.5, duration: 1, slope: 0 },
            momentum: {
                rsi: 50,
                macd: { macd: 0, signal: 0, histogram: 0 },
                stochastic: { k: 50, d: 50 },
                interpretation: 'Neutral momentum'
            },
            volatility: {
                atr: 1,
                bollingerBands: { upper: 101, middle: 100, lower: 99, squeeze: false },
                volatilityRank: 0.5
            }
        }),
        generateSignals: jest.fn().mockReturnValue([{
            action: 'HOLD',
            confidence: 0.6,
            reasoning: ['Neutral market conditions'],
            priceTargets: [{
                level: 105,
                type: 'TARGET',
                confidence: 0.6,
                reasoning: 'Resistance level'
            }],
            stopLoss: 95,
            timeHorizon: 'Short-term',
            riskLevel: 'LOW'
        }])
    }
}))

jest.mock('../../lib/agents/market-researcher', () => ({
    MarketResearcher: jest.fn().mockImplementation(() => ({
        researchFundamentals: jest.fn().mockResolvedValue({
            symbol: 'TEST',
            companyInfo: 'Test company information',
            financialMetrics: 'Test financial metrics',
            newsAnalysis: {
                sentiment: 'NEUTRAL',
                relevantNews: [{
                    title: 'Test news',
                    summary: 'Test summary',
                    url: 'http://test.com',
                    publishedAt: new Date(),
                    sentiment: 0,
                    relevance: 0.5
                }],
                sentimentScore: 0,
                keyThemes: ['test', 'analysis']
            },
            sectorAnalysis: 'Test sector analysis',
            marketSentiment: 0,
            upcomingEvents: [{
                type: 'EARNINGS',
                date: new Date(),
                description: 'Test earnings',
                expectedImpact: 'MEDIUM'
            }],
            economicContext: {
                sectorPerformance: 'Test sector performance',
                economicIndicators: ['GDP', 'Inflation'],
                marketEvents: [],
                overallContext: 'Test economic context'
            }
        })
    }))
}))

import { VibeTraderController } from '../../lib/agents/vibe-trader'
import { NaturalLanguageQueryHandler } from '../../lib/agents/query-handler'
import { AnalysisCache } from '../../lib/agents/analysis-cache'
import {
    AnalysisResult,
    AnalysisContext,
    AnalysisParameters,
    AnalysisError,
    AnalysisErrorType,
    OHLCV
} from '../../lib/types/trading'

const createMockOHLCV = (count: number, basePrice: number = 100): OHLCV[] => {
    const data: OHLCV[] = []
    let currentPrice = basePrice

    for (let i = 0; i < count; i++) {
        const volatility = 0.02
        const change = (Math.random() - 0.5) * volatility * currentPrice
        const open = currentPrice
        const close = open + change
        const high = Math.max(open, close) + Math.random() * 0.01 * currentPrice
        const low = Math.min(open, close) - Math.random() * 0.01 * currentPrice
        const volume = 1000000 + Math.random() * 500000

        data.push({
            open,
            high,
            low,
            close,
            volume,
            timestamp: new Date(Date.now() + i * 24 * 60 * 60 * 1000)
        })

        currentPrice = close
    }

    return data
}

describe('Vibe Trader Analysis Controller - Integration Tests', () => {
    let controller: VibeTraderController
    const testModel = 'test-model'

    beforeEach(() => {
        controller = new VibeTraderController(testModel)
        jest.clearAllMocks()
    })

    afterEach(() => {
        if (controller && typeof controller.destroy === 'function') {
            controller.destroy()
        }
    })

    describe('Complete Analysis Workflow', () => {
        it('should perform complete analysis from symbol input to recommendations', async () => {
            const symbol = 'AAPL'
            const timeframe = '1D'
            const parameters: AnalysisParameters = {
                includePatterns: true,
                includeFundamentals: true,
                riskTolerance: 'MEDIUM'
            }

            const result = await controller.initiateAnalysis(symbol, timeframe, parameters)

            // Verify complete analysis result structure
            expect(result).toHaveProperty('symbol', symbol)
            expect(result).toHaveProperty('timestamp')
            expect(result).toHaveProperty('technicalAnalysis')
            expect(result).toHaveProperty('fundamentalAnalysis')
            expect(result).toHaveProperty('recommendations')
            expect(result).toHaveProperty('confidence')
            expect(result).toHaveProperty('chartAnnotations')
            expect(result).toHaveProperty('summary')

            // Verify technical analysis components
            expect(result.technicalAnalysis).toHaveProperty('indicators')
            expect(result.technicalAnalysis).toHaveProperty('patterns')
            expect(result.technicalAnalysis).toHaveProperty('supportResistance')
            expect(result.technicalAnalysis).toHaveProperty('trend')
            expect(result.technicalAnalysis).toHaveProperty('momentum')
            expect(result.technicalAnalysis).toHaveProperty('volatility')

            // Verify fundamental analysis components
            expect(result.fundamentalAnalysis).toHaveProperty('symbol')
            expect(result.fundamentalAnalysis).toHaveProperty('newsAnalysis')
            expect(result.fundamentalAnalysis).toHaveProperty('marketSentiment')

            // Verify recommendations
            expect(Array.isArray(result.recommendations)).toBe(true)
            if (result.recommendations.length > 0) {
                const recommendation = result.recommendations[0]
                expect(['BUY', 'SELL', 'HOLD']).toContain(recommendation.action)
                expect(recommendation.confidence).toBeGreaterThanOrEqual(0)
                expect(recommendation.confidence).toBeLessThanOrEqual(1)
                expect(Array.isArray(recommendation.reasoning)).toBe(true)
                expect(['LOW', 'MEDIUM', 'HIGH']).toContain(recommendation.riskLevel)
            }

            // Verify confidence score
            expect(result.confidence).toBeGreaterThanOrEqual(0)
            expect(result.confidence).toBeLessThanOrEqual(1)

            // Verify summary is generated
            expect(typeof result.summary).toBe('string')
            expect(result.summary.length).toBeGreaterThan(0)
        })

        it('should handle analysis with different parameters', async () => {
            const symbol = 'TSLA'

            // Test with minimal parameters
            const minimalResult = await controller.initiateAnalysis(symbol, '1H', {
                includePatterns: false,
                includeFundamentals: false
            })

            expect(minimalResult.symbol).toBe(symbol)
            expect(minimalResult.technicalAnalysis).toBeDefined()

            // Test with comprehensive parameters
            const comprehensiveResult = await controller.initiateAnalysis(symbol, '1D', {
                includePatterns: true,
                includeFundamentals: true,
                riskTolerance: 'HIGH'
            })

            expect(comprehensiveResult.symbol).toBe(symbol)
            expect(comprehensiveResult.fundamentalAnalysis).toBeDefined()
        })

        it('should cache analysis results and return cached data when appropriate', async () => {
            const symbol = 'BTCUSD'
            const timeframe = '4H'
            const parameters: AnalysisParameters = { riskTolerance: 'LOW' }

            // First analysis
            const firstResult = await controller.initiateAnalysis(symbol, timeframe, parameters)
            const firstTimestamp = firstResult.timestamp

            // Second analysis with same parameters (should be cached)
            const secondResult = await controller.initiateAnalysis(symbol, timeframe, parameters)

            // Should return the same cached result
            expect(secondResult.timestamp).toEqual(firstTimestamp)
            expect(secondResult.symbol).toBe(symbol)
        })

        it('should invalidate cache and perform fresh analysis when parameters change', async () => {
            const symbol = 'EURUSD'
            const timeframe = '1D'

            // First analysis
            const firstResult = await controller.initiateAnalysis(symbol, timeframe, {
                riskTolerance: 'LOW'
            })

            // Update analysis with different parameters
            const updatedResult = await controller.updateAnalysis(symbol, {
                riskTolerance: 'HIGH',
                includePatterns: true
            })

            // Should be different results
            expect(updatedResult.timestamp).not.toEqual(firstResult.timestamp)
            expect(updatedResult.symbol).toBe(symbol)
        })
    })

    describe('Natural Language Query Handling', () => {
        let analysisContext: AnalysisContext

        beforeEach(async () => {
            // Set up analysis context for query testing
            const symbol = 'AAPL'
            const result = await controller.initiateAnalysis(symbol)
            analysisContext = {
                symbol,
                timeframe: '1D',
                lastAnalysis: result,
                conversationHistory: []
            }
        })

        it('should process symbol request queries', async () => {
            const queries = [
                'analyze TSLA',
                'look at MSFT',
                'check GOOGL',
                'what about AMZN'
            ]

            for (const query of queries) {
                const response = await controller.processNaturalLanguageQuery(query)

                expect(response).toHaveProperty('answer')
                expect(response).toHaveProperty('followUpSuggestions')
                expect(response).toHaveProperty('requiresNewAnalysis')
                expect(response.requiresNewAnalysis).toBe(true)
                expect(response).toHaveProperty('suggestedSymbol')
                expect(typeof response.answer).toBe('string')
                expect(Array.isArray(response.followUpSuggestions)).toBe(true)
            }
        })

        it('should handle technical analysis queries', async () => {
            const technicalQueries = [
                'What is the RSI?',
                'Show me the MACD',
                'What are the support and resistance levels?',
                'What does the trend look like?'
            ]

            for (const query of technicalQueries) {
                const response = await controller.handleFollowUpQuery(query, analysisContext)

                expect(response).toHaveProperty('answer')
                expect(response).toHaveProperty('followUpSuggestions')
                expect(response).toHaveProperty('requiresNewAnalysis')
                expect(response.requiresNewAnalysis).toBe(false)
                expect(typeof response.answer).toBe('string')
                expect(response.answer.length).toBeGreaterThan(0)
                expect(Array.isArray(response.followUpSuggestions)).toBe(true)
            }
        })

        it('should handle recommendation queries', async () => {
            const recommendationQueries = [
                'Should I buy or sell?',
                'What are your price targets?',
                'What is the risk level?'
            ]

            for (const query of recommendationQueries) {
                const response = await controller.handleFollowUpQuery(query, analysisContext)

                expect(response).toHaveProperty('answer')
                expect(response.requiresNewAnalysis).toBe(false)
                expect(typeof response.answer).toBe('string')
                expect(response.answer.length).toBeGreaterThan(0)
            }
        })

        it('should provide relevant follow-up suggestions', async () => {
            const response = await controller.handleFollowUpQuery(
                'What is the RSI?',
                analysisContext
            )

            expect(Array.isArray(response.followUpSuggestions)).toBe(true)
            expect(response.followUpSuggestions.length).toBeGreaterThan(0)
            expect(response.followUpSuggestions.length).toBeLessThanOrEqual(4)

            // Suggestions should be strings
            response.followUpSuggestions.forEach(suggestion => {
                expect(typeof suggestion).toBe('string')
                expect(suggestion.length).toBeGreaterThan(0)
            })
        })
    })

    describe('Error Handling and Recovery', () => {
        it('should handle invalid symbol gracefully', async () => {
            const invalidSymbols = ['', '123', 'INVALID_SYMBOL_TOO_LONG']

            for (const symbol of invalidSymbols) {
                await expect(controller.initiateAnalysis(symbol))
                    .rejects.toThrow(AnalysisError)

                try {
                    await controller.initiateAnalysis(symbol)
                } catch (error) {
                    expect(error).toBeInstanceOf(AnalysisError)
                    expect((error as AnalysisError).type).toBe(AnalysisErrorType.INVALID_SYMBOL)
                    expect((error as AnalysisError).recoverable).toBe(true)
                    expect((error as AnalysisError).suggestedAction).toBeDefined()
                }
            }
        })

        it('should handle query processing errors gracefully', async () => {
            const invalidContext: AnalysisContext = {
                symbol: 'INVALID',
                timeframe: '1D',
                conversationHistory: []
                // Missing lastAnalysis
            }

            const response = await controller.handleFollowUpQuery(
                'What is the RSI?',
                invalidContext
            )

            expect(response).toHaveProperty('answer')
            expect(response.answer).toContain('analysis data available')
            expect(response.requiresNewAnalysis).toBe(true)
        })
    })

    describe('Performance and Caching', () => {
        it('should track performance metrics', async () => {
            await controller.initiateAnalysis('AAPL')
            await controller.initiateAnalysis('TSLA')

            const stats = controller.getCacheStatistics()

            expect(stats).toHaveProperty('cache')
            expect(stats).toHaveProperty('performance')
            expect(stats.performance).toBeDefined()
        })

        it('should clear all caches', async () => {
            await controller.initiateAnalysis('AAPL')

            controller.clearCache()

            const stats = controller.getCacheStatistics()
            expect(stats.cache.analysisCache.size).toBe(0)
        })
    })
})

describe('Natural Language Query Handler - Unit Tests', () => {
    let queryHandler: NaturalLanguageQueryHandler

    beforeEach(() => {
        queryHandler = new NaturalLanguageQueryHandler()
    })

    describe('Query Classification', () => {
        it('should classify technical queries correctly', () => {
            const technicalQueries = [
                'What is the RSI?',
                'Show me MACD',
                'Support and resistance levels'
            ]

            technicalQueries.forEach(query => {
                const classification = queryHandler.classifyQuery(query)
                expect(classification.type).toBe('technical')
                expect(classification.confidence).toBeGreaterThan(0)
            })
        })

        it('should classify recommendation queries correctly', () => {
            const recommendationQueries = [
                'Should I buy this stock?',
                'What are your price targets?',
                'Trading recommendation'
            ]

            recommendationQueries.forEach(query => {
                const classification = queryHandler.classifyQuery(query)
                expect(classification.type).toBe('recommendation')
                expect(classification.confidence).toBeGreaterThan(0)
            })
        })

        it('should detect symbol requests', () => {
            const symbolQueries = [
                'analyze AAPL',
                'look at TSLA',
                'check MSFT'
            ]

            symbolQueries.forEach(query => {
                const classification = queryHandler.classifyQuery(query)
                expect(classification.type).toBe('symbol_request')
                expect(classification.entities.length).toBeGreaterThan(0)
                expect(classification.confidence).toBeGreaterThan(0.8)
            })
        })
    })

    describe('Follow-up Suggestions', () => {
        it('should generate relevant follow-up suggestions', () => {
            const mockContext: AnalysisContext = {
                symbol: 'AAPL',
                timeframe: '1D',
                conversationHistory: []
            }

            const suggestions = queryHandler.generateFollowUpSuggestions(mockContext)

            expect(Array.isArray(suggestions)).toBe(true)
            expect(suggestions.length).toBeGreaterThan(0)
            expect(suggestions.length).toBeLessThanOrEqual(4)

            suggestions.forEach(suggestion => {
                expect(typeof suggestion).toBe('string')
                expect(suggestion.length).toBeGreaterThan(0)
            })
        })
    })
})

describe('Analysis Cache - Unit Tests', () => {
    let cache: AnalysisCache

    beforeEach(() => {
        cache = new AnalysisCache({
            maxSize: 10,
            defaultTTL: 1000, // 1 second for testing
            marketHoursTTL: 500,
            afterHoursTTL: 2000
        })
    })

    afterEach(() => {
        if (cache && typeof cache.destroy === 'function') {
            cache.destroy()
        }
    })

    describe('Analysis Result Caching', () => {
        it('should cache and retrieve analysis results', () => {
            const mockResult: AnalysisResult = {
                symbol: 'AAPL',
                timestamp: new Date(),
                technicalAnalysis: {} as any,
                fundamentalAnalysis: {} as any,
                recommendations: [],
                confidence: 0.8,
                chartAnnotations: [],
                summary: 'Test analysis'
            }

            cache.setAnalysisResult('test_key', mockResult)
            const retrieved = cache.getAnalysisResult('test_key')

            expect(retrieved).toEqual(mockResult)
        })

        it('should return null for non-existent keys', () => {
            const result = cache.getAnalysisResult('non_existent_key')
            expect(result).toBeNull()
        })

        it('should handle cache expiration', async () => {
            const mockResult: AnalysisResult = {
                symbol: 'AAPL',
                timestamp: new Date(),
                technicalAnalysis: {} as any,
                fundamentalAnalysis: {} as any,
                recommendations: [],
                confidence: 0.8,
                chartAnnotations: [],
                summary: 'Test analysis'
            }

            cache.setAnalysisResult('test_key', mockResult)

            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 1100))

            const result = cache.getAnalysisResult('test_key')
            expect(result).toBeNull()
        })
    })

    describe('Cache Management', () => {
        it('should provide cache statistics', () => {
            const mockResult: AnalysisResult = {
                symbol: 'AAPL',
                timestamp: new Date(),
                technicalAnalysis: {} as any,
                fundamentalAnalysis: {} as any,
                recommendations: [],
                confidence: 0.8,
                chartAnnotations: [],
                summary: 'Test analysis'
            }

            cache.setAnalysisResult('test_key', mockResult)
            const stats = cache.getStatistics()

            expect(stats).toHaveProperty('analysisCache')
            expect(stats).toHaveProperty('priceDataCache')
            expect(stats).toHaveProperty('searchResultsCache')
            expect(stats).toHaveProperty('performance')
            expect(stats.analysisCache.size).toBe(1)
        })

        it('should clear all caches', () => {
            const mockResult: AnalysisResult = {
                symbol: 'AAPL',
                timestamp: new Date(),
                technicalAnalysis: {} as any,
                fundamentalAnalysis: {} as any,
                recommendations: [],
                confidence: 0.8,
                chartAnnotations: [],
                summary: 'Test analysis'
            }

            cache.setAnalysisResult('test_key', mockResult)
            cache.clearAll()

            const stats = cache.getStatistics()
            expect(stats.analysisCache.size).toBe(0)
        })
    })
})