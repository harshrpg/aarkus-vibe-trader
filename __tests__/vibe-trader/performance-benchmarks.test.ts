/**
 * Performance Benchmark Tests
 * Focused on measuring and validating specific performance characteristics
 */

import { VibeTraderController } from '../../lib/agents/vibe-trader'
import { PerformanceMonitor } from '../../lib/analysis/performance-monitor'
import { TechnicalAnalysisEngine } from '../../lib/agents/technical-analyzer'
import { MarketResearchAgent } from '../../lib/agents/market-researcher'

describe('Vibe Trader Performance Benchmarks', () => {
    let vibeTrader: VibeTraderController
    let performanceMonitor: PerformanceMonitor
    let technicalEngine: TechnicalAnalysisEngine
    let marketResearcher: MarketResearchAgent

    beforeAll(() => {
        vibeTrader = new VibeTraderController('gpt-4')
        performanceMonitor = PerformanceMonitor.getInstance()
        technicalEngine = new TechnicalAnalysisEngine()
        marketResearcher = new MarketResearchAgent()
        performanceMonitor.clearPerformanceData()
    })

    afterAll(() => {
        vibeTrader.destroy()
    })

    describe('Component-Level Performance Benchmarks', () => {
        it('should benchmark technical analysis engine performance', async () => {
            const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN']
            const timeframes = ['1H', '4H', '1D']
            const results: Array<{ symbol: string, timeframe: string, duration: number, memoryUsed: number }> = []

            for (const symbol of symbols) {
                for (const timeframe of timeframes) {
                    const startTime = Date.now()
                    const initialMemory = process.memoryUsage().heapUsed

                    try {
                        await technicalEngine.analyzePrice(symbol, timeframe)

                        const endTime = Date.now()
                        const finalMemory = process.memoryUsage().heapUsed

                        results.push({
                            symbol,
                            timeframe,
                            duration: endTime - startTime,
                            memoryUsed: finalMemory - initialMemory
                        })
                    } catch (error) {
                        // Log but continue with other tests
                        console.warn(`Technical analysis failed for ${symbol} ${timeframe}:`, error)
                    }
                }
            }

            // Analyze results
            const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length
            const maxDuration = Math.max(...results.map(r => r.duration))
            const avgMemory = results.reduce((sum, r) => sum + r.memoryUsed, 0) / results.length

            // Performance assertions
            expect(avgDuration).toBeLessThan(2000) // Average under 2 seconds
            expect(maxDuration).toBeLessThan(5000) // Max under 5 seconds
            expect(avgMemory).toBeLessThan(20 * 1024 * 1024) // Average under 20MB

            // Consistency check - no analysis should be more than 5x the average
            results.forEach(result => {
                expect(result.duration).toBeLessThan(avgDuration * 5)
            })
        })

        it('should benchmark market research agent performance', async () => {
            const symbols = ['AAPL', 'GOOGL', 'MSFT']
            const results: Array<{ symbol: string, duration: number, memoryUsed: number, dataQuality: number }> = []

            for (const symbol of symbols) {
                const startTime = Date.now()
                const initialMemory = process.memoryUsage().heapUsed

                try {
                    const fundamentalData = await marketResearcher.researchFundamentals(symbol)

                    const endTime = Date.now()
                    const finalMemory = process.memoryUsage().heapUsed

                    // Assess data quality
                    let dataQuality = 0
                    if (fundamentalData.newsAnalysis?.relevantNews?.length > 0) dataQuality += 0.3
                    if (fundamentalData.marketSentiment > 0) dataQuality += 0.3
                    if (fundamentalData.sectorAnalysis) dataQuality += 0.2
                    if (fundamentalData.upcomingEvents?.length > 0) dataQuality += 0.2

                    results.push({
                        symbol,
                        duration: endTime - startTime,
                        memoryUsed: finalMemory - initialMemory,
                        dataQuality
                    })
                } catch (error) {
                    console.warn(`Market research failed for ${symbol}:`, error)
                }
            }

            // Performance assertions
            const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length
            const avgDataQuality = results.reduce((sum, r) => sum + r.dataQuality, 0) / results.length

            expect(avgDuration).toBeLessThan(8000) // Average under 8 seconds
            expect(avgDataQuality).toBeGreaterThan(0.5) // At least 50% data quality

            // All research should complete within reasonable time
            results.forEach(result => {
                expect(result.duration).toBeLessThan(15000) // Max 15 seconds
                expect(result.memoryUsed).toBeLessThan(50 * 1024 * 1024) // Max 50MB
            })
        })
    })

    describe('End-to-End Performance Benchmarks', () => {
        it('should benchmark complete analysis workflow', async () => {
            const testCases = [
                { symbol: 'AAPL', timeframe: '1D', includeAll: false },
                { symbol: 'GOOGL', timeframe: '4H', includeAll: false },
                { symbol: 'MSFT', timeframe: '1D', includeAll: true },
                { symbol: 'TSLA', timeframe: '1H', includeAll: false },
                { symbol: 'AMZN', timeframe: '1D', includeAll: true }
            ]

            const benchmarkResults: Array<{
                symbol: string
                timeframe: string
                includeAll: boolean
                duration: number
                memoryUsed: number
                recommendationCount: number
                confidence: number
            }> = []

            for (const testCase of testCases) {
                const startTime = Date.now()
                const initialMemory = process.memoryUsage().heapUsed

                const result = await vibeTrader.initiateAnalysis(testCase.symbol, testCase.timeframe, {
                    includeFundamentals: testCase.includeAll,
                    includePatterns: testCase.includeAll,
                    multiTimeframe: testCase.includeAll
                })

                const endTime = Date.now()
                const finalMemory = process.memoryUsage().heapUsed

                const avgConfidence = result.recommendations.length > 0
                    ? result.recommendations.reduce((sum, rec) => sum + rec.confidence, 0) / result.recommendations.length
                    : 0

                benchmarkResults.push({
                    symbol: testCase.symbol,
                    timeframe: testCase.timeframe,
                    includeAll: testCase.includeAll,
                    duration: endTime - startTime,
                    memoryUsed: finalMemory - initialMemory,
                    recommendationCount: result.recommendations.length,
                    confidence: avgConfidence
                })
            }

            // Analyze benchmark results
            const simpleAnalyses = benchmarkResults.filter(r => !r.includeAll)
            const complexAnalyses = benchmarkResults.filter(r => r.includeAll)

            // Simple analyses should be fast
            const avgSimpleDuration = simpleAnalyses.reduce((sum, r) => sum + r.duration, 0) / simpleAnalyses.length
            expect(avgSimpleDuration).toBeLessThan(5000) // Under 5 seconds

            // Complex analyses should still be reasonable
            const avgComplexDuration = complexAnalyses.reduce((sum, r) => sum + r.duration, 0) / complexAnalyses.length
            expect(avgComplexDuration).toBeLessThan(20000) // Under 20 seconds

            // All analyses should produce recommendations
            benchmarkResults.forEach(result => {
                expect(result.recommendationCount).toBeGreaterThan(0)
                expect(result.confidence).toBeGreaterThan(0.2) // At least 20% confidence
            })

            // Complex analyses should generally take longer but not excessively
            if (simpleAnalyses.length > 0 && complexAnalyses.length > 0) {
                const complexityRatio = avgComplexDuration / avgSimpleDuration
                expect(complexityRatio).toBeGreaterThan(1) // Complex should take longer
                expect(complexityRatio).toBeLessThan(5) // But not more than 5x longer
            }
        })

        it('should benchmark multi-timeframe analysis performance', async () => {
            const symbols = ['AAPL', 'GOOGL']
            const timeframeCombinations = [
                ['1H', '4H'],
                ['4H', '1D'],
                ['1H', '4H', '1D'],
                ['1H', '4H', '1D', '1W']
            ]

            const results: Array<{
                symbol: string
                timeframes: string[]
                duration: number
                memoryUsed: number
                confluenceSignals: number
            }> = []

            for (const symbol of symbols) {
                for (const timeframes of timeframeCombinations) {
                    const startTime = Date.now()
                    const initialMemory = process.memoryUsage().heapUsed

                    const result = await vibeTrader.initiateMultiTimeframeAnalysis(
                        symbol,
                        timeframes[0],
                        timeframes
                    )

                    const endTime = Date.now()
                    const finalMemory = process.memoryUsage().heapUsed

                    results.push({
                        symbol,
                        timeframes,
                        duration: endTime - startTime,
                        memoryUsed: finalMemory - initialMemory,
                        confluenceSignals: result.confluenceSignals?.length || 0
                    })
                }
            }

            // Performance should scale reasonably with timeframe count
            const timeframe2 = results.filter(r => r.timeframes.length === 2)
            const timeframe4 = results.filter(r => r.timeframes.length === 4)

            if (timeframe2.length > 0 && timeframe4.length > 0) {
                const avg2Duration = timeframe2.reduce((sum, r) => sum + r.duration, 0) / timeframe2.length
                const avg4Duration = timeframe4.reduce((sum, r) => sum + r.duration, 0) / timeframe4.length

                // 4 timeframes should not take more than 3x the time of 2 timeframes
                const scalingRatio = avg4Duration / avg2Duration
                expect(scalingRatio).toBeLessThan(3)
            }

            // All multi-timeframe analyses should complete within reasonable time
            results.forEach(result => {
                expect(result.duration).toBeLessThan(25000) // Max 25 seconds
                expect(result.memoryUsed).toBeLessThan(100 * 1024 * 1024) // Max 100MB
            })
        })
    })

    describe('Stress Testing and Limits', () => {
        it('should handle maximum concurrent load', async () => {
            const maxConcurrent = 8
            const symbols = Array.from({ length: maxConcurrent }, (_, i) => `STRESS_${i}`)

            const startTime = Date.now()
            const initialMemory = process.memoryUsage().heapUsed

            // Start all analyses simultaneously
            const promises = symbols.map(symbol =>
                vibeTrader.initiateAnalysis(symbol, '1D', {
                    includeFundamentals: false
                }).catch(error => {
                    console.warn(`Analysis failed for ${symbol}:`, error)
                    return null
                })
            )

            const results = await Promise.all(promises)

            const endTime = Date.now()
            const finalMemory = process.memoryUsage().heapUsed
            const totalDuration = endTime - startTime
            const memoryUsed = finalMemory - initialMemory

            // Count successful analyses
            const successfulResults = results.filter(r => r !== null)
            const successRate = successfulResults.length / maxConcurrent

            // Should handle most concurrent requests successfully
            expect(successRate).toBeGreaterThan(0.7) // At least 70% success rate

            // Should complete within reasonable time even under stress
            expect(totalDuration).toBeLessThan(30000) // Max 30 seconds

            // Memory usage should be reasonable
            expect(memoryUsed).toBeLessThan(300 * 1024 * 1024) // Max 300MB

            // Performance metrics should still be available
            const metrics = performanceMonitor.getPerformanceMetrics()
            expect(metrics.resourceUtilization.concurrentAnalyses).toBeLessThanOrEqual(maxConcurrent)
        })

        it('should maintain performance under memory pressure', async () => {
            // Create some memory pressure by running multiple analyses
            const memoryPressureAnalyses = Array.from({ length: 6 }, (_, i) =>
                vibeTrader.initiateAnalysis(`MEMORY_PRESSURE_${i}`, '1D', {
                    includeFundamentals: true,
                    includePatterns: true
                })
            )

            await Promise.all(memoryPressureAnalyses)

            // Now test performance under this memory pressure
            const testStartTime = Date.now()
            const testResult = await vibeTrader.initiateAnalysis('UNDER_PRESSURE', '1D', {
                includeFundamentals: false
            })
            const testEndTime = Date.now()

            const testDuration = testEndTime - testStartTime

            // Should still perform reasonably well under memory pressure
            expect(testDuration).toBeLessThan(8000) // Max 8 seconds
            expect(testResult).toBeDefined()
            expect(testResult.symbol).toBe('UNDER_PRESSURE')

            // Memory metrics should be available
            const metrics = performanceMonitor.getPerformanceMetrics()
            expect(metrics.memoryUsage.heapUsed).toBeGreaterThan(0)
        })

        it('should recover gracefully from resource exhaustion', async () => {
            // Simulate resource exhaustion by running many analyses
            const exhaustionPromises = Array.from({ length: 10 }, (_, i) =>
                vibeTrader.initiateAnalysis(`EXHAUSTION_${i}`, '1D', {
                    includeFundamentals: true
                }).catch(() => null) // Ignore failures
            )

            await Promise.all(exhaustionPromises)

            // Wait a moment for recovery
            await new Promise(resolve => setTimeout(resolve, 1000))

            // Test recovery
            const recoveryStartTime = Date.now()
            const recoveryResult = await vibeTrader.initiateAnalysis('RECOVERY_TEST', '1D', {
                includeFundamentals: false
            })
            const recoveryEndTime = Date.now()

            // Should recover and perform normally
            expect(recoveryResult).toBeDefined()
            expect(recoveryResult.symbol).toBe('RECOVERY_TEST')
            expect(recoveryEndTime - recoveryStartTime).toBeLessThan(10000) // Should not be excessively slow

            // Performance monitoring should still work
            const postRecoveryMetrics = performanceMonitor.getPerformanceMetrics()
            expect(postRecoveryMetrics.analysisSpeed.totalAnalyses).toBeGreaterThan(0)
        })
    })

    describe('Performance Regression Detection', () => {
        it('should detect performance regressions in analysis speed', async () => {
            // Establish baseline performance
            const baselineRuns = 3
            const baselineTimes: number[] = []

            for (let i = 0; i < baselineRuns; i++) {
                const startTime = Date.now()
                await vibeTrader.initiateAnalysis(`BASELINE_${i}`, '1D', {
                    includeFundamentals: false
                })
                const endTime = Date.now()
                baselineTimes.push(endTime - startTime)
            }

            const baselineAverage = baselineTimes.reduce((sum, t) => sum + t, 0) / baselineTimes.length

            // Run test analyses
            const testRuns = 3
            const testTimes: number[] = []

            for (let i = 0; i < testRuns; i++) {
                const startTime = Date.now()
                await vibeTrader.initiateAnalysis(`REGRESSION_TEST_${i}`, '1D', {
                    includeFundamentals: false
                })
                const endTime = Date.now()
                testTimes.push(endTime - startTime)
            }

            const testAverage = testTimes.reduce((sum, t) => sum + t, 0) / testTimes.length

            // Check for regression (test should not be more than 50% slower than baseline)
            const regression = (testAverage - baselineAverage) / baselineAverage
            expect(regression).toBeLessThan(0.5) // Less than 50% regression

            // Individual runs should not be excessively slow
            testTimes.forEach(time => {
                expect(time).toBeLessThan(baselineAverage * 2) // No single run more than 2x baseline
            })
        })

        it('should detect memory usage regressions', async () => {
            // Measure baseline memory usage
            const initialMemory = process.memoryUsage().heapUsed

            await vibeTrader.initiateAnalysis('MEMORY_BASELINE', '1D', {
                includeFundamentals: false
            })

            const baselineMemory = process.memoryUsage().heapUsed
            const baselineUsage = baselineMemory - initialMemory

            // Run test analysis
            const testInitialMemory = process.memoryUsage().heapUsed

            await vibeTrader.initiateAnalysis('MEMORY_REGRESSION_TEST', '1D', {
                includeFundamentals: false
            })

            const testFinalMemory = process.memoryUsage().heapUsed
            const testUsage = testFinalMemory - testInitialMemory

            // Memory usage should not increase dramatically
            const memoryRegression = (testUsage - baselineUsage) / Math.abs(baselineUsage)
            expect(memoryRegression).toBeLessThan(1.0) // Less than 100% increase

            // Absolute memory usage should be reasonable
            expect(testUsage).toBeLessThan(100 * 1024 * 1024) // Less than 100MB
        })
    })
})