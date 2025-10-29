import { AnalysisHistoryManager } from '../../lib/analysis/analysis-history'
import { AnalysisResult, TradingSignal, OHLCV } from '../../lib/types/trading'

describe('AnalysisHistoryManager', () => {
    let historyManager: AnalysisHistoryManager

    const mockAnalysisResult: AnalysisResult = {
        symbol: 'AAPL',
        timestamp: new Date(),
        technicalAnalysis: {
            indicators: [],
            patterns: [],
            supportResistance: [],
            trend: {
                direction: 'UPTREND',
                strength: 0.7,
                duration: 5,
                slope: 0.1
            },
            momentum: {
                rsi: 65,
                macd: { macd: 0.5, signal: 0.3, histogram: 0.2 },
                stochastic: { k: 70, d: 65 },
                interpretation: 'Bullish momentum'
            },
            volatility: {
                atr: 2.5,
                bollingerBands: { upper: 105, middle: 100, lower: 95, squeeze: false },
                volatilityRank: 0.6
            }
        },
        fundamentalAnalysis: {
            companyInfo: {
                name: 'Apple Inc.',
                sector: 'Technology',
                industry: 'Consumer Electronics',
                marketCap: 3000000000000,
                description: 'Technology company'
            },
            financialMetrics: {
                pe: 25,
                eps: 6.0,
                revenue: 365000000000,
                revenueGrowth: 0.05,
                profitMargin: 0.25,
                debtToEquity: 1.5
            },
            newsAnalysis: {
                sentiment: 'POSITIVE',
                relevantNews: [],
                sentimentScore: 0.7,
                keyThemes: ['earnings', 'innovation']
            },
            sectorAnalysis: {
                sectorPerformance: 0.1,
                relativeStrength: 1.2,
                peerComparison: [],
                sectorTrends: []
            },
            marketSentiment: {
                overall: 0.6,
                news: 0.7,
                social: 0.5,
                analyst: 0.6
            },
            upcomingEvents: []
        },
        recommendations: [{
            action: 'BUY',
            confidence: 0.75,
            reasoning: ['Strong uptrend', 'Positive momentum'],
            priceTargets: [{ level: 110, type: 'TARGET', confidence: 0.7, reasoning: 'Technical target' }],
            stopLoss: 95,
            timeHorizon: 'Medium-term',
            riskLevel: 'MEDIUM'
        }],
        confidence: 0.75,
        chartAnnotations: [],
        summary: 'Bullish analysis for AAPL'
    }

    beforeEach(() => {
        historyManager = new AnalysisHistoryManager(50)
    })

    describe('storeAnalysis', () => {
        it('should store analysis successfully', () => {
            const analysisId = historyManager.storeAnalysis('AAPL', mockAnalysisResult)

            expect(analysisId).toBeDefined()
            expect(analysisId).toContain('AAPL')

            const history = historyManager.getAnalysisHistory('AAPL')
            expect(history).toHaveLength(1)
            expect(history[0].id).toBe(analysisId)
            expect(history[0].symbol).toBe('AAPL')
        })

        it('should limit history size', () => {
            const smallHistoryManager = new AnalysisHistoryManager(3)

            // Store 5 analyses
            for (let i = 0; i < 5; i++) {
                smallHistoryManager.storeAnalysis('AAPL', {
                    ...mockAnalysisResult,
                    timestamp: new Date(Date.now() + i * 1000)
                })
            }

            const history = smallHistoryManager.getAnalysisHistory('AAPL')
            expect(history).toHaveLength(3) // Should be limited to 3
        })

        it('should store multiple symbols separately', () => {
            historyManager.storeAnalysis('AAPL', mockAnalysisResult)
            historyManager.storeAnalysis('GOOGL', {
                ...mockAnalysisResult,
                symbol: 'GOOGL'
            })

            const aaplHistory = historyManager.getAnalysisHistory('AAPL')
            const googlHistory = historyManager.getAnalysisHistory('GOOGL')

            expect(aaplHistory).toHaveLength(1)
            expect(googlHistory).toHaveLength(1)
            expect(aaplHistory[0].symbol).toBe('AAPL')
            expect(googlHistory[0].symbol).toBe('GOOGL')
        })
    })

    describe('updateAnalysisOutcome', () => {
        it('should update analysis with outcome', () => {
            const analysisId = historyManager.storeAnalysis('AAPL', mockAnalysisResult)

            historyManager.updateAnalysisOutcome('AAPL', analysisId, 110, 30)

            const history = historyManager.getAnalysisHistory('AAPL')
            const analysis = history[0]

            expect(analysis.actualOutcome).toBeDefined()
            expect(analysis.actualOutcome!.priceAtOutcome).toBe(110)
            expect(analysis.actualOutcome!.priceChangePercent).toBe(10) // 10% gain
            expect(analysis.actualOutcome!.recommendationAccuracy.wasCorrect).toBe(true) // BUY signal was correct
        })

        it('should handle incorrect predictions', () => {
            const sellAnalysis = {
                ...mockAnalysisResult,
                recommendations: [{
                    action: 'SELL' as const,
                    confidence: 0.8,
                    reasoning: ['Bearish signal'],
                    priceTargets: [{ level: 90, type: 'TARGET' as const, confidence: 0.7, reasoning: 'Target' }],
                    stopLoss: 105,
                    timeHorizon: 'Short-term',
                    riskLevel: 'HIGH' as const
                }]
            }

            const analysisId = historyManager.storeAnalysis('AAPL', sellAnalysis)

            // Price went up instead of down
            historyManager.updateAnalysisOutcome('AAPL', analysisId, 110, 15)

            const history = historyManager.getAnalysisHistory('AAPL')
            const analysis = history[0]

            expect(analysis.actualOutcome!.recommendationAccuracy.wasCorrect).toBe(false)
            expect(analysis.actualOutcome!.priceChangePercent).toBe(10)
        })
    })

    describe('compareAnalysisPerformance', () => {
        beforeEach(() => {
            // Store multiple analyses with outcomes
            for (let i = 0; i < 10; i++) {
                const analysis = {
                    ...mockAnalysisResult,
                    timestamp: new Date(Date.now() - (9 - i) * 24 * 60 * 60 * 1000),
                    recommendations: [{
                        action: i % 2 === 0 ? 'BUY' as const : 'SELL' as const,
                        confidence: 0.6 + (i * 0.02),
                        reasoning: ['Test reasoning'],
                        priceTargets: [],
                        stopLoss: 0,
                        timeHorizon: 'Medium-term',
                        riskLevel: 'MEDIUM' as const
                    }]
                }

                const analysisId = historyManager.storeAnalysis('AAPL', analysis)

                // Simulate outcomes - make some correct and some incorrect
                const isCorrect = i % 3 !== 0 // 2/3 correct
                const priceChange = isCorrect ?
                    (analysis.recommendations[0].action === 'BUY' ? 105 : 95) :
                    (analysis.recommendations[0].action === 'BUY' ? 95 : 105)

                historyManager.updateAnalysisOutcome('AAPL', analysisId, priceChange, 30)
            }
        })

        it('should calculate accuracy metrics correctly', () => {
            const comparison = historyManager.compareAnalysisPerformance('AAPL')

            expect(comparison.accuracyMetrics.totalAnalyses).toBe(10)
            expect(comparison.accuracyMetrics.accuracyRate).toBeCloseTo(0.67, 1) // ~67% accuracy
            expect(comparison.accuracyMetrics.byAction.BUY.total).toBe(5)
            expect(comparison.accuracyMetrics.byAction.SELL.total).toBe(5)
        })

        it('should calculate performance metrics', () => {
            const comparison = historyManager.compareAnalysisPerformance('AAPL')

            expect(comparison.performanceMetrics.winRate).toBeGreaterThan(0)
            expect(comparison.performanceMetrics.averageReturn).toBeDefined()
            expect(comparison.performanceMetrics.totalReturn).toBeDefined()
        })

        it('should analyze trends', () => {
            const comparison = historyManager.compareAnalysisPerformance('AAPL')

            expect(comparison.trendAnalysis.recentPerformance).toBeGreaterThanOrEqual(0)
            expect(comparison.trendAnalysis.recentPerformance).toBeLessThanOrEqual(1)
            expect(typeof comparison.trendAnalysis.improvingAccuracy).toBe('boolean')
        })

        it('should generate recommendations', () => {
            const comparison = historyManager.compareAnalysisPerformance('AAPL')

            expect(Array.isArray(comparison.recommendations.strengthAreas)).toBe(true)
            expect(Array.isArray(comparison.recommendations.improvementAreas)).toBe(true)
            expect(Array.isArray(comparison.recommendations.recommendedAdjustments)).toBe(true)
        })
    })

    describe('getAccuracyTrends', () => {
        beforeEach(() => {
            // Store 20 analyses with varying accuracy over time
            for (let i = 0; i < 20; i++) {
                const analysis = {
                    ...mockAnalysisResult,
                    timestamp: new Date(Date.now() - (19 - i) * 24 * 60 * 60 * 1000)
                }

                const analysisId = historyManager.storeAnalysis('AAPL', analysis)

                // Simulate improving accuracy over time
                const isCorrect = Math.random() < (0.3 + i * 0.02) // Accuracy improves from 30% to 68%
                const priceChange = isCorrect ? 105 : 95

                historyManager.updateAnalysisOutcome('AAPL', analysisId, priceChange, 30)
            }
        })

        it('should calculate accuracy trends', () => {
            const trends = historyManager.getAccuracyTrends('AAPL', 5)

            expect(trends.length).toBeGreaterThan(0)
            expect(trends[0]).toHaveProperty('date')
            expect(trends[0]).toHaveProperty('accuracy')
            expect(trends[0]).toHaveProperty('confidence')
            expect(trends[0]).toHaveProperty('movingAverage')
        })

        it('should show improving trend', () => {
            const trends = historyManager.getAccuracyTrends('AAPL', 5)

            if (trends.length >= 2) {
                // Recent accuracy should be higher than earlier accuracy
                const recentAccuracy = trends[0].accuracy
                const earlierAccuracy = trends[trends.length - 1].accuracy

                expect(recentAccuracy).toBeGreaterThanOrEqual(earlierAccuracy - 0.1) // Allow some variance
            }
        })
    })

    describe('Performance Tests', () => {
        it('should handle large history efficiently', () => {
            const startTime = Date.now()

            // Store 1000 analyses
            for (let i = 0; i < 1000; i++) {
                historyManager.storeAnalysis(`STOCK${i % 10}`, {
                    ...mockAnalysisResult,
                    symbol: `STOCK${i % 10}`,
                    timestamp: new Date(Date.now() - i * 60 * 60 * 1000)
                })
            }

            const endTime = Date.now()
            const executionTime = endTime - startTime

            // Should complete within 2 seconds
            expect(executionTime).toBeLessThan(2000)
        })

        it('should retrieve history quickly', () => {
            // Store some analyses
            for (let i = 0; i < 100; i++) {
                historyManager.storeAnalysis('AAPL', {
                    ...mockAnalysisResult,
                    timestamp: new Date(Date.now() - i * 60 * 60 * 1000)
                })
            }

            const startTime = Date.now()
            const history = historyManager.getAnalysisHistory('AAPL', 50)
            const endTime = Date.now()

            expect(endTime - startTime).toBeLessThan(100) // Should be very fast
            expect(history).toHaveLength(50)
        })

        it('should calculate comparisons efficiently', () => {
            // Store analyses with outcomes
            for (let i = 0; i < 50; i++) {
                const analysisId = historyManager.storeAnalysis('AAPL', {
                    ...mockAnalysisResult,
                    timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
                })

                historyManager.updateAnalysisOutcome('AAPL', analysisId, 100 + Math.random() * 20, 30)
            }

            const startTime = Date.now()
            const comparison = historyManager.compareAnalysisPerformance('AAPL')
            const endTime = Date.now()

            expect(endTime - startTime).toBeLessThan(500) // Should complete within 500ms
            expect(comparison.accuracyMetrics.totalAnalyses).toBe(50)
        })
    })

    describe('Memory Tests', () => {
        it('should maintain reasonable memory usage', () => {
            const initialMemory = process.memoryUsage().heapUsed

            // Store many analyses
            for (let i = 0; i < 1000; i++) {
                historyManager.storeAnalysis('AAPL', {
                    ...mockAnalysisResult,
                    timestamp: new Date(Date.now() - i * 60 * 60 * 1000)
                })
            }

            const finalMemory = process.memoryUsage().heapUsed
            const memoryIncrease = finalMemory - initialMemory

            // Memory increase should be reasonable (less than 50MB for 1000 analyses)
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
        })

        it('should respect history limits', () => {
            const limitedManager = new AnalysisHistoryManager(10)

            // Store more than the limit
            for (let i = 0; i < 20; i++) {
                limitedManager.storeAnalysis('AAPL', {
                    ...mockAnalysisResult,
                    timestamp: new Date(Date.now() - i * 60 * 60 * 1000)
                })
            }

            const history = limitedManager.getAnalysisHistory('AAPL')
            expect(history).toHaveLength(10) // Should respect the limit
        })
    })
})