import { MultiTimeframeAnalyzer } from '../../lib/analysis/multi-timeframe-analyzer'
import { OHLCV } from '../../lib/types/trading'

describe('MultiTimeframeAnalyzer', () => {
    const mockPriceData: OHLCV[] = Array.from({ length: 100 }, (_, i) => ({
        open: 100 + Math.random() * 10,
        high: 105 + Math.random() * 10,
        low: 95 + Math.random() * 10,
        close: 100 + Math.random() * 10,
        volume: 1000000 + Math.random() * 500000,
        timestamp: new Date(Date.now() - (99 - i) * 24 * 60 * 60 * 1000)
    }))

    const mockPriceDataMap = {
        '1H': mockPriceData,
        '4H': mockPriceData,
        '1D': mockPriceData,
        '1W': mockPriceData
    }

    describe('analyzeMultipleTimeframes', () => {
        it('should analyze multiple timeframes successfully', async () => {
            const result = await MultiTimeframeAnalyzer.analyzeMultipleTimeframes(
                'AAPL',
                mockPriceDataMap,
                '1D'
            )

            expect(result.symbol).toBe('AAPL')
            expect(result.primaryTimeframe).toBe('1D')
            expect(result.timeframeAnalyses).toHaveLength(4)
            expect(result.confluenceSignals).toBeDefined()
            expect(result.overallConfidence).toBeGreaterThan(0)
            expect(result.timeframeCorrelation).toBeDefined()
            expect(result.riskAssessment).toBeDefined()
        })

        it('should handle insufficient data gracefully', async () => {
            const insufficientData = mockPriceData.slice(0, 10)
            const insufficientDataMap = {
                '1H': insufficientData,
                '4H': insufficientData,
                '1D': insufficientData,
                '1W': insufficientData
            }

            await expect(
                MultiTimeframeAnalyzer.analyzeMultipleTimeframes(
                    'AAPL',
                    insufficientDataMap,
                    '1D'
                )
            ).rejects.toThrow('No timeframe data available for analysis')
        })

        it('should calculate timeframe correlation correctly', async () => {
            const result = await MultiTimeframeAnalyzer.analyzeMultipleTimeframes(
                'AAPL',
                mockPriceDataMap,
                '1D'
            )

            expect(result.timeframeCorrelation.trendAlignment).toBeGreaterThanOrEqual(0)
            expect(result.timeframeCorrelation.trendAlignment).toBeLessThanOrEqual(1)
            expect(result.timeframeCorrelation.momentumAlignment).toBeGreaterThanOrEqual(0)
            expect(result.timeframeCorrelation.momentumAlignment).toBeLessThanOrEqual(1)
            expect(result.timeframeCorrelation.supportResistanceAlignment).toBeGreaterThanOrEqual(0)
            expect(result.timeframeCorrelation.supportResistanceAlignment).toBeLessThanOrEqual(1)
            expect(Array.isArray(result.timeframeCorrelation.conflictingSignals)).toBe(true)
        })

        it('should generate confluence signals', async () => {
            const result = await MultiTimeframeAnalyzer.analyzeMultipleTimeframes(
                'AAPL',
                mockPriceDataMap,
                '1D'
            )

            expect(result.confluenceSignals).toHaveLength(1)
            expect(result.confluenceSignals[0]).toHaveProperty('action')
            expect(result.confluenceSignals[0]).toHaveProperty('confidence')
            expect(result.confluenceSignals[0]).toHaveProperty('reasoning')
            expect(['BUY', 'SELL', 'HOLD']).toContain(result.confluenceSignals[0].action)
        })

        it('should assess multi-timeframe risk', async () => {
            const result = await MultiTimeframeAnalyzer.analyzeMultipleTimeframes(
                'AAPL',
                mockPriceDataMap,
                '1D'
            )

            expect(['LOW', 'MEDIUM', 'HIGH']).toContain(result.riskAssessment.overallRisk)
            expect(['LONG', 'SHORT', 'NEUTRAL']).toContain(result.riskAssessment.recommendedPosition)
            expect(result.riskAssessment.positionSize).toBeGreaterThan(0)
            expect(result.riskAssessment.positionSize).toBeLessThanOrEqual(1)
            expect(Array.isArray(result.riskAssessment.riskFactors)).toBe(true)
        })
    })

    describe('Performance Tests', () => {
        it('should complete analysis within reasonable time', async () => {
            const startTime = Date.now()

            await MultiTimeframeAnalyzer.analyzeMultipleTimeframes(
                'AAPL',
                mockPriceDataMap,
                '1D'
            )

            const endTime = Date.now()
            const executionTime = endTime - startTime

            // Should complete within 5 seconds
            expect(executionTime).toBeLessThan(5000)
        })

        it('should handle large datasets efficiently', async () => {
            const largePriceData: OHLCV[] = Array.from({ length: 1000 }, (_, i) => ({
                open: 100 + Math.random() * 10,
                high: 105 + Math.random() * 10,
                low: 95 + Math.random() * 10,
                close: 100 + Math.random() * 10,
                volume: 1000000 + Math.random() * 500000,
                timestamp: new Date(Date.now() - (999 - i) * 24 * 60 * 60 * 1000)
            }))

            const largePriceDataMap = {
                '1H': largePriceData,
                '4H': largePriceData,
                '1D': largePriceData,
                '1W': largePriceData
            }

            const startTime = Date.now()

            const result = await MultiTimeframeAnalyzer.analyzeMultipleTimeframes(
                'AAPL',
                largePriceDataMap,
                '1D'
            )

            const endTime = Date.now()
            const executionTime = endTime - startTime

            // Should still complete within 10 seconds even with large dataset
            expect(executionTime).toBeLessThan(10000)
            expect(result.timeframeAnalyses.length).toBeGreaterThan(0)
        })

        it('should maintain memory efficiency', async () => {
            const initialMemory = process.memoryUsage().heapUsed

            // Run multiple analyses
            for (let i = 0; i < 10; i++) {
                await MultiTimeframeAnalyzer.analyzeMultipleTimeframes(
                    `TEST${i}`,
                    mockPriceDataMap,
                    '1D'
                )
            }

            const finalMemory = process.memoryUsage().heapUsed
            const memoryIncrease = finalMemory - initialMemory

            // Memory increase should be reasonable (less than 100MB)
            expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024)
        })
    })

    describe('Accuracy Tests', () => {
        it('should provide consistent results for same input', async () => {
            const result1 = await MultiTimeframeAnalyzer.analyzeMultipleTimeframes(
                'AAPL',
                mockPriceDataMap,
                '1D'
            )

            const result2 = await MultiTimeframeAnalyzer.analyzeMultipleTimeframes(
                'AAPL',
                mockPriceDataMap,
                '1D'
            )

            expect(result1.overallConfidence).toBe(result2.overallConfidence)
            expect(result1.confluenceSignals[0].action).toBe(result2.confluenceSignals[0].action)
            expect(result1.timeframeCorrelation.trendAlignment).toBe(result2.timeframeCorrelation.trendAlignment)
        })

        it('should handle edge cases properly', async () => {
            // Test with minimal data
            const minimalData = mockPriceData.slice(0, 20)
            const minimalDataMap = {
                '1D': minimalData
            }

            const result = await MultiTimeframeAnalyzer.analyzeMultipleTimeframes(
                'AAPL',
                minimalDataMap,
                '1D'
            )

            expect(result.timeframeAnalyses).toHaveLength(1)
            expect(result.confluenceSignals).toHaveLength(1)
        })

        it('should validate confluence signal quality', async () => {
            const result = await MultiTimeframeAnalyzer.analyzeMultipleTimeframes(
                'AAPL',
                mockPriceDataMap,
                '1D'
            )

            const signal = result.confluenceSignals[0]

            // Signal should have valid confidence
            expect(signal.confidence).toBeGreaterThan(0)
            expect(signal.confidence).toBeLessThanOrEqual(1)

            // Signal should have reasoning
            expect(signal.reasoning).toHaveLength(3) // Should have at least 3 reasoning points

            // Risk level should be appropriate for confidence
            if (signal.confidence > 0.7) {
                expect(['LOW', 'MEDIUM']).toContain(signal.riskLevel)
            }
        })
    })
})