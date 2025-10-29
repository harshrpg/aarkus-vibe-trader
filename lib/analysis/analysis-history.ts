import {
    AnalysisResult,
    AnalysisParameters,
    MultiTimeframeResult,
    TradingSignal,
    AnalysisContext
} from '../types/trading'

/**
 * Analysis History and Comparison Module
 * Manages historical analysis results and provides comparison capabilities
 */

export interface HistoricalAnalysis {
    id: string
    symbol: string
    timestamp: Date
    analysis: AnalysisResult | MultiTimeframeResult
    type: 'single' | 'multi-timeframe'
    parameters: Record<string, any>
    actualOutcome?: AnalysisOutcome
}

export interface AnalysisOutcome {
    timestamp: Date
    priceAtAnalysis: number
    priceAtOutcome: number
    priceChange: number
    priceChangePercent: number
    recommendationAccuracy: RecommendationAccuracy
    timeToTarget?: number // days to reach target
    maxDrawdown?: number
    maxGain?: number
}

export interface RecommendationAccuracy {
    action: 'BUY' | 'SELL' | 'HOLD'
    wasCorrect: boolean
    confidence: number
    actualConfidence: number // calculated based on outcome
    targetHit: boolean
    stopLossHit: boolean
    daysHeld: number
}

export interface AnalysisComparison {
    symbol: string
    timeRange: { start: Date, end: Date }
    analyses: HistoricalAnalysis[]
    accuracyMetrics: AccuracyMetrics
    performanceMetrics: PerformanceMetrics
    trendAnalysis: TrendAnalysis
    recommendations: ComparisonRecommendations
}

export interface AccuracyMetrics {
    totalAnalyses: number
    correctPredictions: number
    accuracyRate: number
    averageConfidence: number
    confidenceCalibration: number // how well confidence matches actual accuracy
    byAction: {
        BUY: { total: number, correct: number, accuracy: number }
        SELL: { total: number, correct: number, accuracy: number }
        HOLD: { total: number, correct: number, accuracy: number }
    }
    byTimeframe: Record<string, { total: number, correct: number, accuracy: number }>
}

export interface PerformanceMetrics {
    averageReturn: number
    winRate: number
    averageWin: number
    averageLoss: number
    profitFactor: number
    maxDrawdown: number
    sharpeRatio: number
    totalReturn: number
    volatility: number
}

export interface TrendAnalysis {
    improvingAccuracy: boolean
    accuracyTrend: number // positive = improving, negative = declining
    recentPerformance: number // last 10 analyses accuracy
    bestPerformingConditions: string[]
    worstPerformingConditions: string[]
}

export interface ComparisonRecommendations {
    strengthAreas: string[]
    improvementAreas: string[]
    recommendedAdjustments: string[]
    confidenceRecommendations: string[]
}

export class AnalysisHistoryManager {
    private history: Map<string, HistoricalAnalysis[]> = new Map()
    private maxHistoryPerSymbol: number = 100

    constructor(maxHistoryPerSymbol: number = 100) {
        this.maxHistoryPerSymbol = maxHistoryPerSymbol
    }

    /**
     * Store analysis result in history
     */
    storeAnalysis(
        symbol: string,
        analysis: AnalysisResult | MultiTimeframeResult,
        parameters: Record<string, any> = {}
    ): string {
        const id = this.generateAnalysisId(symbol)
        const type = 'confluenceSignals' in analysis ? 'multi-timeframe' : 'single'

        const historicalAnalysis: HistoricalAnalysis = {
            id,
            symbol,
            timestamp: new Date(),
            analysis,
            type,
            parameters
        }

        // Get existing history for symbol
        const symbolHistory = this.history.get(symbol) || []

        // Add new analysis
        symbolHistory.unshift(historicalAnalysis)

        // Limit history size
        if (symbolHistory.length > this.maxHistoryPerSymbol) {
            symbolHistory.splice(this.maxHistoryPerSymbol)
        }

        this.history.set(symbol, symbolHistory)

        return id
    }

