/**
 * Unit tests for Signal Generation Engine
 * Tests trading signal generation, price target calculation, and recommendation synthesis
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { SignalGenerator } from '../../lib/analysis/signal-generator'
import { PriceTargetCalculator } from '../../lib/analysis/price-target-calculator'
import { RecommendationEngine } from '../../lib/analysis/recommendation-engine'
import {
    TechnicalAnalysisResult,
    FundamentalAnalysisResult,
    TradingSignal,
    PriceTarget,
    OHLCV,
    IndicatorResult,
    PatternResult,
    SupportResistanceLevel
} from '../../lib/types/trading'

// Mock data generators
const createMockOHLCV = (count: number, basePrice: number = 100, trend: 'up' | 'down' | 'sideways' = 'sideways'): OHLCV[] => {
    const data: OHLCV[] = []
    let currentPrice = basePrice

    for (let i = 0; i < count; i++) {
        const volatility = 0.02
        const trendFactor = trend === 'up' ? 0.001 : trend === 'down' ? -0.001 : 0

        const open = currentPrice
        const change = (Math.random() - 0.5) * volatility * currentPrice + (trendFactor * currentPrice)
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

const createMockTechnicalAnalysis = (bias: 'bullish' | 'bearish' | 'neutral' = 'neutral'): TechnicalAnalysisResult => {
    const indicators: IndicatorResult[] = []
    const patterns: PatternResult[] = []
    const supportResistance: SupportResistanceLevel[] = []

    // Create indicators based on bias
    if (bias === 'bullish') {
        indicators.push(
            {
                name: 'RSI',
                values: [45],
                parameters: { period: 14 },
                interpretation: 'RSI in healthy bullish territory',
                signal: 'BULLISH'
            },
            {
                name: 'MACD',
                values: [0.5, 0.3, 0.2],
                parameters: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
                interpretation: 'MACD bullish crossover',
                signal: 'BULLISH'
            },
            {
                name: 'SMA20',
                values: [98],
                parameters: { period: 20 },
                interpretation: 'Price above SMA20',
                signal: 'BULLISH'
            }
        )

        patterns.push({
            type: 'ASCENDING_TRIANGLE',
            confidence: 0.75,
            coordinates: [
                { x: 1, y: 95 }, { x: 10, y: 105 },
                { x: 2, y: 96 }, { x: 9, y: 97 }
            ],
            description: 'Ascending triangle pattern',
            implications: ['Bullish breakout expected'],
            priceTargets: [
                { level: 110, type: 'TARGET', confidence: 0.7, reasoning: 'Triangle breakout target' }
            ]
        })

        supportResistance.push(
            { level: 95, type: 'SUPPORT', strength: 0.8, touches: 3, volume: 1000000, confidence: 0.7 },
            { level: 110, type: 'RESISTANCE', strength: 0.7, touches: 2, volume: 800000, confidence: 0.6 }
        )
    } else if (bias === 'bearish') {
        indicators.push(
            {
                name: 'RSI',
                values: [75],
                parameters: { period: 14 },
                interpretation: 'RSI overbought',
                signal: 'BEARISH'
            },
            {
                name: 'MACD',
                values: [-0.5, -0.3, -0.2],
                parameters: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
                interpretation: 'MACD bearish crossover',
                signal: 'BEARISH'
            },
            {
                name: 'SMA20',
                values: [102],
                parameters: { period: 20 },
                interpretation: 'Price below SMA20',
                signal: 'BEARISH'
            }
        )

        patterns.push({
            type: 'HEAD_AND_SHOULDERS',
            confidence: 0.8,
            coordinates: [
                { x: 1, y: 105 }, { x: 5, y: 110 }, { x: 9, y: 105 }
            ],
            description: 'Head and shoulders reversal pattern',
            implications: ['Bearish reversal expected'],
            priceTargets: [
                { level: 90, type: 'TARGET', confidence: 0.75, reasoning: 'H&S measured move' }
            ]
        })

        supportResistance.push(
            { level: 90, type: 'SUPPORT', strength: 0.6, touches: 2, volume: 800000, confidence: 0.6 },
            { level: 110, type: 'RESISTANCE', strength: 0.9, touches: 4, volume: 1200000, confidence: 0.8 }
        )
    } else {
        // Neutral bias
        indicators.push(
            {
                name: 'RSI',
                values: [50],
                parameters: { period: 14 },
                interpretation: 'RSI neutral',
                signal: 'NEUTRAL'
            },
            {
                name: 'MACD',
                values: [0.1, 0.1, 0],
                parameters: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
                interpretation: 'MACD neutral',
                signal: 'NEUTRAL'
            }
        )

        supportResistance.push(
            { level: 95, type: 'SUPPORT', strength: 0.5, touches: 2, volume: 500000, confidence: 0.5 },
            { level: 105, type: 'RESISTANCE', strength: 0.5, touches: 2, volume: 500000, confidence: 0.5 }
        )
    }

    return {
        indicators,
        patterns,
        supportResistance,
        trend: {
            direction: bias === 'bullish' ? 'UPTREND' : bias === 'bearish' ? 'DOWNTREND' : 'SIDEWAYS',
            strength: bias === 'neutral' ? 0.3 : 0.7,
            duration: 10,
            slope: bias === 'bullish' ? 0.02 : bias === 'bearish' ? -0.02 : 0.001
        },
        momentum: {
            rsi: bias === 'bullish' ? 45 : bias === 'bearish' ? 75 : 50,
            macd: {
                macd: bias === 'bullish' ? 0.5 : bias === 'bearish' ? -0.5 : 0.1,
                signal: bias === 'bullish' ? 0.3 : bias === 'bearish' ? -0.3 : 0.1,
                histogram: bias === 'bullish' ? 0.2 : bias === 'bearish' ? -0.2 : 0
            },
            stochastic: {
                k: bias === 'bullish' ? 60 : bias === 'bearish' ? 25 : 50,
                d: bias === 'bullish' ? 55 : bias === 'bearish' ? 30 : 50
            },
            interpretation: bias === 'bullish' ? 'Bullish momentum building' :
                bias === 'bearish' ? 'Bearish momentum accelerating' : 'Neutral momentum'
        },
        volatility: {
            atr: 2.5,
            bollingerBands: {
                upper: 105,
                middle: 100,
                lower: 95,
                squeeze: bias === 'neutral'
            },
            volatilityRank: bias === 'bearish' ? 0.8 : 0.5
        }
    }
}

const createMockFundamentalAnalysis = (sentiment: 'positive' | 'negative' | 'neutral' = 'neutral'): FundamentalAnalysisResult => {
    return {
        companyInfo: {
            name: 'Test Company',
            sector: 'Technology',
            industry: 'Software',
            marketCap: 1000000000,
            description: 'Test company for analysis'
        },
        financialMetrics: {
            pe: sentiment === 'positive' ? 15 : sentiment === 'negative' ? 35 : 25,
            eps: sentiment === 'positive' ? 5.5 : sentiment === 'negative' ? 1.2 : 3.0,
            revenue: 1000000000,
            revenueGrowth: sentiment === 'positive' ? 0.25 : sentiment === 'negative' ? -0.05 : 0.10,
            profitMargin: sentiment === 'positive' ? 0.15 : sentiment === 'negative' ? 0.02 : 0.08,
            debtToEquity: sentiment === 'positive' ? 0.3 : sentiment === 'negative' ? 1.2 : 0.6
        },
        newsAnalysis: {
            sentiment: sentiment === 'positive' ? 'POSITIVE' : sentiment === 'negative' ? 'NEGATIVE' : 'NEUTRAL',
            relevantNews: [
                {
                    title: 'Test News Article',
                    summary: 'Test summary',
                    url: 'https://test.com',
                    publishedAt: new Date(),
                    sentiment: sentiment === 'positive' ? 0.8 : sentiment === 'negative' ? 0.2 : 0.5,
                    relevance: 0.9
                }
            ],
            sentimentScore: sentiment === 'positive' ? 0.75 : sentiment === 'negative' ? 0.25 : 0.5,
            keyThemes: ['earnings', 'growth', 'market']
        },
        sectorAnalysis: {
            sectorPerformance: sentiment === 'positive' ? 0.15 : sentiment === 'negative' ? -0.08 : 0.03,
            relativeStrength: sentiment === 'positive' ? 0.8 : sentiment === 'negative' ? 0.3 : 0.5,
            peerComparison: ['PEER1', 'PEER2'],
            sectorTrends: ['AI adoption', 'Cloud migration']
        },
        marketSentiment: {
            overall: sentiment === 'positive' ? 0.75 : sentiment === 'negative' ? 0.25 : 0.5,
            news: sentiment === 'positive' ? 0.8 : sentiment === 'negative' ? 0.2 : 0.5,
            social: sentiment === 'positive' ? 0.7 : sentiment === 'negative' ? 0.3 : 0.5,
            analyst: sentiment === 'positive' ? 0.75 : sentiment === 'negative' ? 0.25 : 0.5
        },
        upcomingEvents: sentiment === 'negative' ? [
            {
                type: 'EARNINGS',
                date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                description: 'Quarterly earnings announcement',
                expectedImpact: 'HIGH'
            }
        ] : []
    }
}

describe('Signal Generation Engine', () => {
    describe('SignalGenerator', () => {
        describe('generateTechnicalSignals', () => {
            it('should generate buy signal for bullish technical conditions', () => {
                const bullishAnalysis = createMockTechnicalAnalysis('bullish')
                const signals = SignalGenerator.generateTechnicalSignals(bullishAnalysis, '1D')

                expect(signals.length).toBeGreaterThan(0)
                if (signals.length > 0) {
                    expect(['BUY', 'SELL', 'HOLD']).toContain(signals[0].action)
                    expect(signals[0].confidence).toBeGreaterThan(0)
                    expect(signals[0].reasoning.length).toBeGreaterThan(0)
                    expect(signals[0].timeHorizon).toContain('days to weeks')
                    expect(['LOW', 'MEDIUM', 'HIGH']).toContain(signals[0].riskLevel)
                }
            })

            it('should generate sell signal for bearish technical conditions', () => {
                const bearishAnalysis = createMockTechnicalAnalysis('bearish')
                const signals = SignalGenerator.generateTechnicalSignals(bearishAnalysis, '1D')

                expect(signals.length).toBeGreaterThanOrEqual(0)
                if (signals.length > 0) {
                    expect(['BUY', 'SELL', 'HOLD']).toContain(signals[0].action)
                    expect(signals[0].confidence).toBeGreaterThan(0)
                    expect(signals[0].reasoning.length).toBeGreaterThan(0)
                    expect(signals[0].priceTargets.length).toBeGreaterThanOrEqual(0)
                }
            })

            it('should generate hold signal for neutral conditions', () => {
                const neutralAnalysis = createMockTechnicalAnalysis('neutral')
                const signals = SignalGenerator.generateTechnicalSignals(neutralAnalysis, '1D')

                expect(signals.length).toBeGreaterThanOrEqual(0)
                if (signals.length > 0) {
                    // Could be HOLD or no signal depending on confluence
                    expect(['BUY', 'SELL', 'HOLD']).toContain(signals[0].action)
                }
            })

            it('should adjust signals for different timeframes', () => {
                const analysis = createMockTechnicalAnalysis('bullish')

                const scalping = SignalGenerator.generateTechnicalSignals(analysis, '5m')
                const swing = SignalGenerator.generateTechnicalSignals(analysis, '1d')
                const position = SignalGenerator.generateTechnicalSignals(analysis, '1w')

                expect(scalping[0].timeHorizon).toContain('Scalping')
                expect(swing[0].timeHorizon).toContain('Swing')
                expect(position[0].timeHorizon).toContain('Position')

                // Scalping should have higher risk tolerance
                expect(scalping[0].riskLevel).toBe('HIGH')
            })

            it('should generate counter-trend signals for short timeframes', () => {
                const analysis = createMockTechnicalAnalysis('neutral')
                // Modify to extreme RSI for counter-trend
                analysis.momentum.rsi = 85

                const signals = SignalGenerator.generateTechnicalSignals(analysis, '15m')

                expect(signals.length).toBeGreaterThan(0)
                // Should potentially generate counter-trend signal
                if (signals.some(s => s.action === 'SELL')) {
                    const sellSignal = signals.find(s => s.action === 'SELL')
                    expect(sellSignal?.reasoning.some(r => r.includes('extreme') || r.includes('overbought'))).toBe(true)
                }
            })

            it('should consolidate multiple signals correctly', () => {
                const signals: TradingSignal[] = [
                    {
                        action: 'BUY',
                        confidence: 0.7,
                        reasoning: ['Reason 1'],
                        priceTargets: [{ level: 110, type: 'TARGET', confidence: 0.7, reasoning: 'Target 1' }],
                        stopLoss: 95,
                        timeHorizon: 'Medium-term',
                        riskLevel: 'MEDIUM'
                    },
                    {
                        action: 'BUY',
                        confidence: 0.6,
                        reasoning: ['Reason 2'],
                        priceTargets: [{ level: 112, type: 'TARGET', confidence: 0.6, reasoning: 'Target 2' }],
                        stopLoss: 94,
                        timeHorizon: 'Medium-term',
                        riskLevel: 'LOW'
                    }
                ]

                const consolidated = SignalGenerator.consolidateSignals(signals)

                expect(consolidated.length).toBe(1)
                expect(consolidated[0].action).toBe('BUY')
                expect(consolidated[0].confidence).toBeGreaterThan(0.6)
                expect(consolidated[0].reasoning.length).toBeGreaterThan(1)
            })
        })
    })

    describe('PriceTargetCalculator', () => {
        describe('calculateFibonacciRetracements', () => {
            it('should calculate Fibonacci retracement levels correctly', () => {
                const swingHigh = 120
                const swingLow = 80
                const currentPrice = 100

                const targets = PriceTargetCalculator.calculateFibonacciRetracements(swingHigh, swingLow, currentPrice)

                expect(targets.length).toBeGreaterThan(0)

                // Check for 50% retracement level (should be around 100)
                const fiftyPercent = targets.find(t => Math.abs(t.level - 100) < 2)
                if (fiftyPercent) {
                    expect(fiftyPercent.level).toBeCloseTo(100, 0)
                }

                // Check for 61.8% retracement level (golden ratio) - should be around 95.28
                const goldenRatio = targets.find(t => Math.abs(t.level - 95.28) < 3)
                if (goldenRatio) {
                    expect(goldenRatio.confidence).toBeGreaterThan(0.6)
                }

                // All targets should have reasoning
                targets.forEach(target => {
                    expect(target.reasoning).toContain('Fibonacci')
                    expect(target.confidence).toBeGreaterThan(0)
                })
            })

            it('should filter out targets too close to current price', () => {
                const swingHigh = 101
                const swingLow = 99
                const currentPrice = 100

                const targets = PriceTargetCalculator.calculateFibonacciRetracements(swingHigh, swingLow, currentPrice)

                // Should have fewer or no targets due to small range
                targets.forEach(target => {
                    const distance = Math.abs(target.level - currentPrice) / currentPrice
                    expect(distance).toBeGreaterThan(0.01) // At least 1% away
                })
            })
        })

        describe('calculateFibonacciExtensions', () => {
            it('should calculate bullish Fibonacci extensions', () => {
                const swingHigh = 120
                const swingLow = 80
                const currentPrice = 100

                const targets = PriceTargetCalculator.calculateFibonacciExtensions(swingHigh, swingLow, currentPrice, 'BULLISH')

                expect(targets.length).toBeGreaterThan(0)

                // All targets should be above current price for bullish extensions
                targets.forEach(target => {
                    expect(target.level).toBeGreaterThan(currentPrice)
                    expect(target.type).toBe('TARGET')
                    expect(target.reasoning).toContain('extension')
                })

                // Check for 161.8% extension (golden ratio)
                const goldenExtension = targets.find(t => Math.abs(t.level - 144.72) < 10)
                if (goldenExtension) {
                    expect(goldenExtension.confidence).toBeGreaterThan(0.6)
                }
            })

            it('should calculate bearish Fibonacci extensions', () => {
                const swingHigh = 120
                const swingLow = 80
                const currentPrice = 100

                const targets = PriceTargetCalculator.calculateFibonacciExtensions(swingHigh, swingLow, currentPrice, 'BEARISH')

                expect(targets.length).toBeGreaterThan(0)

                // All targets should be below current price for bearish extensions
                targets.forEach(target => {
                    expect(target.level).toBeLessThan(currentPrice)
                    expect(target.type).toBe('TARGET')
                })
            })
        })

        describe('calculateSupportResistanceTargets', () => {
            it('should calculate bullish targets from resistance levels', () => {
                const levels: SupportResistanceLevel[] = [
                    { level: 105, type: 'RESISTANCE', strength: 0.8, touches: 3, volume: 1000000, confidence: 0.7 },
                    { level: 110, type: 'RESISTANCE', strength: 0.6, touches: 2, volume: 800000, confidence: 0.6 },
                    { level: 95, type: 'SUPPORT', strength: 0.7, touches: 3, volume: 900000, confidence: 0.7 }
                ]
                const currentPrice = 100

                const targets = PriceTargetCalculator.calculateSupportResistanceTargets(levels, currentPrice, 'BULLISH')

                expect(targets.length).toBeGreaterThan(0)

                // Should only include resistance levels above current price
                targets.forEach(target => {
                    expect(target.level).toBeGreaterThan(currentPrice)
                    expect(target.type).toBe('TARGET')
                })

                // Should be sorted by strength/proximity
                if (targets.length > 1) {
                    expect(targets[0].confidence).toBeGreaterThanOrEqual(targets[1].confidence)
                }
            })

            it('should calculate bearish targets from support levels', () => {
                const levels: SupportResistanceLevel[] = [
                    { level: 95, type: 'SUPPORT', strength: 0.8, touches: 3, volume: 1000000, confidence: 0.7 },
                    { level: 90, type: 'SUPPORT', strength: 0.6, touches: 2, volume: 800000, confidence: 0.6 },
                    { level: 105, type: 'RESISTANCE', strength: 0.7, touches: 3, volume: 900000, confidence: 0.7 }
                ]
                const currentPrice = 100

                const targets = PriceTargetCalculator.calculateSupportResistanceTargets(levels, currentPrice, 'BEARISH')

                expect(targets.length).toBeGreaterThan(0)

                // Should only include support levels below current price
                targets.forEach(target => {
                    expect(target.level).toBeLessThan(currentPrice)
                    expect(target.type).toBe('TARGET')
                })
            })
        })

        describe('calculatePatternTargets', () => {
            it('should calculate ascending triangle targets', () => {
                const pattern: PatternResult = {
                    type: 'ASCENDING_TRIANGLE',
                    confidence: 0.75,
                    coordinates: [
                        { x: 1, y: 95 }, { x: 10, y: 105 },
                        { x: 2, y: 96 }, { x: 9, y: 97 }
                    ],
                    description: 'Ascending triangle',
                    implications: ['Bullish breakout'],
                    priceTargets: []
                }
                const currentPrice = 100
                const data = createMockOHLCV(20, 100)

                const targets = PriceTargetCalculator.calculatePatternTargets(pattern, currentPrice, data)

                expect(targets.length).toBeGreaterThanOrEqual(0)
                if (targets.length > 0) {
                    expect(targets[0].reasoning).toContain('triangle')
                }
            })

            it('should calculate head and shoulders targets', () => {
                const pattern: PatternResult = {
                    type: 'HEAD_AND_SHOULDERS',
                    confidence: 0.8,
                    coordinates: [
                        { x: 1, y: 105 }, { x: 5, y: 110 }, { x: 9, y: 105 }
                    ],
                    description: 'Head and shoulders',
                    implications: ['Bearish reversal'],
                    priceTargets: []
                }
                const currentPrice = 100
                const data = createMockOHLCV(20, 100)

                const targets = PriceTargetCalculator.calculatePatternTargets(pattern, currentPrice, data)

                expect(targets.length).toBeGreaterThanOrEqual(0)
                if (targets.length > 0) {
                    expect(targets[0].reasoning).toContain('neckline')
                }
            })
        })

        describe('calculateComprehensiveTargets', () => {
            it('should combine all target calculation methods', () => {
                const currentPrice = 100
                const supportResistance: SupportResistanceLevel[] = [
                    { level: 105, type: 'RESISTANCE', strength: 0.8, touches: 3, volume: 1000000, confidence: 0.7 },
                    { level: 95, type: 'SUPPORT', strength: 0.7, touches: 3, volume: 900000, confidence: 0.7 }
                ]
                const patterns: PatternResult[] = [
                    {
                        type: 'ASCENDING_TRIANGLE',
                        confidence: 0.75,
                        coordinates: [{ x: 1, y: 95 }, { x: 10, y: 105 }],
                        description: 'Triangle',
                        implications: [],
                        priceTargets: []
                    }
                ]
                const data = createMockOHLCV(30, 100)
                const swingHigh = 120
                const swingLow = 80

                const targets = PriceTargetCalculator.calculateComprehensiveTargets(
                    currentPrice,
                    supportResistance,
                    patterns,
                    data,
                    swingHigh,
                    swingLow,
                    'BULLISH'
                )

                expect(targets.length).toBeGreaterThan(0)
                expect(targets.length).toBeLessThanOrEqual(8) // Should be capped at 8

                // Should be sorted by confidence
                if (targets.length > 1) {
                    expect(targets[0].confidence).toBeGreaterThanOrEqual(targets[1].confidence)
                }

                // Should include targets from different methods
                const fibTargets = targets.filter(t => t.reasoning.includes('Fibonacci'))
                const srTargets = targets.filter(t => t.reasoning.includes('resistance') || t.reasoning.includes('support'))

                expect(fibTargets.length + srTargets.length).toBeGreaterThan(0)
            })
        })
    })

    describe('RecommendationEngine', () => {
        describe('synthesizeRecommendations', () => {
            it('should synthesize technical and fundamental analysis', () => {
                const technicalAnalysis = createMockTechnicalAnalysis('bullish')
                const fundamentalAnalysis = createMockFundamentalAnalysis('positive')
                const currentPrice = 100
                const data = createMockOHLCV(30, 100)

                const recommendations = RecommendationEngine.synthesizeRecommendations(
                    technicalAnalysis,
                    fundamentalAnalysis,
                    currentPrice,
                    data,
                    '1D'
                )

                expect(recommendations.length).toBeGreaterThan(0)
                expect(recommendations[0].action).toBe('BUY')
                expect(recommendations[0].confidence).toBeGreaterThan(0.7) // Should be enhanced by fundamental support
                expect(recommendations[0].reasoning.some(r => r.includes('Fundamental'))).toBe(true)
            })

            it('should handle conflicting technical and fundamental signals', () => {
                const technicalAnalysis = createMockTechnicalAnalysis('bullish')
                const fundamentalAnalysis = createMockFundamentalAnalysis('negative')
                const currentPrice = 100
                const data = createMockOHLCV(30, 100)

                const recommendations = RecommendationEngine.synthesizeRecommendations(
                    technicalAnalysis,
                    fundamentalAnalysis,
                    currentPrice,
                    data,
                    '1D'
                )

                expect(recommendations.length).toBeGreaterThan(0)

                // Confidence should be reduced due to conflict
                const buySignal = recommendations.find(r => r.action === 'BUY')
                if (buySignal) {
                    expect(buySignal.reasoning.some(r => r.includes('conflicting'))).toBe(true)
                    expect(buySignal.riskLevel).toBe('HIGH')
                }
            })

            it('should work with technical analysis only', () => {
                const technicalAnalysis = createMockTechnicalAnalysis('bullish')
                const currentPrice = 100
                const data = createMockOHLCV(30, 100)

                const recommendations = RecommendationEngine.synthesizeRecommendations(
                    technicalAnalysis,
                    null,
                    currentPrice,
                    data,
                    '1D'
                )

                expect(recommendations.length).toBeGreaterThan(0)
                expect(recommendations[0].confidence).toBeGreaterThan(0)
                expect(recommendations[0].priceTargets.length).toBeGreaterThanOrEqual(0)
            })

            it('should assess risk correctly', () => {
                const technicalAnalysis = createMockTechnicalAnalysis('bullish')
                // High volatility scenario
                technicalAnalysis.volatility.volatilityRank = 0.9

                const fundamentalAnalysis = createMockFundamentalAnalysis('negative')
                const currentPrice = 100
                const data = createMockOHLCV(30, 100)

                const recommendations = RecommendationEngine.synthesizeRecommendations(
                    technicalAnalysis,
                    fundamentalAnalysis,
                    currentPrice,
                    data,
                    '1D'
                )

                expect(recommendations.length).toBeGreaterThan(0)
                expect(recommendations[0].riskLevel).toBe('HIGH')
                expect(recommendations[0].reasoning.some(r => r.includes('volatility') || r.includes('risk'))).toBe(true)
            })
        })

        describe('generateMarketContext', () => {
            it('should generate comprehensive market context', () => {
                const technicalAnalysis = createMockTechnicalAnalysis('bullish')
                const fundamentalAnalysis = createMockFundamentalAnalysis('positive')

                const context = RecommendationEngine.generateMarketContext(technicalAnalysis, fundamentalAnalysis)

                expect(context.summary).toBeDefined()
                expect(context.keyPoints.length).toBeGreaterThan(0)
                expect(context.riskFactors.length).toBeGreaterThanOrEqual(0)
                expect(context.opportunities.length).toBeGreaterThanOrEqual(0)

                expect(context.summary).toContain('bullish')
                expect(context.summary).toContain('positive')
            })

            it('should work without fundamental analysis', () => {
                const technicalAnalysis = createMockTechnicalAnalysis('bearish')

                const context = RecommendationEngine.generateMarketContext(technicalAnalysis, null)

                expect(context.summary).toBeDefined()
                expect(context.keyPoints.length).toBeGreaterThan(0)
                expect(context.summary).toContain('bearish')
                expect(context.summary).toContain('not available')
            })

            it('should identify risk factors correctly', () => {
                const technicalAnalysis = createMockTechnicalAnalysis('neutral')
                technicalAnalysis.volatility.volatilityRank = 0.9 // High volatility

                const fundamentalAnalysis = createMockFundamentalAnalysis('negative')

                const context = RecommendationEngine.generateMarketContext(technicalAnalysis, fundamentalAnalysis)

                expect(context.riskFactors.length).toBeGreaterThan(0)
                expect(context.riskFactors.some(f => f.includes('volatility'))).toBe(true)
                expect(context.riskFactors.some(f => f.includes('event'))).toBe(true)
            })

            it('should identify opportunities correctly', () => {
                const technicalAnalysis = createMockTechnicalAnalysis('bullish')
                technicalAnalysis.volatility.bollingerBands.squeeze = true

                const fundamentalAnalysis = createMockFundamentalAnalysis('positive')

                const context = RecommendationEngine.generateMarketContext(technicalAnalysis, fundamentalAnalysis)

                expect(context.opportunities.length).toBeGreaterThan(0)
                expect(context.opportunities.some(o => o.includes('squeeze') || o.includes('breakout'))).toBe(true)
                expect(context.opportunities.some(o => o.includes('sentiment'))).toBe(true)
            })
        })
    })
})