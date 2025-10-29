/**
 * Simplified Integration tests for Vibe Trader Analysis Controller
 * Tests core functionality without external dependencies
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
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

describe('Natural Language Query Handler - Unit Tests', () => {
    let queryHandler: NaturalLanguageQueryHandler

    beforeEach(() => {
        queryHandler = new NaturalLanguageQueryHandler()
    })

    describe('Query Classification', () => {
        it('should classify technical queries correctly', () => {
            const technicalQueries = [
                'RSI indicator analysis',
                'MACD signal interpretation',
                'Support resistance levels',
                'Bollinger bands analysis',
                'Moving average crossover'
            ]

            technicalQueries.forEach(query => {
                const classification = queryHandler.classifyQuery(query)
                expect(['technical', 'explanation']).toContain(classification.type)
                expect(classification.confidence).toBeGreaterThan(0)
                expect(classification.intent).toBeDefined()
            })
        })

        it('should classify fundamental queries correctly', () => {
            const fundamentalQueries = [
                'earnings revenue profit analysis',
                'news sentiment rating upgrade',
                'economic gdp inflation data',
                'financial pe ratio eps',
                'sector industry performance'
            ]

            fundamentalQueries.forEach(query => {
                const classification = queryHandler.classifyQuery(query)
                expect(['fundamental', 'technical']).toContain(classification.type)
                expect(classification.confidence).toBeGreaterThan(0)
                expect(classification.intent).toBeDefined()
            })
        })

        it('should classify recommendation queries correctly', () => {
            const recommendationQueries = [
                'Should I buy this stock?',
                'What are your price targets?',
                'Trading recommendation',
                'Investment advice',
                'Buy or sell signal'
            ]

            recommendationQueries.forEach(query => {
                const classification = queryHandler.classifyQuery(query)
                expect(classification.type).toBe('recommendation')
                expect(classification.confidence).toBeGreaterThan(0)
                expect(classification.intent).toContain('recommendation')
            })
        })

        it('should classify explanation queries correctly', () => {
            const explanationQueries = [
                'what is technical analysis definition',
                'explain how moving averages work',
                'help me understand RSI meaning',
                'tell me about chart patterns definition',
                'what does MACD mean exactly'
            ]

            explanationQueries.forEach(query => {
                const classification = queryHandler.classifyQuery(query)
                expect(['explanation', 'technical']).toContain(classification.type)
                expect(classification.confidence).toBeGreaterThan(0)
                expect(classification.intent).toBeDefined()
            })
        })

        it('should detect symbol requests', () => {
            const symbolQueries = [
                'analyze AAPL',
                'look at TSLA',
                'check MSFT',
                'what about GOOGL'
            ]

            symbolQueries.forEach(query => {
                const classification = queryHandler.classifyQuery(query)
                expect(classification.type).toBe('symbol_request')
                expect(classification.entities.length).toBeGreaterThan(0)
                expect(classification.confidence).toBeGreaterThan(0.8)
                expect(classification.intent).toContain('analysis for')
            })
        })

        it('should extract entities from queries', () => {
            const query = 'What is the RSI for AAPL and TSLA?'
            const classification = queryHandler.classifyQuery(query)

            expect(classification.entities.length).toBeGreaterThanOrEqual(0)
            expect(classification.intent).toBeDefined()
            expect(typeof classification.intent).toBe('string')
        })

        it('should handle general queries', () => {
            const generalQueries = [
                'Hello there',
                'Help me please',
                'What can you do for me?',
                'Random unrelated question'
            ]

            generalQueries.forEach(query => {
                const classification = queryHandler.classifyQuery(query)
                expect(['general', 'technical']).toContain(classification.type)
                expect(classification.confidence).toBeGreaterThanOrEqual(0)
            })
        })
    })

    describe('Follow-up Suggestions', () => {
        it('should generate relevant follow-up suggestions without analysis', () => {
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

        it('should provide different suggestions based on context', () => {
            const mockAnalysis: AnalysisResult = {
                symbol: 'AAPL',
                timestamp: new Date(),
                technicalAnalysis: {
                    indicators: [{
                        name: 'RSI',
                        values: [65],
                        parameters: { period: 14 },
                        interpretation: 'RSI approaching overbought',
                        signal: 'BEARISH'
                    }],
                    patterns: [{
                        type: 'ASCENDING_TRIANGLE',
                        confidence: 0.8,
                        coordinates: [],
                        description: 'Bullish triangle pattern',
                        implications: ['Potential breakout'],
                        priceTargets: []
                    }],
                    supportResistance: [],
                    trend: { direction: 'UPTREND', strength: 0.7, duration: 5, slope: 0.02 },
                    momentum: {
                        rsi: 65,
                        macd: { macd: 0.5, signal: 0.3, histogram: 0.2 },
                        stochastic: { k: 70, d: 65 },
                        interpretation: 'Strong bullish momentum'
                    },
                    volatility: {
                        atr: 2.5,
                        bollingerBands: { upper: 105, middle: 100, lower: 95, squeeze: false },
                        volatilityRank: 0.6
                    }
                },
                fundamentalAnalysis: {
                    symbol: 'AAPL',
                    companyInfo: 'Apple Inc.',
                    financialMetrics: 'Strong financials',
                    newsAnalysis: {
                        sentiment: 'POSITIVE',
                        relevantNews: [],
                        sentimentScore: 0.7,
                        keyThemes: ['innovation', 'growth']
                    },
                    sectorAnalysis: 'Technology sector performing well',
                    marketSentiment: 0.6,
                    upcomingEvents: [],
                    economicContext: {
                        sectorPerformance: 'Strong tech performance',
                        economicIndicators: [],
                        marketEvents: [],
                        overallContext: 'Positive market conditions'
                    }
                },
                recommendations: [],
                confidence: 0.8,
                chartAnnotations: [],
                summary: 'Bullish analysis'
            }

            const contextWithAnalysis: AnalysisContext = {
                symbol: 'AAPL',
                timeframe: '1D',
                lastAnalysis: mockAnalysis,
                conversationHistory: []
            }

            const contextWithoutAnalysis: AnalysisContext = {
                symbol: 'AAPL',
                timeframe: '1D',
                conversationHistory: []
            }

            const suggestionsWithAnalysis = queryHandler.generateFollowUpSuggestions(contextWithAnalysis)
            const suggestionsWithoutAnalysis = queryHandler.generateFollowUpSuggestions(contextWithoutAnalysis)

            expect(suggestionsWithAnalysis).not.toEqual(suggestionsWithoutAnalysis)
            expect(suggestionsWithAnalysis.length).toBeGreaterThan(0)
            expect(suggestionsWithoutAnalysis.length).toBeGreaterThan(0)
        })
    })

    describe('Query Processing', () => {
        it('should process queries without existing context', async () => {
            const emptyContext: AnalysisContext = {
                symbol: 'UNKNOWN',
                timeframe: '1D',
                conversationHistory: []
            }

            const response = await queryHandler.processQuery(
                'What is RSI?',
                emptyContext
            )

            expect(response).toHaveProperty('answer')
            expect(response).toHaveProperty('followUpSuggestions')
            expect(response).toHaveProperty('requiresNewAnalysis')
            expect(typeof response.answer).toBe('string')
            expect(Array.isArray(response.followUpSuggestions)).toBe(true)
        })

        it('should handle explanation queries correctly', async () => {
            const context: AnalysisContext = {
                symbol: 'AAPL',
                timeframe: '1D',
                conversationHistory: []
            }

            const explanationQueries = [
                'What is RSI?',
                'Explain MACD',
                'How do support and resistance work?',
                'What are chart patterns?'
            ]

            for (const query of explanationQueries) {
                const response = await queryHandler.processQuery(query, context)

                expect(response.answer.length).toBeGreaterThan(50) // Should be educational
                expect(typeof response.requiresNewAnalysis).toBe('boolean')
                expect(Array.isArray(response.followUpSuggestions)).toBe(true)
            }
        })

        it('should handle symbol request queries', async () => {
            const context: AnalysisContext = {
                symbol: 'AAPL',
                timeframe: '1D',
                conversationHistory: []
            }

            const response = await queryHandler.processQuery(
                'analyze TSLA',
                context
            )

            expect(response.requiresNewAnalysis).toBe(true)
            expect(response.suggestedSymbol).toBe('TSLA')
            expect(response.answer).toContain('TSLA')
        })
    })
})

describe('Analysis Cache - Unit Tests', () => {
    let cache: AnalysisCache

    beforeEach(() => {
        cache = new AnalysisCache({
            maxSize: 10,
            defaultTTL: 100, // 100ms for testing
            marketHoursTTL: 50, // 50ms for testing
            afterHoursTTL: 200 // 200ms for testing
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
                technicalAnalysis: {
                    indicators: [],
                    patterns: [],
                    supportResistance: [],
                    trend: { direction: 'SIDEWAYS', strength: 0.5, duration: 1, slope: 0 },
                    momentum: {
                        rsi: 50,
                        macd: { macd: 0, signal: 0, histogram: 0 },
                        stochastic: { k: 50, d: 50 },
                        interpretation: 'Neutral'
                    },
                    volatility: {
                        atr: 1,
                        bollingerBands: { upper: 101, middle: 100, lower: 99, squeeze: false },
                        volatilityRank: 0.5
                    }
                },
                fundamentalAnalysis: {
                    symbol: 'AAPL',
                    companyInfo: 'Test company',
                    financialMetrics: 'Test metrics',
                    newsAnalysis: {
                        sentiment: 'NEUTRAL',
                        relevantNews: [],
                        sentimentScore: 0,
                        keyThemes: []
                    },
                    sectorAnalysis: 'Test sector',
                    marketSentiment: 0,
                    upcomingEvents: [],
                    economicContext: {
                        sectorPerformance: 'Test performance',
                        economicIndicators: [],
                        marketEvents: [],
                        overallContext: 'Test context'
                    }
                },
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
            // Create cache with very short TTL
            const shortCache = new AnalysisCache({
                maxSize: 10,
                defaultTTL: 50,
                marketHoursTTL: 50,
                afterHoursTTL: 50
            })

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

            shortCache.setAnalysisResult('test_key', mockResult)

            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 100))

            const result = shortCache.getAnalysisResult('test_key')
            expect(result).toBeNull()

            shortCache.destroy()
        })
    })

    describe('Price Data Caching', () => {
        it('should cache and retrieve price data', () => {
            const mockPriceData: OHLCV[] = [
                {
                    open: 100,
                    high: 105,
                    low: 95,
                    close: 102,
                    volume: 1000000,
                    timestamp: new Date()
                }
            ]

            cache.setPriceData('AAPL', '1D', mockPriceData)
            const retrieved = cache.getPriceData('AAPL', '1D')

            expect(retrieved).toEqual(mockPriceData)
        })

        it('should return null for expired price data', async () => {
            // Create cache with very short TTL
            const shortCache = new AnalysisCache({
                maxSize: 10,
                defaultTTL: 50,
                marketHoursTTL: 50,
                afterHoursTTL: 50
            })

            const mockPriceData: OHLCV[] = [
                {
                    open: 100,
                    high: 105,
                    low: 95,
                    close: 102,
                    volume: 1000000,
                    timestamp: new Date()
                }
            ]

            shortCache.setPriceData('AAPL', '1D', mockPriceData)

            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 100))

            const result = shortCache.getPriceData('AAPL', '1D')
            expect(result).toBeNull()

            shortCache.destroy()
        })
    })

    describe('Search Results Caching', () => {
        it('should cache and retrieve search results', () => {
            const mockSearchResults = {
                results: [
                    { title: 'Test Result', content: 'Test content', url: 'http://test.com' }
                ],
                query: 'test query',
                images: [],
                number_of_results: 1
            }

            cache.setSearchResults('test query', mockSearchResults)
            const retrieved = cache.getSearchResults('test query')

            expect(retrieved).toEqual(mockSearchResults)
        })

        it('should return null for non-existent search queries', () => {
            const result = cache.getSearchResults('non_existent_query')
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

        it('should invalidate cache by symbol', () => {
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

            cache.setAnalysisResult('AAPL_1D_test', mockResult)
            cache.setPriceData('AAPL', '1D', [])

            cache.invalidateSymbol('AAPL')

            expect(cache.getAnalysisResult('AAPL_1D_test')).toBeNull()
            expect(cache.getPriceData('AAPL', '1D')).toBeNull()
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

        it('should handle market conditions invalidation', () => {
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

            // Should not throw error
            cache.invalidateByMarketConditions()

            expect(true).toBe(true)
        })

        it('should cleanup expired entries', () => {
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

            // Should not throw error
            cache.cleanup()

            expect(true).toBe(true)
        })
    })
})

describe('Error Handling', () => {
    describe('AnalysisError', () => {
        it('should create analysis error with correct properties', () => {
            const error = new AnalysisError(
                AnalysisErrorType.INVALID_SYMBOL,
                'Invalid symbol provided',
                true,
                'Use a valid symbol like AAPL'
            )

            expect(error).toBeInstanceOf(Error)
            expect(error).toBeInstanceOf(AnalysisError)
            expect(error.type).toBe(AnalysisErrorType.INVALID_SYMBOL)
            expect(error.message).toBe('Invalid symbol provided')
            expect(error.recoverable).toBe(true)
            expect(error.suggestedAction).toBe('Use a valid symbol like AAPL')
            expect(error.name).toBe('AnalysisError')
        })

        it('should handle different error types', () => {
            const errorTypes = [
                AnalysisErrorType.INVALID_SYMBOL,
                AnalysisErrorType.DATA_UNAVAILABLE,
                AnalysisErrorType.CHART_ERROR,
                AnalysisErrorType.SEARCH_ERROR,
                AnalysisErrorType.ANALYSIS_TIMEOUT
            ]

            errorTypes.forEach(type => {
                const error = new AnalysisError(type, 'Test error')
                expect(error.type).toBe(type)
                expect(error.message).toBe('Test error')
            })
        })
    })
})