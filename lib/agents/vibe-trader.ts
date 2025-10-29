import { CoreMessage, smoothStream, streamText } from 'ai'
import { TechnicalAnalysisEngine } from './technical-analyzer'
import { MarketResearcher } from './market-researcher'
import { NaturalLanguageQueryHandler, QueryResponse } from './query-handler'
import { AnalysisCache, PerformanceMonitor } from './analysis-cache'
import { MultiTimeframeAnalyzer, MultiTimeframeResult } from '../analysis/multi-timeframe-analyzer'
import { AnalysisHistoryManager, AnalysisComparison, HistoricalAnalysis } from '../analysis/analysis-history'
import { getModel } from '../utils/registry'
import {
    TechnicalAnalysisResult,
    FundamentalAnalysisResult,
    TradingSignal,
    OHLCV,
    AnalysisResult,
    AnalysisContext,
    AnalysisParameters,
    AnalysisError,
    AnalysisErrorType,
    TimeframeAnalysis
} from '../types/trading'

const VIBE_TRADER_SYSTEM_PROMPT = `
You are Vibe Trader, an AI-powered trading analysis assistant that combines technical and fundamental analysis to provide comprehensive trading insights.

Your capabilities include:
- Comprehensive technical analysis with automated indicator application
- Real-time fundamental analysis using market research
- Pattern recognition and chart analysis
- Price target calculation and risk assessment
- Natural language explanation of complex trading concepts
- Context-aware follow-up question handling

When providing analysis, you should:
1. Present technical analysis findings clearly with specific indicator values
2. Explain fundamental factors affecting the asset
3. Provide specific buy/sell/hold recommendations with price targets
4. Include risk assessment and stop-loss levels
5. Use clear, actionable language that traders can understand
6. Cite sources for fundamental analysis using [number](url) format
7. Explain the reasoning behind each recommendation

Always maintain context of the current analysis session and be ready to answer follow-up questions about your analysis, recommendations, or trading concepts.

Current date: ${new Date().toISOString().split('T')[0]}
`

interface VibeTraderConfig {
    messages: CoreMessage[]
    model: string
    searchMode: boolean
}

// Remove duplicate interfaces - they are now defined in types/trading.ts

export class VibeTraderController {
    private marketResearcher: MarketResearcher
    private queryHandler: NaturalLanguageQueryHandler
    private cache: AnalysisCache
    private performanceMonitor: PerformanceMonitor
    private historyManager: AnalysisHistoryManager
    private contextCache: Map<string, AnalysisContext> = new Map()

    constructor(model: string) {
        this.marketResearcher = new MarketResearcher(model)
        this.queryHandler = new NaturalLanguageQueryHandler()
        this.cache = new AnalysisCache({
            maxSize: 50,
            marketHoursTTL: 2 * 60 * 1000, // 2 minutes during market hours
            afterHoursTTL: 10 * 60 * 1000, // 10 minutes after hours
        })
        this.performanceMonitor = PerformanceMonitor.getInstance()
        this.historyManager = new AnalysisHistoryManager(100)
    }