    /**
     * Update analysis with actual outcome
     */
    updateAnalysisOutcome(
        symbol: string,
        analysisId: string,
        currentPrice: number,
        daysElapsed: number
    ): void {
        const symbolHistory = this.history.get(symbol)
        if (!symbolHistory) return

        const analysis = symbolHistory.find(a => a.id === analysisId)
        if (!analysis) return

        const originalPrice = this.getAnalysisPrice(analysis.analysis)
        if (originalPrice === 0) return

        const priceChange = currentPrice - originalPrice
        const priceChangePercent = (priceChange / originalPrice) * 100

        // Calculate recommendation accuracy
        const recommendationAccuracy = this.calculateRecommendationAccuracy(
            analysis,
            originalPrice,
            currentPrice,
            daysElapsed
        )

        analysis.actualOutcome = {
            timestamp: new Date(),
            priceAtAnalysis: originalPrice,
            priceAtOutcome: currentPrice,
            priceChange,
            priceChangePercent,
            recommendationAccuracy,
            timeToTarget: daysElapsed
        }
    }

    /**
     * Get analysis history for a symbol
     */
    getAnalysisHistory(
        symbol: string,
        limit?: number,
        startDate?: Date,
        endDate?: Date
    ): HistoricalAnalysis[] {
        const symbolHistory = this.history.get(symbol) || []

        let filteredHistory = symbolHistory

        // Filter by date range
        if (startDate || endDate) {
            filteredHistory = symbolHistory.filter(analysis => {
                const analysisDate = analysis.timestamp
                if (startDate && analysisDate < startDate) return false
                if (endDate && analysisDate > endDate) return false
                return true
            })
        }

        // Apply limit
        if (limit) {
            filteredHistory = filteredHistory.slice(0, limit)
        }

        return filteredHistory
    }

    /**
     * Compare analysis performance over time
     */
    compareAnalysisPerformance(
        symbol: string,
        timeRange?: { start: Date, end: Date }
    ): AnalysisComparison {
        const analyses = this.getAnalysisHistory(
            symbol,
            undefined,
            timeRange?.start,
            timeRange?.end
        )

        if (analyses.length === 0) {
            throw new Error(`No analysis history found for ${symbol}`)
        }

        // Calculate accuracy metrics
        const accuracyMetrics = this.calculateAccuracyMetrics(analyses)

        // Calculate performance metrics
        const performanceMetrics = this.calculatePerformanceMetrics(analyses)

        // Analyze trends
        const trendAnalysis = this.analyzeTrends(analyses)

        // Generate recommendations
        const recommendations = this.generateComparisonRecommendations(
            accuracyMetrics,
            performanceMetrics,
            trendAnalysis
        )

        return {
            symbol,
            timeRange: timeRange || {
                start: analyses[analyses.length - 1]?.timestamp || new Date(),
                end: analyses[0]?.timestamp || new Date()
            },
            analyses,
            accuracyMetrics,
            performanceMetrics,
            trendAnalysis,
            recommendations
        }
    }

    /**
     * Get best performing analysis patterns
     */
    getBestPerformingPatterns(symbol?: string): {
        patterns: Array<{
            pattern: string
            accuracy: number
            count: number
            averageReturn: number
        }>
        timeframes: Array<{
            timeframe: string
            accuracy: number
            count: number
            averageReturn: number
        }>
        conditions: Array<{
            condition: string
            accuracy: number
            count: number
            description: string
        }>
    } {
        const allAnalyses = symbol
            ? this.history.get(symbol) || []
            : Array.from(this.history.values()).flat()

        const analysesWithOutcomes = allAnalyses.filter(a => a.actualOutcome)

        // Analyze patterns
        const patternPerformance = this.analyzePatternPerformance(analysesWithOutcomes)
        const timeframePerformance = this.analyzeTimeframePerformance(analysesWithOutcomes)
        const conditionPerformance = this.analyzeConditionPerformance(analysesWithOutcomes)

        return {
            patterns: patternPerformance,
            timeframes: timeframePerformance,
            conditions: conditionPerformance
        }
    }

