import { VibeTraderController } from '../../lib/agents/vibe-trader'
import { PerformanceMonitor } from '../../lib/analysis/performance-monitor'
import { OHLCV } from '../../lib/types/trading'

describe('Vibe Trader Performance Integration Tests', () => {
    let vibeTrader: VibeTraderController
    let performanceMonitor: PerformanceMonitor

    // Mock price data for different market conditions
    const generateMockPriceData = (condition: 'trending' | 'volatile' | 'sideways' | 'crash'): OHLCV[] => {
        return Array.from({ length: 100 }, (_, i) => {
            let basePrice = 100
            let volatility = 1

            switch (condition) {
                case 'trending':
                    basePrice = 100 + (i * 0.5) // Upward trend
                    volatility = 0.5
                    break
                case 'volatile':
                    basePrice = 100 + Math.sin(i * 0.1) * 20 // High volatility
                    volatility = 3
                    break
                case 'sideways':
                    basePrice = 100 + Math.sin(i * 0.05) * 2 // Low volatility sideways
                    volatility = 0.2
                    break
                case 'crash':
                    basePrice = 100 - (i * 0.8) // Downward crash
                    volatility = 2
                    break
            }

            const open = basePrice + (Math.random() - 0.5) * volatility
            const close = basePrice + (Math.random() - 0.5) * volatility
            const high = Math.max(open, close) + Math.random() * volatility
            const low = Math.min(open, close) - Math.random() * volatility

            return {
                open,
                high,
                low,
                close,
                volume: 1000000 + Math.random() * 500000,
                timestamp: new Date(Date.now() - (99 - i) * 24 * 60 * 60 * 1000)
            }
        })
    }

    const mockPriceData: OHLCV[] = generateMockPriceData('trending')

    beforeAll(() => {
        vibeTrader = new VibeTraderController('gpt-4')
        performanceMonitor = PerformanceMonitor.getInstance()
        performanceMonitor.clearPerformanceData()
    })

    afterAll(() => {
        vibeTrader.destroy()
    })

    describe('Single Analysis Performance', () => {
        it('should complete single timeframe analysis within performance thresholds', async () => {
            const startTime = Date.now()
            const initialMemory = process.memoryUsage().heapUsed

            const result = await vibeTrader.initiateAnalysis('AAPL', '1D', {
                includeFundamentals: false // Skip fundamentals for faster test
            })

            const endTime = Date.now()
            const finalMemory = process.memoryUsage().heapUsed
            const executionTime = endTime - startTime
            const memoryUsed = finalMemory - initialMemory

            // Performance assertions
            expect(executionTime).toBeLessThan(5000) // Should complete within 5 seconds
            expect(memoryUsed).toBeLessThan(50 * 1024 * 1024) // Should use less than 50MB
            expect(result).toBeDefined()
            expect(result.symbol).toBe('AAPL')
            expect(result.recommendations).toHaveLength(1)
        })

        it('should handle concurrent single analyses efficiently', async () => {
            const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN']
            const startTime = Date.now()
            const initialMemory = process.memoryUsage().heapUsed

            // Run concurrent analyses
            const promises = symbols.map(symbol =>
                vibeTrader.initiateAnalysis(symbol, '1D', {
                    includeFundamentals: false
                })
            )

            const results = await Promise.all(promises)

            const endTime = Date.now()
            const finalMemory = process.memoryUsage().heapUsed
            const executionTime = endTime - startTime
            const memoryUsed = finalMemory - initialMemory

            // Performance assertions
            expect(executionTime).toBeLessThan(10000) // Should complete within 10 seconds
            expect(memoryUsed).toBeLessThan(100 * 1024 * 1024) // Should use less than 100MB total
            expect(results).toHaveLength(5)
            results.forEach((result, index) => {
                expect(result.symbol).toBe(symbols[index])
            })
        })
    })

    describe('Multi-Timeframe Analysis Performance', () => {
        it('should complete multi-timeframe analysis within performance thresholds', async () => {
            const startTime = Date.now()
            const initialMemory = process.memoryUsage().heapUsed

            const result = await vibeTrader.initiateMultiTimeframeAnalysis(
                'AAPL',
                '1D',
                ['1H', '4H', '1D', '1W']
            )

            const endTime = Date.now()
            const finalMemory = process.memoryUsage().heapUsed
            const executionTime = endTime - startTime
            const memoryUsed = finalMemory - initialMemory

            // Performance assertions
            expect(executionTime).toBeLessThan(15000) // Should complete within 15 seconds
            expect(memoryUsed).toBeLessThan(100 * 1024 * 1024) // Should use less than 100MB
            expect(result).toBeDefined()
            expect(result.symbol).toBe('AAPL')
            expect(result.timeframeAnalyses.length).toBeGreaterThan(0)
            expect(result.confluenceSignals).toHaveLength(1)
        })

        it('should handle multiple multi-timeframe analyses', async () => {
            const symbols = ['AAPL', 'GOOGL', 'MSFT']
            const startTime = Date.now()
            const initialMemory = process.memoryUsage().heapUsed

            const results = []
            for (const symbol of symbols) {
                const result = await vibeTrader.initiateMultiTimeframeAnalysis(
                    symbol,
                    '1D',
                    ['4H', '1D']
                )
                results.push(result)
            }

            const endTime = Date.now()
            const finalMemory = process.memoryUsage().heapUsed
            const executionTime = endTime - startTime
            const memoryUsed = finalMemory - initialMemory

            // Performance assertions
            expect(executionTime).toBeLessThan(30000) // Should complete within 30 seconds
            expect(memoryUsed).toBeLessThan(150 * 1024 * 1024) // Should use less than 150MB
            expect(results).toHaveLength(3)
        })
    })

    describe('Analysis History Performance', () => {
        it('should handle large analysis history efficiently', async () => {
            const startTime = Date.now()

            // Generate many historical analyses
            for (let i = 0; i < 50; i++) {
                await vibeTrader.initiateAnalysis(`STOCK${i % 10}`, '1D', {
                    includeFundamentals: false
                })
            }

            const endTime = Date.now()
            const executionTime = endTime - startTime

            // Should handle 50 analyses reasonably quickly
            expect(executionTime).toBeLessThan(60000) // Within 1 minute

            // Test history retrieval performance
            const historyStartTime = Date.now()
            const history = vibeTrader.getAnalysisHistory('STOCK0', 20)
            const historyEndTime = Date.now()

            expect(historyEndTime - historyStartTime).toBeLessThan(100) // Very fast retrieval
            expect(history.length).toBeGreaterThan(0)
        })

        it('should generate performance reports efficiently', async () => {
            // Ensure we have some analysis history
            await vibeTrader.initiateAnalysis('NVDA', '1D', {
                includeFundamentals: false
            })

            const startTime = Date.now()
            const report = vibeTrader.generatePerformanceReport('NVDA')
            const endTime = Date.now()

            expect(endTime - startTime).toBeLessThan(500) // Should be very fast
            expect(report).toHaveProperty('summary')
            expect(report).toHaveProperty('accuracyMetrics')
            expect(report).toHaveProperty('performanceMetrics')
            expect(report).toHaveProperty('recommendations')
        })
    })

    describe('Memory Management', () => {
        it('should not have significant memory leaks', async () => {
            const initialMemory = process.memoryUsage().heapUsed

            // Run multiple analyses with valid symbols
            const validSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'NFLX', 'AMD', 'INTC', 'CRM', 'ORCL', 'ADBE', 'PYPL', 'UBER', 'LYFT', 'SNAP', 'TWTR', 'SQ', 'SHOP']
            for (let i = 0; i < 20; i++) {
                await vibeTrader.initiateAnalysis(validSymbols[i % validSymbols.length], '1D', {
                    includeFundamentals: false
                })

                // Force garbage collection if available
                if (global.gc) {
                    global.gc()
                }
            }

            const finalMemory = process.memoryUsage().heapUsed
            const memoryIncrease = finalMemory - initialMemory

            // Memory increase should be reasonable (less than 200MB for 20 analyses)
            expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024)
        })

        it('should clean up cache efficiently', async () => {
            // Fill cache with analyses using valid symbols
            const cacheSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'NFLX', 'AMD', 'INTC']
            for (let i = 0; i < 10; i++) {
                await vibeTrader.initiateAnalysis(cacheSymbols[i], '1D', {
                    includeFundamentals: false
                })
            }

            const beforeClearMemory = process.memoryUsage().heapUsed

            // Clear cache
            vibeTrader.clearCache()

            // Force garbage collection if available
            if (global.gc) {
                global.gc()
            }

            const afterClearMemory = process.memoryUsage().heapUsed
            const memoryFreed = beforeClearMemory - afterClearMemory

            // Should free some memory (at least 10MB)
            expect(memoryFreed).toBeGreaterThan(10 * 1024 * 1024)
        })
    })

    describe('Performance Monitoring', () => {
        it('should track performance metrics accurately', async () => {
            const monitorId = performanceMonitor.startAnalysis('CRM', 'single')

            await vibeTrader.initiateAnalysis('CRM', '1D', {
                includeFundamentals: false
            })

            const record = performanceMonitor.endAnalysis(monitorId, true)

            expect(record).toBeDefined()
            expect(record!.symbol).toBe('CRM')
            expect(record!.duration).toBeGreaterThan(0)
            expect(record!.success).toBe(true)

            const metrics = performanceMonitor.getPerformanceMetrics()
            expect(metrics.analysisSpeed.totalAnalyses).toBeGreaterThan(0)
            expect(metrics.memoryUsage.heapUsed).toBeGreaterThan(0)
        })

        it('should detect performance issues', async () => {
            // Simulate a slow analysis by adding delay
            const monitorId = performanceMonitor.startAnalysis('ORCL', 'single')

            await new Promise(resolve => setTimeout(resolve, 100)) // Small delay for test

            const record = performanceMonitor.endAnalysis(monitorId, true)
            expect(record).toBeDefined()

            const symbolPerf = performanceMonitor.getSymbolPerformance('ORCL')
            expect(symbolPerf.totalAnalyses).toBe(1)
            expect(symbolPerf.averageTime).toBeGreaterThan(0)
        })

        it('should compare timeframe performance', async () => {
            // Run both single and multi-timeframe analyses
            await vibeTrader.initiateAnalysis('ADBE', '1D', {
                includeFundamentals: false
            })

            await vibeTrader.initiateMultiTimeframeAnalysis(
                'ADBE',
                '1D',
                ['1D', '1W']
            )

            const comparison = performanceMonitor.getTimeframeComparison()

            // Should have data for both types
            expect(comparison).toHaveProperty('single')
            expect(comparison).toHaveProperty('multi-timeframe')

            if (comparison.single && comparison['multi-timeframe']) {
                expect(comparison.single.count).toBeGreaterThan(0)
                expect(comparison['multi-timeframe'].count).toBeGreaterThan(0)

                // Multi-timeframe should generally take longer
                expect(comparison['multi-timeframe'].averageTime).toBeGreaterThan(comparison.single.averageTime)
            }
        })
    })

    describe('Market Condition Performance Tests', () => {
        it('should handle different market conditions efficiently', async () => {
            const marketConditions = ['trending', 'volatile', 'sideways', 'crash'] as const
            const results: Array<{ condition: string, time: number, memoryUsed: number, success: boolean }> = []

            const testSymbols = ['PYPL', 'UBER', 'LYFT', 'SNAP']
            for (let i = 0; i < marketConditions.length; i++) {
                const condition = marketConditions[i]
                const symbol = testSymbols[i]
                const startTime = Date.now()
                const initialMemory = process.memoryUsage().heapUsed

                try {
                    const result = await vibeTrader.initiateAnalysis(symbol, '1D', {
                        includeFundamentals: false,
                        marketCondition: condition
                    })

                    const endTime = Date.now()
                    const finalMemory = process.memoryUsage().heapUsed

                    results.push({
                        condition,
                        time: endTime - startTime,
                        memoryUsed: finalMemory - initialMemory,
                        success: !!result
                    })
                } catch (error) {
                    results.push({
                        condition,
                        time: Date.now() - startTime,
                        memoryUsed: 0,
                        success: false
                    })
                }
            }

            // All conditions should complete successfully
            results.forEach(result => {
                expect(result.success).toBe(true)
                expect(result.time).toBeLessThan(10000) // 10 seconds max per condition
                expect(result.memoryUsed).toBeLessThan(100 * 1024 * 1024) // 100MB max
            })

            // Performance should be consistent across conditions (within 3x variance)
            const times = results.map(r => r.time)
            const maxTime = Math.max(...times)
            const minTime = Math.min(...times)
            const variance = maxTime / minTime

            expect(variance).toBeLessThan(3) // Performance should not vary more than 3x
        })

        it('should maintain accuracy across different market conditions', async () => {
            const marketConditions = ['trending', 'volatile', 'sideways'] as const
            const accuracyResults: Array<{ condition: string, confidence: number, signalStrength: number }> = []

            const accuracySymbols = ['SQ', 'SHOP', 'TWTR']
            for (let i = 0; i < marketConditions.length; i++) {
                const condition = marketConditions[i]
                const symbol = accuracySymbols[i]
                const result = await vibeTrader.initiateAnalysis(symbol, '1D', {
                    includeFundamentals: false,
                    marketCondition: condition
                })

                if (result && result.recommendations.length > 0) {
                    const avgConfidence = result.recommendations.reduce((sum, rec) => sum + rec.confidence, 0) / result.recommendations.length
                    const signalStrength = result.technicalAnalysis?.momentum?.strength || 0

                    accuracyResults.push({
                        condition,
                        confidence: avgConfidence,
                        signalStrength
                    })
                }
            }

            // Should have results for all conditions
            expect(accuracyResults).toHaveLength(3)

            // Confidence should be reasonable for all conditions
            accuracyResults.forEach(result => {
                expect(result.confidence).toBeGreaterThan(0.3) // At least 30% confidence
                expect(result.confidence).toBeLessThan(1.0) // Not overconfident
            })
        })
    })

    describe('Scalability Tests', () => {
        it('should handle increasing load gracefully', async () => {
            const loadSizes = [1, 3, 5, 8]
            const results: Array<{ size: number, time: number, memoryUsed: number, throughput: number }> = []

            for (const size of loadSizes) {
                const startTime = Date.now()
                const initialMemory = process.memoryUsage().heapUsed

                const scaleSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'NFLX']
                const promises = Array.from({ length: size }, (_, i) =>
                    vibeTrader.initiateAnalysis(scaleSymbols[i % scaleSymbols.length], '1D', {
                        includeFundamentals: false
                    })
                )

                await Promise.all(promises)

                const endTime = Date.now()
                const finalMemory = process.memoryUsage().heapUsed
                const totalTime = endTime - startTime
                const throughput = size / (totalTime / 1000) // analyses per second

                results.push({
                    size,
                    time: totalTime,
                    memoryUsed: finalMemory - initialMemory,
                    throughput
                })
            }

            // Time should scale sub-linearly (better than O(n))
            const timeRatio = results[3].time / results[0].time
            const sizeRatio = results[3].size / results[0].size
            expect(timeRatio).toBeLessThan(sizeRatio * 1.5) // Should be better than linear scaling

            // Memory should scale reasonably
            const memoryRatio = results[3].memoryUsed / results[0].memoryUsed
            expect(memoryRatio).toBeLessThan(sizeRatio * 2) // Memory can scale up to 2x per analysis

            // Throughput should not degrade significantly
            const throughputDrop = (results[0].throughput - results[3].throughput) / results[0].throughput
            expect(throughputDrop).toBeLessThan(0.7) // Throughput should not drop more than 70%
        })

        it('should maintain performance under sustained load', async () => {
            const iterations = 15
            const times: number[] = []
            const memoryUsages: number[] = []

            const sustainedSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'NFLX', 'AMD', 'INTC', 'CRM', 'ORCL', 'ADBE', 'PYPL', 'UBER']
            for (let i = 0; i < iterations; i++) {
                const startTime = Date.now()
                const initialMemory = process.memoryUsage().heapUsed

                await vibeTrader.initiateAnalysis(sustainedSymbols[i % sustainedSymbols.length], '1D', {
                    includeFundamentals: false
                })

                const endTime = Date.now()
                const finalMemory = process.memoryUsage().heapUsed

                times.push(endTime - startTime)
                memoryUsages.push(finalMemory - initialMemory)

                // Small delay to simulate real usage
                await new Promise(resolve => setTimeout(resolve, 100))
            }

            // Performance should not degrade significantly over time
            const firstThird = times.slice(0, 5)
            const lastThird = times.slice(-5)

            const firstThirdAvg = firstThird.reduce((sum, t) => sum + t, 0) / firstThird.length
            const lastThirdAvg = lastThird.reduce((sum, t) => sum + t, 0) / lastThird.length

            const degradation = (lastThirdAvg - firstThirdAvg) / firstThirdAvg

            // Performance degradation should be less than 30%
            expect(degradation).toBeLessThan(0.3)

            // Memory usage should not continuously increase (no major leaks)
            const firstMemoryAvg = memoryUsages.slice(0, 5).reduce((sum, m) => sum + m, 0) / 5
            const lastMemoryAvg = memoryUsages.slice(-5).reduce((sum, m) => sum + m, 0) / 5
            const memoryIncrease = (lastMemoryAvg - firstMemoryAvg) / firstMemoryAvg

            expect(memoryIncrease).toBeLessThan(0.5) // Memory should not increase more than 50%
        })

        it('should handle concurrent requests efficiently', async () => {
            const concurrentRequests = 6
            const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META']

            const startTime = Date.now()
            const initialMemory = process.memoryUsage().heapUsed

            // Start all requests simultaneously
            const promises = symbols.map(symbol =>
                vibeTrader.initiateAnalysis(symbol, '1D', {
                    includeFundamentals: false
                })
            )

            const results = await Promise.all(promises)

            const endTime = Date.now()
            const finalMemory = process.memoryUsage().heapUsed
            const totalTime = endTime - startTime
            const memoryUsed = finalMemory - initialMemory

            // All requests should succeed
            expect(results).toHaveLength(concurrentRequests)
            results.forEach((result, index) => {
                expect(result).toBeDefined()
                expect(result.symbol).toBe(symbols[index])
            })

            // Concurrent execution should be faster than sequential
            const estimatedSequentialTime = concurrentRequests * 3000 // Assume 3s per analysis
            expect(totalTime).toBeLessThan(estimatedSequentialTime * 0.7) // At least 30% faster

            // Memory usage should be reasonable
            expect(memoryUsed).toBeLessThan(150 * 1024 * 1024) // Less than 150MB for 6 concurrent
        })
    })

    describe('Resource Monitoring and System Performance', () => {
        it('should monitor CPU usage during analysis', async () => {
            const cpuBefore = process.cpuUsage()

            // Run multiple analyses to generate CPU load
            const cpuSymbols = ['NVDA', 'AMD', 'INTC', 'CRM']
            const promises = Array.from({ length: 4 }, (_, i) =>
                vibeTrader.initiateAnalysis(cpuSymbols[i], '1D', {
                    includeFundamentals: false
                })
            )

            await Promise.all(promises)

            const cpuAfter = process.cpuUsage(cpuBefore)
            const cpuUsageMs = (cpuAfter.user + cpuAfter.system) / 1000 // Convert to milliseconds

            // CPU usage should be reasonable (less than 10 seconds of CPU time)
            expect(cpuUsageMs).toBeLessThan(10000)
            expect(cpuUsageMs).toBeGreaterThan(0) // Should use some CPU

            // Get performance metrics
            const metrics = performanceMonitor.getPerformanceMetrics()
            expect(metrics.resourceUtilization.cpuUsage).toBeGreaterThan(0)
        })

        it('should track memory usage patterns accurately', async () => {
            const initialMetrics = performanceMonitor.getPerformanceMetrics()
            const initialMemory = initialMetrics.memoryUsage.heapUsed

            // Run analyses and track memory
            const memorySymbols = ['ORCL', 'ADBE', 'PYPL', 'UBER', 'LYFT', 'SNAP', 'SQ', 'SHOP']
            for (let i = 0; i < 8; i++) {
                await vibeTrader.initiateAnalysis(memorySymbols[i], '1D', {
                    includeFundamentals: false
                })

                const currentMetrics = performanceMonitor.getPerformanceMetrics()
                expect(currentMetrics.memoryUsage.heapUsed).toBeGreaterThan(0)
                expect(currentMetrics.memoryUsage.heapTotal).toBeGreaterThan(currentMetrics.memoryUsage.heapUsed)
            }

            const finalMetrics = performanceMonitor.getPerformanceMetrics()

            // Memory should have increased but not excessively
            const memoryIncrease = finalMetrics.memoryUsage.heapUsed - initialMemory
            expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024) // Less than 200MB increase

            // Peak usage should be tracked
            expect(finalMetrics.memoryUsage.peakUsage).toBeGreaterThanOrEqual(finalMetrics.memoryUsage.heapUsed)
        })

        it('should detect performance bottlenecks', async () => {
            // Clear previous data
            performanceMonitor.clearPerformanceData()

            // Run analyses with different complexities
            const simpleAnalysis = vibeTrader.initiateAnalysis('TWTR', '1D', {
                includeFundamentals: false,
                includePatterns: false
            })

            const complexAnalysis = vibeTrader.initiateAnalysis('NFLX', '1D', {
                includeFundamentals: true,
                includePatterns: true,
                multiTimeframe: true
            })

            await Promise.all([simpleAnalysis, complexAnalysis])

            // Get performance comparison
            const simplePerf = performanceMonitor.getSymbolPerformance('TWTR')
            const complexPerf = performanceMonitor.getSymbolPerformance('NFLX')

            expect(simplePerf.totalAnalyses).toBe(1)
            expect(complexPerf.totalAnalyses).toBe(1)

            // Complex analysis should take longer
            expect(complexPerf.averageTime).toBeGreaterThan(simplePerf.averageTime)

            // Both should have good success rates
            expect(simplePerf.successRate).toBe(1)
            expect(complexPerf.successRate).toBe(1)
        })

        it('should generate comprehensive performance reports', async () => {
            // Ensure we have analysis data
            await vibeTrader.initiateAnalysis('META', '1D', {
                includeFundamentals: false
            })

            const metrics = performanceMonitor.getPerformanceMetrics()

            // Verify all metric categories are present
            expect(metrics).toHaveProperty('analysisSpeed')
            expect(metrics).toHaveProperty('memoryUsage')
            expect(metrics).toHaveProperty('accuracy')
            expect(metrics).toHaveProperty('resourceUtilization')
            expect(metrics).toHaveProperty('errorRates')

            // Analysis speed metrics
            expect(metrics.analysisSpeed.totalAnalyses).toBeGreaterThan(0)
            expect(metrics.analysisSpeed.averageTime).toBeGreaterThan(0)
            expect(metrics.analysisSpeed.p95Time).toBeGreaterThanOrEqual(metrics.analysisSpeed.averageTime)

            // Memory usage metrics
            expect(metrics.memoryUsage.heapUsed).toBeGreaterThan(0)
            expect(metrics.memoryUsage.heapTotal).toBeGreaterThan(metrics.memoryUsage.heapUsed)

            // Resource utilization
            expect(metrics.resourceUtilization.memoryUtilization).toBeGreaterThan(0)
            expect(metrics.resourceUtilization.memoryUtilization).toBeLessThan(1)

            // Export data for analysis
            const exportedData = performanceMonitor.exportPerformanceData()
            expect(exportedData.records.length).toBeGreaterThan(0)
            expect(exportedData.summary).toEqual(metrics)
        })

        it('should handle performance alerts correctly', async () => {
            // Clear previous alerts
            performanceMonitor.clearPerformanceData()

            // Run some analyses to generate data
            const alertSymbols = ['AMD', 'INTC', 'CRM']
            for (let i = 0; i < 3; i++) {
                await vibeTrader.initiateAnalysis(alertSymbols[i], '1D', {
                    includeFundamentals: false
                })
            }

            const alerts = performanceMonitor.getPerformanceAlerts()

            // Alerts should be an array
            expect(Array.isArray(alerts)).toBe(true)

            // Each alert should have required properties
            alerts.forEach(alert => {
                expect(alert).toHaveProperty('type')
                expect(alert).toHaveProperty('severity')
                expect(alert).toHaveProperty('message')
                expect(alert).toHaveProperty('timestamp')
                expect(alert).toHaveProperty('recommendations')
                expect(Array.isArray(alert.recommendations)).toBe(true)
            })
        })
    })

    describe('Error Handling Performance', () => {
        it('should handle errors efficiently without memory leaks', async () => {
            const initialMemory = process.memoryUsage().heapUsed

            // Generate some errors
            for (let i = 0; i < 5; i++) {
                try {
                    await vibeTrader.initiateAnalysis('', '1D') // Invalid symbol
                } catch (error) {
                    // Expected to fail
                }
            }

            const finalMemory = process.memoryUsage().heapUsed
            const memoryIncrease = finalMemory - initialMemory

            // Error handling should not cause significant memory increase
            expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024) // Less than 20MB
        })

        it('should recover from errors quickly', async () => {
            // Generate an error
            try {
                await vibeTrader.initiateAnalysis('INVALID_SYMBOL_!@#', '1D')
            } catch (error) {
                // Expected
            }

            // Should still be able to perform successful analysis quickly
            const startTime = Date.now()
            const result = await vibeTrader.initiateAnalysis('ORCL', '1D', {
                includeFundamentals: false
            })
            const endTime = Date.now()

            expect(endTime - startTime).toBeLessThan(5000) // Should not be slowed by previous error
            expect(result).toBeDefined()
            expect(result.symbol).toBe('ORCL')
        })

        it('should track error rates and types accurately', async () => {
            performanceMonitor.clearPerformanceData()

            // Generate different types of errors
            const errorTests = [
                { symbol: '', expectedError: 'INVALID_SYMBOL' },
                { symbol: 'NONEXISTENT_SYMBOL_XYZ', expectedError: 'DATA_UNAVAILABLE' },
                { symbol: 'TIMEOUT_TEST', expectedError: 'TIMEOUT' }
            ]

            for (const test of errorTests) {
                try {
                    await vibeTrader.initiateAnalysis(test.symbol, '1D')
                } catch (error) {
                    // Expected to fail
                    performanceMonitor.logError(test.expectedError, error?.toString() || 'Unknown error')
                }
            }

            // Run some successful analyses
            const successSymbols = ['ADBE', 'PYPL']
            for (let i = 0; i < 2; i++) {
                await vibeTrader.initiateAnalysis(successSymbols[i], '1D', {
                    includeFundamentals: false
                })
            }

            const metrics = performanceMonitor.getPerformanceMetrics()

            // Should track errors correctly
            expect(metrics.errorRates.totalErrors).toBeGreaterThan(0)
            expect(metrics.errorRates.errorRate).toBeGreaterThan(0)
            expect(metrics.errorRates.errorRate).toBeLessThan(1)

            // Should have error breakdown by type
            expect(Object.keys(metrics.errorRates.errorsByType).length).toBeGreaterThan(0)
        })
    })

    describe('Long-term Performance Stability', () => {
        it('should maintain stable performance over extended usage', async () => {
            const batchSize = 5
            const batches = 3
            const batchResults: Array<{ batchNumber: number, averageTime: number, memoryUsed: number }> = []

            for (let batch = 0; batch < batches; batch++) {
                const batchStartTime = Date.now()
                const batchStartMemory = process.memoryUsage().heapUsed

                // Run a batch of analyses
                const stabilitySymbols = ['UBER', 'LYFT', 'SNAP', 'SQ', 'SHOP']
                const promises = Array.from({ length: batchSize }, (_, i) =>
                    vibeTrader.initiateAnalysis(stabilitySymbols[i % stabilitySymbols.length], '1D', {
                        includeFundamentals: false
                    })
                )

                await Promise.all(promises)

                const batchEndTime = Date.now()
                const batchEndMemory = process.memoryUsage().heapUsed

                batchResults.push({
                    batchNumber: batch,
                    averageTime: (batchEndTime - batchStartTime) / batchSize,
                    memoryUsed: batchEndMemory - batchStartMemory
                })

                // Small delay between batches
                await new Promise(resolve => setTimeout(resolve, 200))
            }

            // Performance should remain stable across batches
            const firstBatch = batchResults[0]
            const lastBatch = batchResults[batches - 1]

            const timeIncrease = (lastBatch.averageTime - firstBatch.averageTime) / firstBatch.averageTime
            const memoryIncrease = (lastBatch.memoryUsed - firstBatch.memoryUsed) / Math.abs(firstBatch.memoryUsed)

            // Performance should not degrade more than 40%
            expect(timeIncrease).toBeLessThan(0.4)

            // Memory usage should not increase dramatically
            expect(memoryIncrease).toBeLessThan(1.0) // Less than 100% increase
        })
    })
})