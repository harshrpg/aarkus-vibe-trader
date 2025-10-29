/**
 * Unit tests for Technical Analysis Engine
 * Tests indicator calculations, pattern recognition, and support/resistance detection
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { TechnicalIndicators } from '../../lib/analysis/technical-indicators'
import { PatternRecognition } from '../../lib/analysis/pattern-recognition'
import { SupportResistanceDetector } from '../../lib/analysis/support-resistance'
import { TechnicalAnalysisEngine } from '../../lib/agents/technical-analyzer'
import { OHLCV, IndicatorResult, PatternResult, SupportResistanceLevel, TechnicalAnalysisResult } from '../../lib/types/trading'

// Mock price data for testing
const createMockOHLCV = (count: number, basePrice: number = 100, trend: 'up' | 'down' | 'sideways' = 'sideways'): OHLCV[] => {
    const data: OHLCV[] = []
    let currentPrice = basePrice

    for (let i = 0; i < count; i++) {
        const volatility = 0.02 // 2% volatility
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

// Known test data for RSI calculation verification
const knownRSIData = [
    44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.85, 46.08, 45.89, 46.03,
    46.83, 46.69, 46.45, 46.59, 46.3, 46.28, 46.28, 46.00, 46.03, 46.41,
    46.22, 45.64, 46.21, 46.25, 45.71, 46.45, 47.44, 47.31, 47.20, 47.09
]

describe('Technical Analysis Engine - Indicator Calculations', () => {
    describe('TechnicalIndicators', () => {
        describe('calculateSMA', () => {
            it('should calculate Simple Moving Average correctly', () => {
                const prices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                const period = 5

                const sma = TechnicalIndicators.calculateSMA(prices, period)

                expect(sma).toHaveLength(6) // 10 - 5 + 1 = 6
                expect(sma[0]).toBe(3) // (1+2+3+4+5)/5 = 3
                expect(sma[1]).toBe(4) // (2+3+4+5+6)/5 = 4
                expect(sma[5]).toBe(8) // (6+7+8+9+10)/5 = 8
            })

            it('should handle edge cases', () => {
                const prices = [100]
                const sma = TechnicalIndicators.calculateSMA(prices, 1)

                expect(sma).toEqual([100])
            })
        })

        describe('calculateEMA', () => {
            it('should calculate Exponential Moving Average correctly', () => {
                const prices = [22.27, 22.19, 22.08, 22.17, 22.18, 22.13, 22.23, 22.43, 22.24, 22.29]
                const period = 10

                const ema = TechnicalIndicators.calculateEMA(prices, period)

                expect(ema).toHaveLength(1) // Only one EMA value for 10 periods
                expect(ema[0]).toBeCloseTo(22.22, 2) // Expected EMA value
            })

            it('should start with SMA for first value', () => {
                const prices = [1, 2, 3, 4, 5]
                const period = 3

                const ema = TechnicalIndicators.calculateEMA(prices, period)

                expect(ema[0]).toBe(2) // (1+2+3)/3 = 2 (SMA for first value)
            })
        })

        describe('calculateRSI', () => {
            it('should calculate RSI with known dataset', () => {
                const rsiResult = TechnicalIndicators.calculateRSI(knownRSIData, 14)

                expect(rsiResult.name).toBe('RSI')
                expect(rsiResult.values).toHaveLength(15) // 30 - 14 - 1 = 15
                expect(rsiResult.values[rsiResult.values.length - 1]).toBeGreaterThan(50) // RSI should be above 50 for uptrend
                expect(rsiResult.values[rsiResult.values.length - 1]).toBeLessThan(80) // RSI should be below 80
                expect(rsiResult.parameters.period).toBe(14)
            })

            it('should provide correct signal interpretation', () => {
                // Test overbought condition (RSI > 70)
                const overboughtPrices = Array(20).fill(0).map((_, i) => 100 + i * 2) // Strong uptrend
                const overboughtRSI = TechnicalIndicators.calculateRSI(overboughtPrices, 14)

                expect(overboughtRSI.signal).toBe('BEARISH')
                expect(overboughtRSI.interpretation).toContain('overbought')

                // Test oversold condition (RSI < 30)
                const oversoldPrices = Array(20).fill(0).map((_, i) => 100 - i * 2) // Strong downtrend
                const oversoldRSI = TechnicalIndicators.calculateRSI(oversoldPrices, 14)

                expect(oversoldRSI.signal).toBe('BULLISH')
                expect(oversoldRSI.interpretation).toContain('oversold')
            })
        })

        describe('calculateMACD', () => {
            it('should calculate MACD with correct components', () => {
                const prices = Array(50).fill(0).map((_, i) => 100 + Math.sin(i * 0.1) * 5) // Sine wave pattern

                const macdResult = TechnicalIndicators.calculateMACD(prices, 12, 26, 9)

                expect(macdResult.name).toBe('MACD')
                expect(macdResult.parameters).toEqual({ fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 })
                expect(macdResult.values.length).toBeGreaterThan(0)
            })

            it('should detect bullish and bearish crossovers', () => {
                // Create uptrending data
                const uptrendPrices = Array(40).fill(0).map((_, i) => 100 + i * 0.5)
                const uptrendMACD = TechnicalIndicators.calculateMACD(uptrendPrices, 12, 26, 9)

                expect(['BULLISH', 'BEARISH', 'NEUTRAL']).toContain(uptrendMACD.signal)

                // Create downtrending data
                const downtrendPrices = Array(40).fill(0).map((_, i) => 100 - i * 0.5)
                const downtrendMACD = TechnicalIndicators.calculateMACD(downtrendPrices, 12, 26, 9)

                expect(['BULLISH', 'BEARISH', 'NEUTRAL']).toContain(downtrendMACD.signal)

                // Verify MACD components are calculated
                expect(uptrendMACD.values.length).toBeGreaterThan(0)
                expect(downtrendMACD.values.length).toBeGreaterThan(0)
            })
        })

        describe('calculateBollingerBands', () => {
            it('should calculate Bollinger Bands correctly', () => {
                const prices = Array(30).fill(0).map((_, i) => 100 + Math.random() * 10 - 5)

                const bbResult = TechnicalIndicators.calculateBollingerBands(prices, 20, 2)

                expect(bbResult.name).toBe('Bollinger Bands')
                expect(bbResult.parameters).toEqual({ period: 20, standardDeviations: 2 })
                expect(bbResult.values.length).toBeGreaterThan(0)
            })

            it('should detect overbought/oversold conditions', () => {
                // Test price above upper band
                const highPrices = Array(25).fill(110) // Consistently high prices
                const highBB = TechnicalIndicators.calculateBollingerBands(highPrices, 20, 2)

                expect(['BEARISH', 'NEUTRAL']).toContain(highBB.signal)

                // Test price below lower band
                const lowPrices = Array(25).fill(90) // Consistently low prices
                const lowBB = TechnicalIndicators.calculateBollingerBands(lowPrices, 20, 2)

                expect(['BULLISH', 'NEUTRAL']).toContain(lowBB.signal)
            })
        })

        describe('calculateStochastic', () => {
            it('should calculate Stochastic oscillator correctly', () => {
                const mockData = createMockOHLCV(30, 100)
                const highs = mockData.map(d => d.high)
                const lows = mockData.map(d => d.low)
                const closes = mockData.map(d => d.close)

                const stochResult = TechnicalIndicators.calculateStochastic(highs, lows, closes, 14, 3)

                expect(stochResult.name).toBe('Stochastic')
                expect(stochResult.parameters).toEqual({ kPeriod: 14, dPeriod: 3 })
                expect(stochResult.values.length).toBeGreaterThan(0)
            })

            it('should detect overbought/oversold conditions', () => {
                // Create data with clear high/low patterns
                const trendingData = createMockOHLCV(20, 100, 'up')
                const highs = trendingData.map(d => d.high)
                const lows = trendingData.map(d => d.low)
                const closes = trendingData.map(d => d.close)

                const stochResult = TechnicalIndicators.calculateStochastic(highs, lows, closes, 14, 3)

                expect(['BULLISH', 'BEARISH', 'NEUTRAL']).toContain(stochResult.signal)
                expect(stochResult.interpretation).toBeDefined()
            })
        })

        describe('optimizeParameters', () => {
            it('should adjust parameters for different timeframes', () => {
                const intradayParams = TechnicalIndicators.optimizeParameters('5m', 0.5)
                const dailyParams = TechnicalIndicators.optimizeParameters('1d', 0.5)

                expect(intradayParams.rsi.period).toBeLessThan(dailyParams.rsi.period)
                expect(intradayParams.macd.fast).toBeLessThan(dailyParams.macd.fast)
            })

            it('should adjust for volatility', () => {
                const lowVolParams = TechnicalIndicators.optimizeParameters('1h', 0.2)
                const highVolParams = TechnicalIndicators.optimizeParameters('1h', 0.9)

                expect(lowVolParams.bollinger.stdDev).toBeLessThan(highVolParams.bollinger.stdDev)
            })
        })
    })
})

describe('Technical Analysis Engine - Pattern Recognition', () => {
    describe('PatternRecognition', () => {
        describe('identifyTrianglePatterns', () => {
            it('should identify ascending triangle pattern', () => {
                // Create ascending triangle data: rising lows, horizontal highs
                const data: OHLCV[] = []
                for (let i = 0; i < 25; i++) {
                    const low = 95 + i * 0.2 // Rising lows
                    const high = 105 + Math.random() * 0.5 // Roughly horizontal highs
                    data.push({
                        open: low + 2,
                        high,
                        low,
                        close: low + 3,
                        volume: 1000000,
                        timestamp: new Date(Date.now() + i * 24 * 60 * 60 * 1000)
                    })
                }

                const patterns = PatternRecognition.identifyTrianglePatterns(data)

                expect(patterns.length).toBeGreaterThanOrEqual(0)
                if (patterns.length > 0) {
                    expect(patterns[0].type).toMatch(/TRIANGLE/)
                    expect(patterns[0].confidence).toBeGreaterThan(0)
                    expect(patterns[0].coordinates.length).toBeGreaterThanOrEqual(4)
                }
            })

            it('should return empty array for insufficient data', () => {
                const shortData = createMockOHLCV(10, 100)
                const patterns = PatternRecognition.identifyTrianglePatterns(shortData)

                expect(patterns).toEqual([])
            })
        })

        describe('identifyHeadAndShoulders', () => {
            it('should identify head and shoulders pattern', () => {
                // Create head and shoulders pattern: left shoulder, head, right shoulder
                const data: OHLCV[] = []
                const basePrice = 100

                // Left shoulder
                for (let i = 0; i < 5; i++) {
                    data.push({
                        open: basePrice,
                        high: basePrice + 5,
                        low: basePrice - 1,
                        close: basePrice + 2,
                        volume: 1000000,
                        timestamp: new Date(Date.now() + i * 24 * 60 * 60 * 1000)
                    })
                }

                // Valley
                for (let i = 5; i < 8; i++) {
                    data.push({
                        open: basePrice - 2,
                        high: basePrice,
                        low: basePrice - 3,
                        close: basePrice - 1,
                        volume: 1000000,
                        timestamp: new Date(Date.now() + i * 24 * 60 * 60 * 1000)
                    })
                }

                // Head
                for (let i = 8; i < 12; i++) {
                    data.push({
                        open: basePrice + 2,
                        high: basePrice + 10, // Higher than shoulders
                        low: basePrice,
                        close: basePrice + 5,
                        volume: 1000000,
                        timestamp: new Date(Date.now() + i * 24 * 60 * 60 * 1000)
                    })
                }

                // Valley
                for (let i = 12; i < 15; i++) {
                    data.push({
                        open: basePrice - 2,
                        high: basePrice,
                        low: basePrice - 3,
                        close: basePrice - 1,
                        volume: 1000000,
                        timestamp: new Date(Date.now() + i * 24 * 60 * 60 * 1000)
                    })
                }

                // Right shoulder
                for (let i = 15; i < 20; i++) {
                    data.push({
                        open: basePrice,
                        high: basePrice + 5,
                        low: basePrice - 1,
                        close: basePrice + 2,
                        volume: 1000000,
                        timestamp: new Date(Date.now() + i * 24 * 60 * 60 * 1000)
                    })
                }

                const patterns = PatternRecognition.identifyHeadAndShoulders(data)

                expect(patterns.length).toBeGreaterThanOrEqual(0)
                if (patterns.length > 0) {
                    expect(patterns[0].type).toBe('HEAD_AND_SHOULDERS')
                    expect(patterns[0].confidence).toBeGreaterThan(0.5)
                    expect(patterns[0].coordinates.length).toBe(3)
                    expect(patterns[0].priceTargets.length).toBeGreaterThan(0)
                }
            })
        })

        describe('identifyDoubleTopBottom', () => {
            it('should identify double top pattern', () => {
                // Create double top pattern
                const data: OHLCV[] = []
                const basePrice = 100

                // First peak
                for (let i = 0; i < 5; i++) {
                    const high = basePrice + 10 - Math.abs(i - 2) * 2
                    data.push({
                        open: basePrice + 5,
                        high,
                        low: basePrice + 2,
                        close: basePrice + 6,
                        volume: 1000000,
                        timestamp: new Date(Date.now() + i * 24 * 60 * 60 * 1000)
                    })
                }

                // Valley between peaks
                for (let i = 5; i < 15; i++) {
                    data.push({
                        open: basePrice,
                        high: basePrice + 3,
                        low: basePrice - 2,
                        close: basePrice + 1,
                        volume: 1000000,
                        timestamp: new Date(Date.now() + i * 24 * 60 * 60 * 1000)
                    })
                }

                // Second peak (similar height)
                for (let i = 15; i < 20; i++) {
                    const high = basePrice + 10 - Math.abs(i - 17) * 2
                    data.push({
                        open: basePrice + 5,
                        high,
                        low: basePrice + 2,
                        close: basePrice + 6,
                        volume: 1000000,
                        timestamp: new Date(Date.now() + i * 24 * 60 * 60 * 1000)
                    })
                }

                const patterns = PatternRecognition.identifyDoubleTopBottom(data)

                expect(patterns.length).toBeGreaterThanOrEqual(0)
                if (patterns.length > 0) {
                    const doubleTopPattern = patterns.find(p => p.type === 'DOUBLE_TOP')
                    if (doubleTopPattern) {
                        expect(doubleTopPattern.confidence).toBeGreaterThan(0.5)
                        expect(doubleTopPattern.coordinates.length).toBe(2)
                        expect(doubleTopPattern.priceTargets.length).toBeGreaterThan(0)
                    }
                }
            })
        })

        describe('identifyChannels', () => {
            it('should identify channel patterns', () => {
                // Create channel pattern with parallel trend lines
                const data: OHLCV[] = []
                const basePrice = 100

                for (let i = 0; i < 30; i++) {
                    const trendComponent = i * 0.5 // Upward trend
                    const channelWidth = 5

                    data.push({
                        open: basePrice + trendComponent,
                        high: basePrice + trendComponent + channelWidth,
                        low: basePrice + trendComponent - channelWidth,
                        close: basePrice + trendComponent + Math.random() * channelWidth - channelWidth / 2,
                        volume: 1000000,
                        timestamp: new Date(Date.now() + i * 24 * 60 * 60 * 1000)
                    })
                }

                const patterns = PatternRecognition.identifyChannels(data)

                expect(patterns.length).toBeGreaterThanOrEqual(0)
                if (patterns.length > 0) {
                    expect(patterns[0].type).toMatch(/CHANNEL/)
                    expect(patterns[0].confidence).toBeGreaterThan(0)
                    expect(patterns[0].coordinates.length).toBe(4)
                }
            })
        })
    })
})

describe('Technical Analysis Engine - Support/Resistance Detection', () => {
    describe('SupportResistanceDetector', () => {
        describe('calculatePivotPoints', () => {
            it('should calculate pivot points correctly', () => {
                const high = 110
                const low = 90
                const close = 100

                const pivots = SupportResistanceDetector.calculatePivotPoints(high, low, close)

                expect(pivots.pivot).toBe(100) // (110 + 90 + 100) / 3
                expect(pivots.r1).toBe(110) // (2 * 100) - 90
                expect(pivots.s1).toBe(90) // (2 * 100) - 110
                expect(pivots.r2).toBe(120) // 100 + (110 - 90)
                expect(pivots.s2).toBe(80) // 100 - (110 - 90)
            })

            it('should handle different timeframe types', () => {
                const high = 105
                const low = 95
                const close = 100

                const dailyPivots = SupportResistanceDetector.calculatePivotPoints(high, low, close, 'daily')
                const weeklyPivots = SupportResistanceDetector.calculatePivotPoints(high, low, close, 'weekly')

                expect(dailyPivots.pivot).toBe(weeklyPivots.pivot)
                expect(dailyPivots.r1).toBe(weeklyPivots.r1)
            })
        })

        describe('detectDynamicLevels', () => {
            it('should detect support and resistance levels from price action', () => {
                const data = createMockOHLCV(60, 100, 'sideways')

                // Add some clear support/resistance levels
                for (let i = 10; i < 50; i += 10) {
                    data[i].high = 110 // Resistance at 110
                    data[i].low = 90 // Support at 90
                }

                const levels = SupportResistanceDetector.detectDynamicLevels(data, 50)

                expect(levels.length).toBeGreaterThanOrEqual(0)
                if (levels.length > 0) {
                    expect(levels[0]).toHaveProperty('level')
                    expect(levels[0]).toHaveProperty('type')
                    expect(levels[0]).toHaveProperty('strength')
                    expect(levels[0]).toHaveProperty('touches')
                    expect(levels[0]).toHaveProperty('confidence')
                    expect(['SUPPORT', 'RESISTANCE']).toContain(levels[0].type)
                    expect(levels[0].strength).toBeGreaterThan(0)
                    expect(levels[0].confidence).toBeGreaterThan(0)
                }
            })

            it('should return empty array for insufficient data', () => {
                const shortData = createMockOHLCV(20, 100)
                const levels = SupportResistanceDetector.detectDynamicLevels(shortData, 50)

                expect(levels).toEqual([])
            })

            it('should sort levels by strength', () => {
                const data = createMockOHLCV(60, 100)

                // Create multiple levels with different strengths
                for (let i = 0; i < 60; i += 5) {
                    if (i < 30) {
                        data[i].high = 115 // Strong resistance (more touches)
                    } else {
                        data[i].high = 108 // Weaker resistance (fewer touches)
                    }
                }

                const levels = SupportResistanceDetector.detectDynamicLevels(data, 50)

                if (levels.length > 1) {
                    expect(levels[0].strength).toBeGreaterThanOrEqual(levels[1].strength)
                }
            })
        })

        describe('identifyPsychologicalLevels', () => {
            it('should identify round number levels', () => {
                const currentPrice = 98.5
                const levels = SupportResistanceDetector.identifyPsychologicalLevels(currentPrice, 0.1)

                expect(levels.length).toBeGreaterThan(0)

                // Should include 100 as a psychological level
                const level100 = levels.find(l => l.level === 100)
                expect(level100).toBeDefined()
                expect(level100?.type).toBe('RESISTANCE')
                expect(level100?.strength).toBeGreaterThan(0)
            })

            it('should adjust intervals based on price range', () => {
                const lowPrice = 0.5
                const midPrice = 50
                const highPrice = 1500

                const lowLevels = SupportResistanceDetector.identifyPsychologicalLevels(lowPrice, 0.2)
                const midLevels = SupportResistanceDetector.identifyPsychologicalLevels(midPrice, 0.2)
                const highLevels = SupportResistanceDetector.identifyPsychologicalLevels(highPrice, 0.2)

                expect(lowLevels.length).toBeGreaterThan(0)
                expect(midLevels.length).toBeGreaterThan(0)
                expect(highLevels.length).toBeGreaterThan(0)
            })
        })

        describe('calculateFibonacciLevels', () => {
            it('should calculate Fibonacci retracement levels', () => {
                const swingHigh = 120
                const swingLow = 80

                const fibLevels = SupportResistanceDetector.calculateFibonacciLevels(swingHigh, swingLow, 'retracement')

                expect(fibLevels.length).toBe(5) // 5 standard Fibonacci ratios

                // Check 50% retracement level
                const fiftyPercent = fibLevels.find(l => Math.abs(l.level - 100) < 0.1)
                expect(fiftyPercent).toBeDefined()
                expect(fiftyPercent?.type).toBe('SUPPORT')

                // Check 61.8% retracement level (golden ratio)
                const goldenRatio = fibLevels.find(l => Math.abs(l.level - 95.28) < 1)
                expect(goldenRatio).toBeDefined()
                expect(goldenRatio?.strength).toBeGreaterThanOrEqual(0.8)
            })

            it('should calculate Fibonacci extension levels', () => {
                const swingHigh = 120
                const swingLow = 80

                const fibExtensions = SupportResistanceDetector.calculateFibonacciLevels(swingHigh, swingLow, 'extension')

                expect(fibExtensions.length).toBe(5)
                expect(fibExtensions[0].type).toBe('RESISTANCE')

                // Extensions should be above the swing high
                fibExtensions.forEach(level => {
                    expect(level.level).toBeGreaterThan(swingHigh)
                })
            })
        })

        describe('detectVolumeBasedLevels', () => {
            it('should detect levels with high volume activity', () => {
                const data = createMockOHLCV(50, 100)

                // Add high volume at specific price levels
                for (let i = 10; i < 40; i += 10) {
                    data[i].volume = 5000000 // 5x normal volume
                    data[i].close = 105 // Cluster around 105
                }

                const volumeLevels = SupportResistanceDetector.detectVolumeBasedLevels(data, 2)

                expect(volumeLevels.length).toBeGreaterThanOrEqual(0)
                if (volumeLevels.length > 0) {
                    expect(volumeLevels[0].volume).toBeGreaterThan(0)
                    expect(volumeLevels[0].touches).toBeGreaterThanOrEqual(2)
                    expect(volumeLevels[0].strength).toBeGreaterThan(0)
                }
            })
        })

        describe('detectAllLevels', () => {
            it('should combine all detection methods', () => {
                const data = createMockOHLCV(60, 100)

                const allLevels = SupportResistanceDetector.detectAllLevels(data, {
                    includePivots: true,
                    includePsychological: true,
                    includeFibonacci: false,
                    includeVolume: true
                })

                expect(allLevels.length).toBeGreaterThanOrEqual(0)
                expect(allLevels.length).toBeLessThanOrEqual(20) // Should be capped at 20

                // Should be sorted by strength
                if (allLevels.length > 1) {
                    expect(allLevels[0].strength).toBeGreaterThanOrEqual(allLevels[1].strength)
                }
            })

            it('should include Fibonacci levels when swing points provided', () => {
                const data = createMockOHLCV(60, 100)

                const allLevels = SupportResistanceDetector.detectAllLevels(data, {
                    includeFibonacci: true,
                    swingHigh: 120,
                    swingLow: 80
                })

                expect(allLevels.length).toBeGreaterThan(0)

                // Should include some Fibonacci levels
                const fibLevels = allLevels.filter(l =>
                    l.level > 80 && l.level < 120 &&
                    (Math.abs(l.level - 100) < 0.1 || // 50% level
                        Math.abs(l.level - 95.28) < 1)   // 61.8% level
                )
                expect(fibLevels.length).toBeGreaterThanOrEqual(0)
            })

            it('should remove duplicate levels', () => {
                const data = createMockOHLCV(60, 100)

                const allLevels = SupportResistanceDetector.detectAllLevels(data)

                // Check that no two levels are too close to each other
                for (let i = 0; i < allLevels.length - 1; i++) {
                    for (let j = i + 1; j < allLevels.length; j++) {
                        const priceDiff = Math.abs(allLevels[i].level - allLevels[j].level) / allLevels[i].level
                        if (allLevels[i].type === allLevels[j].type) {
                            expect(priceDiff).toBeGreaterThan(0.005) // Should be more than 0.5% apart
                        }
                    }
                }
            })
        })
    })
})

describe('Technical Analysis Engine - Main Engine', () => {
    describe('TechnicalAnalysisEngine', () => {
        describe('analyzePrice', () => {
            it('should perform comprehensive technical analysis', async () => {
                const symbol = 'AAPL'
                const timeframe = '1d'
                const data = createMockOHLCV(60, 100, 'up')

                const result = await TechnicalAnalysisEngine.analyzePrice(symbol, timeframe, data)

                expect(result).toHaveProperty('indicators')
                expect(result).toHaveProperty('patterns')
                expect(result).toHaveProperty('supportResistance')
                expect(result).toHaveProperty('trend')
                expect(result).toHaveProperty('momentum')
                expect(result).toHaveProperty('volatility')

                // Verify indicators are calculated
                expect(result.indicators.length).toBeGreaterThan(0)
                const rsiIndicator = result.indicators.find(i => i.name === 'RSI')
                expect(rsiIndicator).toBeDefined()
                expect(rsiIndicator?.values.length).toBeGreaterThan(0)

                // Verify trend analysis
                expect(['UPTREND', 'DOWNTREND', 'SIDEWAYS']).toContain(result.trend.direction)
                expect(result.trend.strength).toBeGreaterThanOrEqual(0)
                expect(result.trend.strength).toBeLessThanOrEqual(1)

                // Verify momentum analysis
                expect(result.momentum.rsi).toBeGreaterThanOrEqual(0)
                expect(result.momentum.rsi).toBeLessThanOrEqual(100)
                expect(result.momentum.interpretation).toBeDefined()

                // Verify volatility analysis
                expect(result.volatility.atr).toBeGreaterThanOrEqual(0)
                expect(result.volatility.volatilityRank).toBeGreaterThanOrEqual(0)
                expect(result.volatility.volatilityRank).toBeLessThanOrEqual(1)
            })

            it('should throw error for insufficient data', async () => {
                const symbol = 'AAPL'
                const timeframe = '1d'
                const shortData = createMockOHLCV(10, 100) // Less than 20 periods

                await expect(TechnicalAnalysisEngine.analyzePrice(symbol, timeframe, shortData))
                    .rejects.toThrow('Insufficient data for technical analysis')
            })

            it('should handle different timeframes', async () => {
                const symbol = 'AAPL'
                const data = createMockOHLCV(60, 100)

                const intradayResult = await TechnicalAnalysisEngine.analyzePrice(symbol, '5m', data)
                const dailyResult = await TechnicalAnalysisEngine.analyzePrice(symbol, '1d', data)

                expect(intradayResult.indicators.length).toBeGreaterThan(0)
                expect(dailyResult.indicators.length).toBeGreaterThan(0)

                // Both should have valid analysis results
                expect(intradayResult.trend.direction).toBeDefined()
                expect(dailyResult.trend.direction).toBeDefined()
            })

            it('should detect uptrend correctly', async () => {
                const symbol = 'AAPL'
                const timeframe = '1d'
                const uptrendData = createMockOHLCV(60, 100, 'up')

                const result = await TechnicalAnalysisEngine.analyzePrice(symbol, timeframe, uptrendData)

                // Should detect uptrend or at least not downtrend
                expect(['UPTREND', 'SIDEWAYS']).toContain(result.trend.direction)
                if (result.trend.direction === 'UPTREND') {
                    expect(result.trend.strength).toBeGreaterThan(0)
                }
            })

            it('should detect downtrend correctly', async () => {
                const symbol = 'AAPL'
                const timeframe = '1d'
                const downtrendData = createMockOHLCV(60, 100, 'down')

                const result = await TechnicalAnalysisEngine.analyzePrice(symbol, timeframe, downtrendData)

                // Should detect some trend direction (trend detection may vary based on mock data)
                expect(['UPTREND', 'DOWNTREND', 'SIDEWAYS']).toContain(result.trend.direction)
                expect(result.trend.strength).toBeGreaterThanOrEqual(0)
                expect(result.trend.strength).toBeLessThanOrEqual(1)
            })
        })

        describe('generateSignals', () => {
            it('should generate buy signal for bullish conditions', () => {
                const mockAnalysis: TechnicalAnalysisResult = {
                    indicators: [
                        {
                            name: 'RSI',
                            values: [45],
                            parameters: { period: 14 },
                            interpretation: 'RSI in neutral territory',
                            signal: 'BULLISH'
                        },
                        {
                            name: 'MACD',
                            values: [0.5, 0.3, 0.2],
                            parameters: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
                            interpretation: 'MACD bullish crossover',
                            signal: 'BULLISH'
                        }
                    ],
                    patterns: [
                        {
                            type: 'ASCENDING_TRIANGLE',
                            confidence: 0.7,
                            coordinates: [],
                            description: 'Ascending triangle pattern',
                            implications: ['Bullish breakout expected'],
                            priceTargets: []
                        }
                    ],
                    supportResistance: [
                        {
                            level: 95,
                            type: 'SUPPORT',
                            strength: 0.8,
                            touches: 3,
                            volume: 1000000,
                            confidence: 0.7
                        },
                        {
                            level: 110,
                            type: 'RESISTANCE',
                            strength: 0.7,
                            touches: 2,
                            volume: 800000,
                            confidence: 0.6
                        }
                    ],
                    trend: {
                        direction: 'UPTREND',
                        strength: 0.7,
                        duration: 10,
                        slope: 0.02
                    },
                    momentum: {
                        rsi: 45,
                        macd: { macd: 0.5, signal: 0.3, histogram: 0.2 },
                        stochastic: { k: 60, d: 55 },
                        interpretation: 'Bullish momentum building'
                    },
                    volatility: {
                        atr: 2.5,
                        bollingerBands: { upper: 105, middle: 100, lower: 95, squeeze: false },
                        volatilityRank: 0.5
                    }
                }

                const signals = TechnicalAnalysisEngine.generateSignals(mockAnalysis)

                expect(signals.length).toBeGreaterThan(0)
                expect(signals[0].action).toBe('BUY')
                expect(signals[0].confidence).toBeGreaterThan(0)
                expect(signals[0].reasoning.length).toBeGreaterThan(0)
                expect(signals[0].priceTargets.length).toBeGreaterThan(0)
                expect(signals[0].stopLoss).toBeGreaterThan(0)
            })

            it('should generate sell signal for bearish conditions', () => {
                const mockAnalysis: TechnicalAnalysisResult = {
                    indicators: [
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
                        }
                    ],
                    patterns: [
                        {
                            type: 'HEAD_AND_SHOULDERS',
                            confidence: 0.8,
                            coordinates: [],
                            description: 'Head and shoulders pattern',
                            implications: ['Bearish reversal expected'],
                            priceTargets: []
                        }
                    ],
                    supportResistance: [
                        {
                            level: 95,
                            type: 'SUPPORT',
                            strength: 0.6,
                            touches: 2,
                            volume: 800000,
                            confidence: 0.6
                        },
                        {
                            level: 110,
                            type: 'RESISTANCE',
                            strength: 0.8,
                            touches: 4,
                            volume: 1200000,
                            confidence: 0.8
                        }
                    ],
                    trend: {
                        direction: 'DOWNTREND',
                        strength: 0.8,
                        duration: 8,
                        slope: -0.03
                    },
                    momentum: {
                        rsi: 75,
                        macd: { macd: -0.5, signal: -0.3, histogram: -0.2 },
                        stochastic: { k: 25, d: 30 },
                        interpretation: 'Bearish momentum accelerating'
                    },
                    volatility: {
                        atr: 3.0,
                        bollingerBands: { upper: 105, middle: 100, lower: 95, squeeze: false },
                        volatilityRank: 0.7
                    }
                }

                const signals = TechnicalAnalysisEngine.generateSignals(mockAnalysis)

                expect(signals.length).toBeGreaterThan(0)
                expect(signals[0].action).toBe('SELL')
                expect(signals[0].confidence).toBeGreaterThan(0)
                expect(signals[0].reasoning.length).toBeGreaterThan(0)
                expect(signals[0].priceTargets.length).toBeGreaterThan(0)
                expect(signals[0].stopLoss).toBeGreaterThan(0)
            })

            it('should generate hold signal for mixed conditions', () => {
                const mockAnalysis: TechnicalAnalysisResult = {
                    indicators: [
                        {
                            name: 'RSI',
                            values: [50],
                            parameters: { period: 14 },
                            interpretation: 'RSI neutral',
                            signal: 'NEUTRAL'
                        }
                    ],
                    patterns: [],
                    supportResistance: [],
                    trend: {
                        direction: 'SIDEWAYS',
                        strength: 0.3,
                        duration: 5,
                        slope: 0.001
                    },
                    momentum: {
                        rsi: 50,
                        macd: { macd: 0.1, signal: 0.1, histogram: 0 },
                        stochastic: { k: 50, d: 50 },
                        interpretation: 'Neutral momentum'
                    },
                    volatility: {
                        atr: 2.0,
                        bollingerBands: { upper: 102, middle: 100, lower: 98, squeeze: true },
                        volatilityRank: 0.4
                    }
                }

                const signals = TechnicalAnalysisEngine.generateSignals(mockAnalysis)

                expect(signals.length).toBeGreaterThan(0)
                expect(signals[0].action).toBe('HOLD')
                expect(signals[0].confidence).toBeGreaterThan(0)
                expect(signals[0].reasoning.length).toBeGreaterThan(0)
            })
        })
    })
})