    /**
     * Get analysis accuracy trends over time
     */
    getAccuracyTrends(
        symbol: string,
        windowSize: number = 10
    ): Array<{
        date: Date
        accuracy: number
        confidence: number
        analysisCount: number
        movingAverage: number
    }> {
        const analyses = this.getAnalysisHistory(symbol)
        const analysesWithOutcomes = analyses.filter(a => a.actualOutcome)

        if (analysesWithOutcomes.length < windowSize) {
            return []
        }

        const trends: Array<{
            date: Date
            accuracy: number
            confidence: number
            analysisCount: number
            movingAverage: number
        }> = []

        for (let i = windowSize - 1; i < analysesWithOutcomes.length; i++) {
            const window = analysesWithOutcomes.slice(i - windowSize + 1, i + 1)

            const correctPredictions = window.filter(a =>
                a.actualOutcome?.recommendationAccuracy.wasCorrect
            ).length

            const accuracy = correctPredictions / window.length
            const avgConfidence = window.reduce((sum, a) => {
                const signals = this.getAnalysisSignals(a.analysis)
                return sum + (signals[0]?.confidence || 0)
            }, 0) / window.length

            // Calculate moving average
            const movingAverage = i >= windowSize * 2 - 1
                ? trends.slice(-windowSize).reduce((sum, t) => sum + t.accuracy, 0) / Math.min(windowSize, trends.length)
                : accuracy

            trends.push({
                date: window[window.length - 1].timestamp,
                accuracy,
                confidence: avgConfidence,
                analysisCount: window.length,
                movingAverage
            })
        }

        return trends.reverse() // Most recent first
    }