    /**
     * Main analysis orchestration - runs technical and fundamental analysis in parallel
     */
    async initiateAnalysis(
        symbol: string,
        timeframe: string = '1D',
        parameters: AnalysisParameters = {}
    ): Promise<AnalysisResult> {
        const endTimer = this.performanceMonitor.startTimer('full_analysis')

        try {
            // Validate symbol input
            if (!this.isValidSymbol(symbol)) {
                throw new AnalysisError(
                    AnalysisErrorType.INVALID_SYMBOL,
                    `Invalid symbol: ${symbol}. Please provide a valid financial instrument symbol.`,
                    true,
                    'Try using a standard symbol format like AAPL, BTCUSD, or EURUSD'
                )
            }

            // Check cache first
            const cacheKey = `${symbol}_${timeframe}_${JSON.stringify(parameters)}`
            const cachedResult = this.cache.getAnalysisResult(cacheKey)

            if (cachedResult) {
                endTimer()
                return cachedResult
            }

            // Get price data (mock implementation - in real app would fetch from data provider)
            const priceData = await this.getPriceData(symbol, timeframe)

            if (!priceData || priceData.length < 20) {
                throw new AnalysisError(
                    AnalysisErrorType.DATA_UNAVAILABLE,
                    `Insufficient price data for ${symbol}. Need at least 20 periods for analysis.`,
                    false,
                    'Try a different symbol or timeframe'
                )
            }

            // Run technical and fundamental analysis in parallel
            const [technicalResult, fundamentalResult] = await Promise.allSettled([
                this.runTechnicalAnalysis(symbol, timeframe, priceData, parameters),
                parameters.includeFundamentals !== false
                    ? this.runFundamentalAnalysis(symbol)
                    : Promise.resolve(this.getEmptyFundamentalResult(symbol))
            ])

            // Handle analysis results and errors
            const technicalAnalysis = this.handleAnalysisResult(
                technicalResult,
                'Technical analysis failed',
                this.getEmptyTechnicalResult()
            )

            const fundamentalAnalysis = this.handleAnalysisResult(
                fundamentalResult,
                'Fundamental analysis failed',
                this.getEmptyFundamentalResult(symbol)
            )

            // Generate comprehensive recommendations
            const recommendations = this.synthesizeRecommendations(
                technicalAnalysis,
                fundamentalAnalysis,
                parameters
            )

            // Calculate overall confidence
            const confidence = this.calculateOverallConfidence(
                technicalAnalysis,
                fundamentalAnalysis,
                recommendations
            )

            // Generate chart annotations
            const chartAnnotations = this.generateChartAnnotations(
                technicalAnalysis,
                recommendations
            )

            // Create comprehensive analysis summary
            const summary = this.generateAnalysisSummary(
                symbol,
                technicalAnalysis,
                fundamentalAnalysis,
                recommendations,
                confidence
            )

            const result: AnalysisResult = {
                symbol,
                timestamp: new Date(),
                technicalAnalysis,
                fundamentalAnalysis,
                recommendations,
                confidence,
                chartAnnotations,
                summary
            }

            // Cache the result
            this.cache.setAnalysisResult(cacheKey, result)

            // Store analysis in history
            const analysisId = this.historyManager.storeAnalysis(symbol, result, parameters)
            console.log(`Analysis stored with ID: ${analysisId}`)

            // Update context
            this.updateAnalysisContext(symbol, timeframe, result)

            endTimer()
            console.log(`Analysis completed for ${symbol}`)

            return result

        } catch (error) {
            if (error instanceof AnalysisError) {
                throw error
            }

            // Handle unexpected errors
            throw new AnalysisError(
                AnalysisErrorType.ANALYSIS_TIMEOUT,
                `Analysis failed for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                true,
                'Please try again or contact support if the issue persists'
            )
        }
    }

    /**
     * Handle follow-up queries with context awareness
     */
    async handleFollowUpQuery(
        query: string,
        context: AnalysisContext
    ): Promise<QueryResponse> {
        try {
            // Use the natural language query handler
            return await this.queryHandler.processQuery(query, context)
        } catch (error) {
            return {
                answer: `I encountered an error processing your question: ${error instanceof Error ? error.message : 'Unknown error'}. Please try rephrasing your question.`,
                followUpSuggestions: [
                    "Try asking about technical indicators",
                    "Ask for trading recommendations",
                    "Request fundamental analysis"
                ],
                requiresNewAnalysis: false
            }
        }
    }

    /**
     * Process natural language queries and determine if new analysis is needed
     */
    async processNaturalLanguageQuery(
        query: string,
        currentSymbol?: string
    ): Promise<QueryResponse> {
        const classification = this.queryHandler.classifyQuery(query)

        // If it's a symbol request, handle it specially
        if (classification.type === 'symbol_request' && classification.entities.length > 0) {
            const symbol = classification.entities[0]
            return {
                answer: `I'll analyze ${symbol} for you. This will include technical analysis, fundamental research, and trading recommendations.`,
                followUpSuggestions: [
                    "Focus on technical indicators only",
                    "Include fundamental analysis",
                    "What's the market sentiment?",
                    "Show me the price targets"
                ],
                requiresNewAnalysis: true,
                suggestedSymbol: symbol
            }
        }

        // Get or create context
        const context = currentSymbol ?
            this.contextCache.get(currentSymbol) || this.createEmptyContext(currentSymbol) :
            this.createEmptyContext('UNKNOWN')

        return await this.queryHandler.processQuery(query, context, classification)
    }