    /**
     * Private helper methods
     */
    private generateAnalysisId(symbol: string): string {
        return `${symbol}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    private getAnalysisPrice(analysis: AnalysisResult | MultiTimeframeResult): number {
        if ('summary' in analysis) {
            // Single timeframe analysis - extract price from technical analysis or use mock
            return 100 // Mock price - in real implementation would extract from price data
        } else {
            // Multi-timeframe analysis - get price from primary timeframe
            const primaryAnalysis = analysis.timeframeAnalyses.find(ta =>
                ta.timeframe === analysis.primaryTimeframe
            )
            return 100 // Mock price - in real implementation would extract from price data
        }
    }

    private getAnalysisSignals(analysis: AnalysisResult | MultiTimeframeResult): TradingSignal[] {
        if ('recommendations' in analysis) {
            return analysis.recommendations
        } else {
            return analysis.confluenceSignals
        }
    }

    private calculateRecommendationAccuracy(
        analysis: HistoricalAnalysis,
        originalPrice: number,
        currentPrice: number,
        daysElapsed: number
    ): RecommendationAccuracy {
        const signals = this.getAnalysisSignals(analysis.analysis)
        const primarySignal = signals[0]

        if (!primarySignal) {
            return {
                action: 'HOLD',
                wasCorrect: false,
                confidence: 0,
                actualConfidence: 0,
                targetHit: false,
                stopLossHit: false,
                daysHeld: daysElapsed
            }
        }

        const priceChangePercent = ((currentPrice - originalPrice) / originalPrice) * 100
        let wasCorrect = false
        let targetHit = false
        let stopLossHit = false

        // Check if recommendation was correct
        switch (primarySignal.action) {
            case 'BUY':
                wasCorrect = priceChangePercent > 2 // At least 2% gain
                targetHit = primarySignal.priceTargets.some(target => currentPrice >= target.level)
                stopLossHit = primarySignal.stopLoss > 0 && currentPrice <= primarySignal.stopLoss
                break
            case 'SELL':
                wasCorrect = priceChangePercent < -2 // At least 2% loss
                targetHit = primarySignal.priceTargets.some(target => currentPrice <= target.level)
                stopLossHit = primarySignal.stopLoss > 0 && currentPrice >= primarySignal.stopLoss
                break
            case 'HOLD':
                wasCorrect = Math.abs(priceChangePercent) < 5 // Less than 5% movement
                break
        }

        // Calculate actual confidence based on outcome
        const actualConfidence = wasCorrect ?
            Math.min(0.9, primarySignal.confidence + 0.1) :
            Math.max(0.1, primarySignal.confidence - 0.2)

        return {
            action: primarySignal.action,
            wasCorrect,
            confidence: primarySignal.confidence,
            actualConfidence,
            targetHit,
            stopLossHit,
            daysHeld: daysElapsed
        }
    }

    private calculateAccuracyMetrics(analyses: HistoricalAnalysis[]): AccuracyMetrics {
        const analysesWithOutcomes = analyses.filter(a => a.actualOutcome)

        if (analysesWithOutcomes.length === 0) {
            return {
                totalAnalyses: 0,
                correctPredictions: 0,
                accuracyRate: 0,
                averageConfidence: 0,
                confidenceCalibration: 0,
                byAction: {
                    BUY: { total: 0, correct: 0, accuracy: 0 },
                    SELL: { total: 0, correct: 0, accuracy: 0 },
                    HOLD: { total: 0, correct: 0, accuracy: 0 }
                },
                byTimeframe: {}
            }
        }

        const correctPredictions = analysesWithOutcomes.filter(a =>
            a.actualOutcome?.recommendationAccuracy.wasCorrect
        ).length

        const accuracyRate = correctPredictions / analysesWithOutcomes.length

        const averageConfidence = analysesWithOutcomes.reduce((sum, a) => {
            return sum + a.actualOutcome!.recommendationAccuracy.confidence
        }, 0) / analysesWithOutcomes.length

        // Calculate confidence calibration
        const confidenceCalibration = this.calculateConfidenceCalibration(analysesWithOutcomes)

        // Calculate by action
        const byAction = {
            BUY: this.calculateActionMetrics(analysesWithOutcomes, 'BUY'),
            SELL: this.calculateActionMetrics(analysesWithOutcomes, 'SELL'),
            HOLD: this.calculateActionMetrics(analysesWithOutcomes, 'HOLD')
        }

        // Calculate by timeframe
        const byTimeframe: Record<string, { total: number, correct: number, accuracy: number }> = {}

        analysesWithOutcomes.forEach(analysis => {
            let timeframe = 'unknown'

            if (analysis.type === 'single' && 'summary' in analysis.analysis) {
                timeframe = analysis.parameters.timeframe || '1D'
            } else if (analysis.type === 'multi-timeframe') {
                timeframe = (analysis.analysis as MultiTimeframeResult).primaryTimeframe
            }

            if (!byTimeframe[timeframe]) {
                byTimeframe[timeframe] = { total: 0, correct: 0, accuracy: 0 }
            }

            byTimeframe[timeframe].total++
            if (analysis.actualOutcome?.recommendationAccuracy.wasCorrect) {
                byTimeframe[timeframe].correct++
            }
            byTimeframe[timeframe].accuracy = byTimeframe[timeframe].correct / byTimeframe[timeframe].total
        })

        return {
            totalAnalyses: analysesWithOutcomes.length,
            correctPredictions,
            accuracyRate,
            averageConfidence,
            confidenceCalibration,
            byAction,
            byTimeframe
        }
    }

    private calculateActionMetrics(
        analyses: HistoricalAnalysis[],
        action: 'BUY' | 'SELL' | 'HOLD'
    ): { total: number, correct: number, accuracy: number } {
        const actionAnalyses = analyses.filter(a =>
            a.actualOutcome?.recommendationAccuracy.action === action
        )

        const correct = actionAnalyses.filter(a =>
            a.actualOutcome?.recommendationAccuracy.wasCorrect
        ).length

        return {
            total: actionAnalyses.length,
            correct,
            accuracy: actionAnalyses.length > 0 ? correct / actionAnalyses.length : 0
        }
    }

    private calculateConfidenceCalibration(analyses: HistoricalAnalysis[]): number {
        // Measure how well confidence levels match actual accuracy
        const confidenceBuckets = [0.1, 0.3, 0.5, 0.7, 0.9]
        let totalCalibrationError = 0
        let bucketCount = 0

        confidenceBuckets.forEach(bucket => {
            const bucketAnalyses = analyses.filter(a => {
                const confidence = a.actualOutcome!.recommendationAccuracy.confidence
                return Math.abs(confidence - bucket) < 0.1
            })

            if (bucketAnalyses.length > 0) {
                const bucketAccuracy = bucketAnalyses.filter(a =>
                    a.actualOutcome!.recommendationAccuracy.wasCorrect
                ).length / bucketAnalyses.length

                totalCalibrationError += Math.abs(bucket - bucketAccuracy)
                bucketCount++
            }
        })

        return bucketCount > 0 ? 1 - (totalCalibrationError / bucketCount) : 0.5
    }

    private calculatePerformanceMetrics(analyses: HistoricalAnalysis[]): PerformanceMetrics {
        const analysesWithOutcomes = analyses.filter(a => a.actualOutcome)

        if (analysesWithOutcomes.length === 0) {
            return {
                averageReturn: 0,
                winRate: 0,
                averageWin: 0,
                averageLoss: 0,
                profitFactor: 0,
                maxDrawdown: 0,
                sharpeRatio: 0,
                totalReturn: 0,
                volatility: 0
            }
        }

        const returns = analysesWithOutcomes.map(a => a.actualOutcome!.priceChangePercent)
        const wins = returns.filter(r => r > 0)
        const losses = returns.filter(r => r < 0)

        const averageReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
        const winRate = wins.length / returns.length
        const averageWin = wins.length > 0 ? wins.reduce((sum, w) => sum + w, 0) / wins.length : 0
        const averageLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, l) => sum + l, 0) / losses.length) : 0
        const profitFactor = averageLoss > 0 ? (averageWin * wins.length) / (averageLoss * losses.length) : 0

        // Calculate max drawdown
        let maxDrawdown = 0
        let peak = 0
        let cumulativeReturn = 0

        returns.forEach(ret => {
            cumulativeReturn += ret
            if (cumulativeReturn > peak) {
                peak = cumulativeReturn
            }
            const drawdown = peak - cumulativeReturn
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown
            }
        })

        const totalReturn = returns.reduce((sum, r) => sum + r, 0)
        const volatility = this.calculateVolatility(returns)
        const sharpeRatio = volatility > 0 ? averageReturn / volatility : 0

        return {
            averageReturn,
            winRate,
            averageWin,
            averageLoss,
            profitFactor,
            maxDrawdown,
            sharpeRatio,
            totalReturn,
            volatility
        }
    }

    private calculateVolatility(returns: number[]): number {
        if (returns.length < 2) return 0

        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length

        return Math.sqrt(variance)
    }

    private analyzeTrends(analyses: HistoricalAnalysis[]): TrendAnalysis {
        const analysesWithOutcomes = analyses.filter(a => a.actualOutcome)

        if (analysesWithOutcomes.length < 10) {
            return {
                improvingAccuracy: false,
                accuracyTrend: 0,
                recentPerformance: 0,
                bestPerformingConditions: [],
                worstPerformingConditions: []
            }
        }

        // Calculate recent vs historical performance
        const recentAnalyses = analysesWithOutcomes.slice(0, 10)
        const historicalAnalyses = analysesWithOutcomes.slice(10)

        const recentAccuracy = recentAnalyses.filter(a =>
            a.actualOutcome!.recommendationAccuracy.wasCorrect
        ).length / recentAnalyses.length

        const historicalAccuracy = historicalAnalyses.length > 0
            ? historicalAnalyses.filter(a =>
                a.actualOutcome!.recommendationAccuracy.wasCorrect
            ).length / historicalAnalyses.length
            : recentAccuracy

        const accuracyTrend = recentAccuracy - historicalAccuracy
        const improvingAccuracy = accuracyTrend > 0.05 // At least 5% improvement

        // Identify best and worst performing conditions
        const conditionPerformance = this.analyzeConditionPerformance(analysesWithOutcomes)

        const bestPerformingConditions = conditionPerformance
            .filter(c => c.accuracy > 0.7)
            .sort((a, b) => b.accuracy - a.accuracy)
            .slice(0, 3)
            .map(c => c.condition)

        const worstPerformingConditions = conditionPerformance
            .filter(c => c.accuracy < 0.4)
            .sort((a, b) => a.accuracy - b.accuracy)
            .slice(0, 3)
            .map(c => c.condition)

        return {
            improvingAccuracy,
            accuracyTrend,
            recentPerformance: recentAccuracy,
            bestPerformingConditions,
            worstPerformingConditions
        }
    }

    private analyzePatternPerformance(analyses: HistoricalAnalysis[]): Array<{
        pattern: string
        accuracy: number
        count: number
        averageReturn: number
    }> {
        // Group analyses by patterns found
        const patternGroups: Record<string, HistoricalAnalysis[]> = {}

        analyses.forEach(analysis => {
            let patterns: string[] = []

            if (analysis.type === 'single' && 'technicalAnalysis' in analysis.analysis) {
                patterns = analysis.analysis.technicalAnalysis.patterns.map(p => p.type)
            } else if (analysis.type === 'multi-timeframe') {
                const mtfAnalysis = analysis.analysis as MultiTimeframeResult
                patterns = mtfAnalysis.timeframeAnalyses
                    .flatMap(ta => ta.analysis.patterns.map(p => p.type))
            }

            patterns.forEach(pattern => {
                if (!patternGroups[pattern]) {
                    patternGroups[pattern] = []
                }
                patternGroups[pattern].push(analysis)
            })
        })

        return Object.entries(patternGroups).map(([pattern, patternAnalyses]) => {
            const correct = patternAnalyses.filter(a =>
                a.actualOutcome?.recommendationAccuracy.wasCorrect
            ).length

            const averageReturn = patternAnalyses.reduce((sum, a) =>
                sum + (a.actualOutcome?.priceChangePercent || 0), 0
            ) / patternAnalyses.length

            return {
                pattern,
                accuracy: correct / patternAnalyses.length,
                count: patternAnalyses.length,
                averageReturn
            }
        }).sort((a, b) => b.accuracy - a.accuracy)
    }

    private analyzeTimeframePerformance(analyses: HistoricalAnalysis[]): Array<{
        timeframe: string
        accuracy: number
        count: number
        averageReturn: number
    }> {
        const timeframeGroups: Record<string, HistoricalAnalysis[]> = {}

        analyses.forEach(analysis => {
            let timeframe = 'unknown'

            if (analysis.type === 'single') {
                timeframe = analysis.parameters.timeframe || '1D'
            } else if (analysis.type === 'multi-timeframe') {
                timeframe = (analysis.analysis as MultiTimeframeResult).primaryTimeframe
            }

            if (!timeframeGroups[timeframe]) {
                timeframeGroups[timeframe] = []
            }
            timeframeGroups[timeframe].push(analysis)
        })

        return Object.entries(timeframeGroups).map(([timeframe, tfAnalyses]) => {
            const correct = tfAnalyses.filter(a =>
                a.actualOutcome?.recommendationAccuracy.wasCorrect
            ).length

            const averageReturn = tfAnalyses.reduce((sum, a) =>
                sum + (a.actualOutcome?.priceChangePercent || 0), 0
            ) / tfAnalyses.length

            return {
                timeframe,
                accuracy: correct / tfAnalyses.length,
                count: tfAnalyses.length,
                averageReturn
            }
        }).sort((a, b) => b.accuracy - a.accuracy)
    }

    private analyzeConditionPerformance(analyses: HistoricalAnalysis[]): Array<{
        condition: string
        accuracy: number
        count: number
        description: string
    }> {
        // Analyze performance under different market conditions
        const conditions: Array<{
            condition: string
            accuracy: number
            count: number
            description: string
        }> = []

        // High volatility condition
        const highVolAnalyses = analyses.filter(a => {
            if (a.type === 'single' && 'technicalAnalysis' in a.analysis) {
                return a.analysis.technicalAnalysis.volatility.volatilityRank > 0.7
            }
            return false
        })

        if (highVolAnalyses.length > 0) {
            const correct = highVolAnalyses.filter(a =>
                a.actualOutcome?.recommendationAccuracy.wasCorrect
            ).length

            conditions.push({
                condition: 'High Volatility',
                accuracy: correct / highVolAnalyses.length,
                count: highVolAnalyses.length,
                description: 'Market conditions with high volatility (>70th percentile)'
            })
        }

        // Strong trend condition
        const strongTrendAnalyses = analyses.filter(a => {
            if (a.type === 'single' && 'technicalAnalysis' in a.analysis) {
                return a.analysis.technicalAnalysis.trend.strength > 0.7
            }
            return false
        })

        if (strongTrendAnalyses.length > 0) {
            const correct = strongTrendAnalyses.filter(a =>
                a.actualOutcome?.recommendationAccuracy.wasCorrect
            ).length

            conditions.push({
                condition: 'Strong Trend',
                accuracy: correct / strongTrendAnalyses.length,
                count: strongTrendAnalyses.length,
                description: 'Market conditions with strong directional trend (>70% strength)'
            })
        }

        return conditions.sort((a, b) => b.accuracy - a.accuracy)
    }

    private generateComparisonRecommendations(
        accuracyMetrics: AccuracyMetrics,
        performanceMetrics: PerformanceMetrics,
        trendAnalysis: TrendAnalysis
    ): ComparisonRecommendations {
        const strengthAreas: string[] = []
        const improvementAreas: string[] = []
        const recommendedAdjustments: string[] = []
        const confidenceRecommendations: string[] = []

        // Identify strength areas
        if (accuracyMetrics.accuracyRate > 0.7) {
            strengthAreas.push('High overall accuracy rate')
        }

        if (performanceMetrics.winRate > 0.6) {
            strengthAreas.push('Strong win rate')
        }

        if (performanceMetrics.profitFactor > 1.5) {
            strengthAreas.push('Excellent profit factor')
        }

        if (trendAnalysis.improvingAccuracy) {
            strengthAreas.push('Improving accuracy trend')
        }

        // Identify improvement areas
        if (accuracyMetrics.accuracyRate < 0.5) {
            improvementAreas.push('Low overall accuracy rate needs improvement')
        }

        if (performanceMetrics.maxDrawdown > 20) {
            improvementAreas.push('High maximum drawdown indicates risk management issues')
        }

        if (accuracyMetrics.confidenceCalibration < 0.6) {
            improvementAreas.push('Poor confidence calibration - confidence levels do not match actual accuracy')
        }

        // Generate adjustment recommendations
        if (accuracyMetrics.byAction.BUY.accuracy < 0.5) {
            recommendedAdjustments.push('Review buy signal criteria - current accuracy is below 50%')
        }

        if (accuracyMetrics.byAction.SELL.accuracy < 0.5) {
            recommendedAdjustments.push('Review sell signal criteria - current accuracy is below 50%')
        }

        if (performanceMetrics.averageLoss > performanceMetrics.averageWin * 2) {
            recommendedAdjustments.push('Implement tighter stop-loss management - losses are too large relative to wins')
        }

        // Generate confidence recommendations
        if (accuracyMetrics.confidenceCalibration < 0.7) {
            confidenceRecommendations.push('Recalibrate confidence scoring system')
        }

        if (accuracyMetrics.averageConfidence > 0.8 && accuracyMetrics.accuracyRate < 0.6) {
            confidenceRecommendations.push('Reduce confidence levels - system is overconfident')
        }

        if (accuracyMetrics.averageConfidence < 0.5 && accuracyMetrics.accuracyRate > 0.7) {
            confidenceRecommendations.push('Increase confidence levels - system is underconfident')
        }

        return {
            strengthAreas,
            improvementAreas,
            recommendedAdjustments,
            confidenceRecommendations
        }
    }
}