    /**
     * Update analysis with new parameters
     */
    async updateAnalysis(
        symbol: string,
        parameters: AnalysisParameters
    ): Promise<AnalysisResult> {
        const context = this.contextCache.get(symbol)
        const timeframe = context?.timeframe || '1D'

        // Clear cache for this symbol to force fresh analysis
        this.cache.invalidateSymbol(symbol)

        return this.initiateAnalysis(symbol, timeframe, parameters)
    }

    /**
     * Perform multi-timeframe analysis across multiple timeframes
     */
    async initiateMultiTimeframeAnalysis(
        symbol: string,
        primaryTimeframe: string = '1D',
        timeframes: string[] = ['1H', '4H', '1D', '1W'],
        parameters: AnalysisParameters = {}
    ): Promise<MultiTimeframeResult> {
        const endTimer = this.performanceMonitor.startTimer('multi_timeframe_analysis')

        try {
            // Validate symbol input
            if (!this.isValidSymbol(symbol)) {
                throw new AnalysisError(
                    AnalysisErrorType.INVALID_SYMBOL,
                    `Invalid symbol: ${symbol}. Please provide a valid financial instrument symbol.`,
                    true,
                    'Try using a standard symbol format like AAPL, BTCUSD, or EURUSD'
                )
            }

            // Check cache first
            const cacheKey = `multi_${symbol}_${timeframes.join('_')}_${JSON.stringify(parameters)}`
            const cachedResult = this.cache.getAnalysisResult(cacheKey) as MultiTimeframeResult

            if (cachedResult) {
                endTimer()
                return cachedResult
            }

            // Get price data for all timeframes
            const priceDataMap: Record<string, OHLCV[]> = {}

            for (const timeframe of timeframes) {
                try {
                    const priceData = await this.getPriceData(symbol, timeframe)
                    if (priceData && priceData.length >= 20) {
                        priceDataMap[timeframe] = priceData
                    }
                } catch (error) {
                    console.warn(`Failed to get price data for ${timeframe}:`, error)
                }
            }

            if (Object.keys(priceDataMap).length === 0) {
                throw new AnalysisError(
                    AnalysisErrorType.DATA_UNAVAILABLE,
                    `No price data available for any timeframe for ${symbol}`,
                    false,
                    'Try a different symbol or check data availability'
                )
            }

            // Perform multi-timeframe analysis
            const multiTimeframeResult = await MultiTimeframeAnalyzer.analyzeMultipleTimeframes(
                symbol,
                priceDataMap,
                primaryTimeframe
            )

            // Store analysis in history
            const analysisId = this.historyManager.storeAnalysis(symbol, multiTimeframeResult, {
                ...parameters,
                timeframes,
                primaryTimeframe
            })
            console.log(`Multi-timeframe analysis stored with ID: ${analysisId}`)

            // Cache the result
            this.cache.setAnalysisResult(cacheKey, multiTimeframeResult as any)

            // Update context with multi-timeframe result
            this.updateMultiTimeframeContext(symbol, primaryTimeframe, multiTimeframeResult)

            endTimer()
            console.log(`Multi-timeframe analysis completed for ${symbol}`)

            return multiTimeframeResult

        } catch (error) {
            endTimer()

            if (error instanceof AnalysisError) {
                throw error
            }

            throw new AnalysisError(
                AnalysisErrorType.ANALYSIS_TIMEOUT,
                `Multi-timeframe analysis failed for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                true,
                'Please try again or contact support if the issue persists'
            )
        }
    }

    /**
     * Get timeframe-specific recommendations based on multi-timeframe analysis
     */
    async getTimeframeSpecificRecommendations(
        symbol: string,
        targetTimeframe: string,
        multiTimeframeResult?: MultiTimeframeResult
    ): Promise<{
        timeframeAnalysis: TimeframeAnalysis | null
        recommendations: TradingSignal[]
        confluenceFactors: string[]
        riskAssessment: string
    }> {
        let mtfResult = multiTimeframeResult

        if (!mtfResult) {
            // Try to get from cache or perform new analysis
            const context = this.contextCache.get(symbol)
            if (context && 'multiTimeframeResult' in context) {
                mtfResult = (context as any).multiTimeframeResult
            } else {
                mtfResult = await this.initiateMultiTimeframeAnalysis(symbol)
            }
        }

        const timeframeAnalysis = mtfResult.timeframeAnalyses.find(ta => ta.timeframe === targetTimeframe) || null

        if (!timeframeAnalysis) {
            return {
                timeframeAnalysis: null,
                recommendations: [],
                confluenceFactors: [`No analysis available for ${targetTimeframe} timeframe`],
                riskAssessment: 'Unable to assess risk without timeframe data'
            }
        }

        // Generate confluence factors
        const confluenceFactors: string[] = []

        // Check trend alignment
        const alignedTrends = mtfResult.timeframeAnalyses.filter(ta =>
            ta.analysis.trend.direction === timeframeAnalysis.analysis.trend.direction
        )

        if (alignedTrends.length > 1) {
            confluenceFactors.push(
                `Trend alignment: ${alignedTrends.map(ta => ta.timeframe).join(', ')} showing ${timeframeAnalysis.analysis.trend.direction.toLowerCase()}`
            )
        }

        // Check momentum alignment
        const currentRSI = timeframeAnalysis.analysis.momentum.rsi
        const alignedMomentum = mtfResult.timeframeAnalyses.filter(ta => {
            const otherRSI = ta.analysis.momentum.rsi
            return Math.abs(currentRSI - otherRSI) < 20 // Within 20 RSI points
        })

        if (alignedMomentum.length > 1) {
            confluenceFactors.push(
                `Momentum alignment: ${alignedMomentum.map(ta => ta.timeframe).join(', ')} showing similar RSI levels`
            )
        }

        // Check support/resistance confluence
        const currentLevels = timeframeAnalysis.analysis.supportResistance
        let levelConfluence = 0

        mtfResult.timeframeAnalyses.forEach(ta => {
            if (ta.timeframe !== targetTimeframe) {
                ta.analysis.supportResistance.forEach(otherLevel => {
                    currentLevels.forEach(currentLevel => {
                        const priceDiff = Math.abs(otherLevel.level - currentLevel.level) / currentLevel.level
                        if (priceDiff < 0.02 && otherLevel.type === currentLevel.type) {
                            levelConfluence++
                        }
                    })
                })
            }
        })

        if (levelConfluence > 0) {
            confluenceFactors.push(`${levelConfluence} support/resistance levels confirmed across multiple timeframes`)
        }

        // Risk assessment
        const timeframeRisk = mtfResult.riskAssessment.timeframeRisks[targetTimeframe] || 'MEDIUM'
        const overallRisk = mtfResult.riskAssessment.overallRisk

        let riskAssessment = `${targetTimeframe} timeframe risk: ${timeframeRisk}, Overall multi-timeframe risk: ${overallRisk}`

        if (mtfResult.riskAssessment.riskFactors.length > 0) {
            riskAssessment += `. Risk factors: ${mtfResult.riskAssessment.riskFactors.join(', ')}`
        }

        return {
            timeframeAnalysis,
            recommendations: timeframeAnalysis.signals,
            confluenceFactors,
            riskAssessment
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
        return this.historyManager.getAnalysisHistory(symbol, limit, startDate, endDate)
    }

    /**
     * Compare analysis performance over time
     */
    compareAnalysisPerformance(
        symbol: string,
        timeRange?: { start: Date, end: Date }
    ): AnalysisComparison {
        return this.historyManager.compareAnalysisPerformance(symbol, timeRange)
    }

    /**
     * Update analysis outcome with actual market results
     */
    updateAnalysisOutcome(
        symbol: string,
        analysisId: string,
        currentPrice: number,
        daysElapsed: number
    ): void {
        this.historyManager.updateAnalysisOutcome(symbol, analysisId, currentPrice, daysElapsed)
    }

    /**
     * Get accuracy trends for a symbol
     */
    getAccuracyTrends(symbol: string, windowSize: number = 10): Array<{
        date: Date
        accuracy: number
        confidence: number
        analysisCount: number
        movingAverage: number
    }> {
        return this.historyManager.getAccuracyTrends(symbol, windowSize)
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
        return this.historyManager.getBestPerformingPatterns(symbol)
    }

    /**
     * Generate analysis performance report
     */
    generatePerformanceReport(symbol: string): {
        summary: string
        accuracyMetrics: any
        performanceMetrics: any
        recommendations: string[]
        trends: any[]
    } {
        const comparison = this.compareAnalysisPerformance(symbol)
        const trends = this.getAccuracyTrends(symbol)
        const bestPatterns = this.getBestPerformingPatterns(symbol)

        const summary = this.generatePerformanceSummary(comparison, bestPatterns)

        const recommendations = [
            ...comparison.recommendations.strengthAreas.map(area => `✓ ${area}`),
            ...comparison.recommendations.improvementAreas.map(area => `⚠ ${area}`),
            ...comparison.recommendations.recommendedAdjustments.map(adj => `→ ${adj}`)
        ]

        return {
            summary,
            accuracyMetrics: comparison.accuracyMetrics,
            performanceMetrics: comparison.performanceMetrics,
            recommendations,
            trends
        }
    }

    /**
     * Private helper methods
     */
    private async runTechnicalAnalysis(
        symbol: string,
        timeframe: string,
        priceData: OHLCV[],
        parameters: AnalysisParameters
    ): Promise<TechnicalAnalysisResult> {
        try {
            return await TechnicalAnalysisEngine.analyzePrice(symbol, timeframe, priceData)
        } catch (error) {
            console.error('Technical analysis error:', error)
            throw error
        }
    }

    private async runFundamentalAnalysis(symbol: string): Promise<FundamentalAnalysisResult> {
        try {
            return await this.marketResearcher.researchFundamentals(symbol)
        } catch (error) {
            console.error('Fundamental analysis error:', error)
            throw error
        }
    }

    private handleAnalysisResult<T>(
        result: PromiseSettledResult<T>,
        errorMessage: string,
        fallback: T
    ): T {
        if (result.status === 'fulfilled') {
            return result.value
        } else {
            console.warn(`${errorMessage}:`, result.reason)
            return fallback
        }
    }

    private synthesizeRecommendations(
        technical: TechnicalAnalysisResult,
        fundamental: FundamentalAnalysisResult,
        parameters: AnalysisParameters
    ): TradingSignal[] {
        // Generate technical signals
        const technicalSignals = TechnicalAnalysisEngine.generateSignals(technical)

        // Adjust signals based on fundamental analysis
        const adjustedSignals = technicalSignals.map(signal => {
            const fundamentalBias = this.getFundamentalBias(fundamental)
            const adjustedConfidence = this.adjustConfidenceWithFundamentals(
                signal.confidence,
                fundamentalBias
            )

            return {
                ...signal,
                confidence: adjustedConfidence,
                reasoning: [
                    ...signal.reasoning,
                    `Fundamental sentiment: ${fundamental.newsAnalysis.sentiment}`,
                    `Market sentiment score: ${fundamental.marketSentiment.overall.toFixed(2)}`
                ]
            }
        })

        return adjustedSignals
    }

    private calculateOverallConfidence(
        technical: TechnicalAnalysisResult,
        fundamental: FundamentalAnalysisResult,
        recommendations: TradingSignal[]
    ): number {
        const technicalConfidence = this.calculateTechnicalConfidence(technical)
        const fundamentalConfidence = Math.abs(fundamental.marketSentiment.overall)
        const recommendationConfidence = recommendations.length > 0
            ? recommendations[0].confidence
            : 0.5

        // Weighted average
        return (technicalConfidence * 0.4 + fundamentalConfidence * 0.3 + recommendationConfidence * 0.3)
    }

    private generateChartAnnotations(
        technical: TechnicalAnalysisResult,
        recommendations: TradingSignal[]
    ): any[] {
        const annotations: any[] = []

        // Add support/resistance levels
        technical.supportResistance.forEach(level => {
            annotations.push({
                type: 'LINE',
                coordinates: [{ x: 0, y: level.level }, { x: 100, y: level.level }],
                style: {
                    color: level.type === 'SUPPORT' ? '#00ff00' : '#ff0000',
                    lineWidth: 2,
                    lineStyle: 'solid'
                },
                label: `${level.type}: ${level.level.toFixed(2)}`,
                description: `Strength: ${level.strength.toFixed(2)}`
            })
        })

        // Add price targets from recommendations
        recommendations.forEach(rec => {
            rec.priceTargets.forEach(target => {
                annotations.push({
                    type: 'LINE',
                    coordinates: [{ x: 0, y: target.level }, { x: 100, y: target.level }],
                    style: {
                        color: target.type === 'TARGET' ? '#0000ff' : '#ff8800',
                        lineWidth: 1,
                        lineStyle: 'dashed'
                    },
                    label: `${target.type}: ${target.level.toFixed(2)}`,
                    description: target.reasoning
                })
            })
        })

        return annotations
    }

    private generateAnalysisSummary(
        symbol: string,
        technical: TechnicalAnalysisResult,
        fundamental: FundamentalAnalysisResult,
        recommendations: TradingSignal[],
        confidence: number
    ): string {
        const primaryRecommendation = recommendations[0]
        const trendDirection = technical.trend.direction
        const sentiment = fundamental.newsAnalysis.sentiment

        return `
**Analysis Summary for ${symbol}**

**Primary Recommendation:** ${primaryRecommendation?.action || 'HOLD'} (Confidence: ${(confidence * 100).toFixed(0)}%)

**Technical Overview:**
- Trend: ${trendDirection} with ${(technical.trend.strength * 100).toFixed(0)}% strength
- RSI: ${technical.momentum.rsi.toFixed(1)} (${this.interpretRSI(technical.momentum.rsi)})
- Key Support: ${technical.supportResistance.find(sr => sr.type === 'SUPPORT')?.level.toFixed(2) || 'N/A'}
- Key Resistance: ${technical.supportResistance.find(sr => sr.type === 'RESISTANCE')?.level.toFixed(2) || 'N/A'}

**Fundamental Overview:**
- Market Sentiment: ${sentiment} (Score: ${fundamental.marketSentiment.overall.toFixed(2)})
- Key Themes: ${fundamental.newsAnalysis.keyThemes.slice(0, 3).join(', ')}
- Upcoming Events: ${fundamental.upcomingEvents.length} identified

**Key Recommendation:**
${primaryRecommendation?.reasoning.join('. ') || 'No clear directional bias identified.'}
        `.trim()
    }

    // Additional helper methods...
    private isValidSymbol(symbol: string): boolean {
        // Basic symbol validation
        return /^[A-Z0-9]{1,10}(USD|EUR|GBP|JPY)?$/i.test(symbol.toUpperCase())
    }

    private async getPriceData(symbol: string, timeframe: string): Promise<OHLCV[]> {
        // Check cache first
        const cachedData = this.cache.getPriceData(symbol, timeframe)
        if (cachedData) {
            return cachedData
        }

        const endTimer = this.performanceMonitor.startTimer('price_data_fetch')

        // Mock implementation - in real app would fetch from data provider
        // For now, return mock data for testing
        const mockData: OHLCV[] = []
        const basePrice = 100
        const now = new Date()

        for (let i = 100; i >= 0; i--) {
            const timestamp = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
            const randomFactor = 0.95 + Math.random() * 0.1
            const price = basePrice * randomFactor * (1 + (Math.random() - 0.5) * 0.05)

            mockData.push({
                open: price * (0.99 + Math.random() * 0.02),
                high: price * (1.01 + Math.random() * 0.02),
                low: price * (0.98 + Math.random() * 0.02),
                close: price,
                volume: Math.floor(1000000 + Math.random() * 5000000),
                timestamp
            })
        }

        // Cache the price data
        this.cache.setPriceData(symbol, timeframe, mockData)

        endTimer()
        return mockData
    }

    /**
     * Get cache statistics and performance metrics
     */
    getCacheStatistics(): any {
        return {
            cache: this.cache.getStatistics(),
            performance: this.performanceMonitor.getMetrics()
        }
    }

    /**
     * Clear all caches
     */
    clearCache(): void {
        this.cache.clearAll()
        this.contextCache.clear()
    }

    /**
     * Invalidate cache based on market conditions
     */
    invalidateCacheByMarketConditions(): void {
        this.cache.invalidateByMarketConditions()
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        this.cache.destroy()
        this.performanceMonitor.clearMetrics()
    }

    private updateAnalysisContext(symbol: string, timeframe: string, result: AnalysisResult): void {
        this.contextCache.set(symbol, {
            symbol,
            timeframe,
            lastAnalysis: result,
            conversationHistory: []
        })
    }

    private updateMultiTimeframeContext(symbol: string, primaryTimeframe: string, result: MultiTimeframeResult): void {
        this.contextCache.set(symbol, {
            symbol,
            timeframe: primaryTimeframe,
            conversationHistory: [],
            multiTimeframeResult: result
        } as any)
    }

    private generatePerformanceSummary(
        comparison: AnalysisComparison,
        bestPatterns: any
    ): string {
        const { accuracyMetrics, performanceMetrics, trendAnalysis } = comparison

        const summary = `
**Analysis Performance Summary for ${comparison.symbol}**

**Overall Performance:**
- Total Analyses: ${accuracyMetrics.totalAnalyses}
- Accuracy Rate: ${(accuracyMetrics.accuracyRate * 100).toFixed(1)}%
- Average Confidence: ${(accuracyMetrics.averageConfidence * 100).toFixed(1)}%
- Win Rate: ${(performanceMetrics.winRate * 100).toFixed(1)}%
- Average Return: ${performanceMetrics.averageReturn.toFixed(2)}%

**Performance by Action:**
- BUY Signals: ${(accuracyMetrics.byAction.BUY.accuracy * 100).toFixed(1)}% accuracy (${accuracyMetrics.byAction.BUY.total} total)
- SELL Signals: ${(accuracyMetrics.byAction.SELL.accuracy * 100).toFixed(1)}% accuracy (${accuracyMetrics.byAction.SELL.total} total)
- HOLD Signals: ${(accuracyMetrics.byAction.HOLD.accuracy * 100).toFixed(1)}% accuracy (${accuracyMetrics.byAction.HOLD.total} total)

**Recent Trends:**
- Recent Performance: ${(trendAnalysis.recentPerformance * 100).toFixed(1)}%
- Accuracy Trend: ${trendAnalysis.improvingAccuracy ? 'Improving' : 'Stable/Declining'}
- Trend Change: ${(trendAnalysis.accuracyTrend * 100).toFixed(1)}%

**Best Performing Patterns:**
${bestPatterns.patterns.slice(0, 3).map((p: any) =>
            `- ${p.pattern}: ${(p.accuracy * 100).toFixed(1)}% accuracy (${p.count} occurrences)`
        ).join('\n')}

**Risk Metrics:**
- Max Drawdown: ${performanceMetrics.maxDrawdown.toFixed(1)}%
- Profit Factor: ${performanceMetrics.profitFactor.toFixed(2)}
- Sharpe Ratio: ${performanceMetrics.sharpeRatio.toFixed(2)}
        `.trim()

        return summary
    }

    private createEmptyContext(symbol: string): AnalysisContext {
        return {
            symbol,
            timeframe: '1D',
            conversationHistory: []
        }
    }

    private getFundamentalBias(fundamental: FundamentalAnalysisResult): number {
        return fundamental.marketSentiment.overall
    }

    private adjustConfidenceWithFundamentals(technicalConfidence: number, fundamentalBias: number): number {
        // Adjust technical confidence based on fundamental sentiment
        const adjustment = fundamentalBias * 0.2 // Max 20% adjustment
        return Math.max(0.1, Math.min(0.9, technicalConfidence + adjustment))
    }

    private calculateTechnicalConfidence(technical: TechnicalAnalysisResult): number {
        let confidence = 0.5

        // Factor in trend strength
        confidence += technical.trend.strength * 0.2

        // Factor in pattern confidence
        if (technical.patterns.length > 0) {
            const avgPatternConfidence = technical.patterns.reduce((sum, p) => sum + p.confidence, 0) / technical.patterns.length
            confidence += avgPatternConfidence * 0.2
        }

        // Factor in indicator alignment
        const bullishIndicators = technical.indicators.filter(i => i.signal === 'BULLISH').length
        const bearishIndicators = technical.indicators.filter(i => i.signal === 'BEARISH').length
        const totalIndicators = technical.indicators.length

        if (totalIndicators > 0) {
            const alignment = Math.abs(bullishIndicators - bearishIndicators) / totalIndicators
            confidence += alignment * 0.1
        }

        return Math.max(0.1, Math.min(0.9, confidence))
    }

    private interpretRSI(rsi: number): string {
        if (rsi > 70) return 'overbought'
        if (rsi < 30) return 'oversold'
        return 'neutral'
    }

    private getEmptyTechnicalResult(): TechnicalAnalysisResult {
        return {
            indicators: [],
            patterns: [],
            supportResistance: [],
            trend: {
                direction: 'SIDEWAYS',
                strength: 0,
                duration: 0,
                slope: 0
            },
            momentum: {
                rsi: 50,
                macd: { macd: 0, signal: 0, histogram: 0 },
                stochastic: { k: 50, d: 50 },
                interpretation: 'No momentum data available'
            },
            volatility: {
                atr: 0,
                bollingerBands: { upper: 0, middle: 0, lower: 0, squeeze: false },
                volatilityRank: 0.5
            }
        }
    }

    private getEmptyFundamentalResult(symbol: string): FundamentalAnalysisResult {
        return {
            companyInfo: {
                name: symbol,
                sector: 'Unknown',
                industry: 'Unknown',
                marketCap: 0,
                description: 'No company information available'
            },
            financialMetrics: {
                pe: 0,
                eps: 0,
                revenue: 0,
                revenueGrowth: 0,
                profitMargin: 0,
                debtToEquity: 0
            },
            newsAnalysis: {
                sentiment: 'NEUTRAL',
                relevantNews: [],
                sentimentScore: 0,
                keyThemes: []
            },
            sectorAnalysis: {
                sectorPerformance: 0,
                relativeStrength: 0,
                peerComparison: [],
                sectorTrends: []
            },
            marketSentiment: {
                overall: 0,
                news: 0,
                social: 0,
                analyst: 0
            },
            upcomingEvents: []
        }
    }
}

// Export the streaming function for integration with the chat system
type VibeTraderReturn = Parameters<typeof streamText>[0]

export function vibeTrader({
    messages,
    model,
    searchMode
}: VibeTraderConfig): VibeTraderReturn {
    try {
        const currentDate = new Date().toLocaleString()

        return {
            model: getModel(model),
            system: `${VIBE_TRADER_SYSTEM_PROMPT}\nCurrent date and time: ${currentDate}`,
            messages,
            tools: {}, // Tools will be added in subsequent tasks
            experimental_activeTools: [],
            maxSteps: 1,
            experimental_transform: smoothStream()
        }
    } catch (error) {
        console.error('Error in vibeTrader:', error)
        throw error
    }
}