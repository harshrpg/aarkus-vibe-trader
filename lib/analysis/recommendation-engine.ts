import {
    TechnicalAnalysisResult,
    FundamentalAnalysisResult,
    TradingSignal,
    PriceTarget,
    OHLCV
} from '../types/trading'

import { SignalGenerator } from './signal-generator'
import { PriceTargetCalculator } from './price-target-calculator'

/**
 * Recommendation Synthesis Engine
 * Combines technical and fundamental analysis into unified trading recommendations
 */
export class RecommendationEngine {
    /**
     * Synthesize comprehensive trading recommendations
     */
    static synthesizeRecommendations(
        technicalAnalysis: TechnicalAnalysisResult,
        fundamentalAnalysis: FundamentalAnalysisResult | null,
        currentPrice: number,
        data: OHLCV[],
        timeframe: string = '1D'
    ): TradingSignal[] {
        // Generate technical signals
        const technicalSignals = SignalGenerator.generateTechnicalSignals(technicalAnalysis, timeframe)

        // Calculate comprehensive price targets
        const priceTargets = this.calculateEnhancedPriceTargets(
            technicalAnalysis,
            currentPrice,
            data
        )

        // Apply fundamental analysis overlay if available
        const enhancedSignals = fundamentalAnalysis ?
            this.applyFundamentalOverlay(technicalSignals, fundamentalAnalysis) :
            technicalSignals

        // Calculate confidence scores
        const scoredSignals = enhancedSignals.map(signal =>
            this.calculateConfidenceScore(signal, technicalAnalysis, fundamentalAnalysis)
        )

        // Assess risk for each signal
        const riskAssessedSignals = scoredSignals.map(signal =>
            this.assessRisk(signal, technicalAnalysis, fundamentalAnalysis, data)
        )

        // Enhance signals with comprehensive price targets
        const finalSignals = riskAssessedSignals.map(signal =>
            this.enhanceWithPriceTargets(signal, priceTargets, currentPrice)
        )

        // Consolidate and rank signals
        return SignalGenerator.consolidateSignals(finalSignals)
    }

    /**
     * Apply fundamental analysis overlay to technical signals
     */
    private static applyFundamentalOverlay(
        technicalSignals: TradingSignal[],
        fundamentalAnalysis: FundamentalAnalysisResult
    ): TradingSignal[] {
        return technicalSignals.map(signal => {
            const fundamentalBias = this.calculateFundamentalBias(fundamentalAnalysis)
            const enhancedSignal = { ...signal }

            // Adjust signal based on fundamental bias
            if (fundamentalBias.direction === signal.action) {
                // Fundamental analysis supports technical signal
                enhancedSignal.confidence = Math.min(0.95, signal.confidence + fundamentalBias.strength * 0.15)
                enhancedSignal.reasoning = [
                    ...signal.reasoning,
                    `Fundamental analysis supports ${signal.action.toLowerCase()} bias`,
                    ...fundamentalBias.factors.slice(0, 2)
                ]
            } else if (fundamentalBias.direction !== 'HOLD' && fundamentalBias.strength > 0.6) {
                // Strong fundamental contradiction
                enhancedSignal.confidence = Math.max(0.3, signal.confidence - fundamentalBias.strength * 0.2)
                enhancedSignal.reasoning = [
                    ...signal.reasoning,
                    `Fundamental analysis suggests ${fundamentalBias.direction.toLowerCase()} bias (conflicting signal)`,
                    'Consider fundamental factors before acting on technical signal'
                ]
                enhancedSignal.riskLevel = this.increaseRiskLevel(signal.riskLevel)
            } else {
                // Neutral or weak fundamental impact
                enhancedSignal.reasoning = [
                    ...signal.reasoning,
                    'Fundamental analysis is neutral to technical signal'
                ]
            }

            return enhancedSignal
        })
    }

    /**
     * Calculate fundamental bias from fundamental analysis
     */
    private static calculateFundamentalBias(
        fundamentalAnalysis: FundamentalAnalysisResult
    ): {
        direction: 'BUY' | 'SELL' | 'HOLD'
        strength: number
        factors: string[]
    } {
        const factors: string[] = []
        let bullishScore = 0
        let bearishScore = 0
        let maxScore = 0

        // News sentiment analysis (weight: 30%)
        maxScore += 0.3
        const newsSentiment = fundamentalAnalysis.newsAnalysis.sentimentScore
        if (newsSentiment > 0.6) {
            bullishScore += 0.3
            factors.push(`Positive news sentiment (${(newsSentiment * 100).toFixed(0)}%)`)
        } else if (newsSentiment < 0.4) {
            bearishScore += 0.3
            factors.push(`Negative news sentiment (${(newsSentiment * 100).toFixed(0)}%)`)
        }

        // Market sentiment analysis (weight: 25%)
        maxScore += 0.25
        const overallSentiment = fundamentalAnalysis.marketSentiment.overall
        if (overallSentiment > 0.65) {
            bullishScore += 0.25
            factors.push('Strong positive market sentiment')
        } else if (overallSentiment < 0.35) {
            bearishScore += 0.25
            factors.push('Strong negative market sentiment')
        }

        // Sector analysis (weight: 20%)
        maxScore += 0.2
        if (fundamentalAnalysis.sectorAnalysis.relativeStrength > 0.7) {
            bullishScore += 0.2
            factors.push('Strong sector outperformance')
        } else if (fundamentalAnalysis.sectorAnalysis.relativeStrength < 0.3) {
            bearishScore += 0.2
            factors.push('Sector underperformance')
        }

        // Financial metrics (weight: 15%)
        maxScore += 0.15
        const metrics = fundamentalAnalysis.financialMetrics
        if (metrics.revenueGrowth > 0.15 && metrics.profitMargin > 0.1) {
            bullishScore += 0.15
            factors.push(`Strong financials (${(metrics.revenueGrowth * 100).toFixed(1)}% revenue growth)`)
        } else if (metrics.revenueGrowth < -0.05 || metrics.profitMargin < 0.02) {
            bearishScore += 0.15
            factors.push('Weak financial performance')
        }

        // Upcoming events (weight: 10%)
        maxScore += 0.1
        const highImpactEvents = fundamentalAnalysis.upcomingEvents.filter(e => e.expectedImpact === 'HIGH')
        if (highImpactEvents.length > 0) {
            factors.push(`${highImpactEvents.length} high-impact event(s) approaching`)
            // Events add uncertainty, slightly bearish bias
            bearishScore += 0.05
        }

        // Determine direction and strength
        const netBullish = bullishScore - bearishScore
        const strength = Math.abs(netBullish) / maxScore

        let direction: 'BUY' | 'SELL' | 'HOLD' = 'HOLD'
        if (netBullish > 0.1) {
            direction = 'BUY'
        } else if (netBullish < -0.1) {
            direction = 'SELL'
        }

        return {
            direction,
            strength: Math.min(1, strength),
            factors: factors.slice(0, 4) // Top 4 factors
        }
    }

    /**
     * Calculate enhanced confidence score
     */
    private static calculateConfidenceScore(
        signal: TradingSignal,
        technicalAnalysis: TechnicalAnalysisResult,
        fundamentalAnalysis: FundamentalAnalysisResult | null
    ): TradingSignal {
        let baseConfidence = signal.confidence
        let confidenceAdjustment = 0

        // Technical analysis quality factors
        const technicalQuality = this.assessTechnicalQuality(technicalAnalysis)
        confidenceAdjustment += technicalQuality.score * 0.1

        // Fundamental analysis quality factors (if available)
        if (fundamentalAnalysis) {
            const fundamentalQuality = this.assessFundamentalQuality(fundamentalAnalysis)
            confidenceAdjustment += fundamentalQuality.score * 0.05
        }

        // Multi-timeframe confirmation (simplified)
        const trendStrength = technicalAnalysis.trend.strength
        if (trendStrength > 0.7) {
            confidenceAdjustment += 0.05
        }

        // Volume confirmation
        const volumeLevels = technicalAnalysis.supportResistance.filter(sr => sr.volume > 0)
        if (volumeLevels.length > 0) {
            confidenceAdjustment += 0.03
        }

        const finalConfidence = Math.max(0.2, Math.min(0.95, baseConfidence + confidenceAdjustment))

        return {
            ...signal,
            confidence: finalConfidence,
            reasoning: [
                ...signal.reasoning,
                `Confidence enhanced by technical quality (${(technicalQuality.score * 100).toFixed(0)}%)`
            ]
        }
    }

    /**
     * Assess technical analysis quality
     */
    private static assessTechnicalQuality(
        technicalAnalysis: TechnicalAnalysisResult
    ): { score: number; factors: string[] } {
        const factors: string[] = []
        let qualityScore = 0
        let maxScore = 0

        // Indicator alignment (30%)
        maxScore += 0.3
        const bullishIndicators = technicalAnalysis.indicators.filter(i => i.signal === 'BULLISH').length
        const bearishIndicators = technicalAnalysis.indicators.filter(i => i.signal === 'BEARISH').length
        const totalIndicators = technicalAnalysis.indicators.length

        if (totalIndicators > 0) {
            const alignment = Math.max(bullishIndicators, bearishIndicators) / totalIndicators
            qualityScore += alignment * 0.3
            factors.push(`Indicator alignment: ${(alignment * 100).toFixed(0)}%`)
        }

        // Pattern quality (25%)
        maxScore += 0.25
        const highConfidencePatterns = technicalAnalysis.patterns.filter(p => p.confidence > 0.7)
        if (highConfidencePatterns.length > 0) {
            qualityScore += 0.25
            factors.push(`${highConfidencePatterns.length} high-confidence pattern(s)`)
        } else if (technicalAnalysis.patterns.length > 0) {
            qualityScore += 0.15
            factors.push(`${technicalAnalysis.patterns.length} pattern(s) identified`)
        }

        // Support/Resistance strength (25%)
        maxScore += 0.25
        const strongLevels = technicalAnalysis.supportResistance.filter(sr => sr.strength > 0.7)
        if (strongLevels.length >= 2) {
            qualityScore += 0.25
            factors.push(`${strongLevels.length} strong S/R levels`)
        } else if (strongLevels.length > 0) {
            qualityScore += 0.15
            factors.push(`${strongLevels.length} strong S/R level`)
        }

        // Trend clarity (20%)
        maxScore += 0.2
        if (technicalAnalysis.trend.strength > 0.7) {
            qualityScore += 0.2
            factors.push(`Clear ${technicalAnalysis.trend.direction.toLowerCase()} (${(technicalAnalysis.trend.strength * 100).toFixed(0)}% strength)`)
        } else if (technicalAnalysis.trend.strength > 0.4) {
            qualityScore += 0.1
            factors.push(`Moderate trend strength`)
        }

        return {
            score: maxScore > 0 ? qualityScore / maxScore : 0,
            factors
        }
    }

    /**
     * Assess fundamental analysis quality
     */
    private static assessFundamentalQuality(
        fundamentalAnalysis: FundamentalAnalysisResult
    ): { score: number; factors: string[] } {
        const factors: string[] = []
        let qualityScore = 0
        let maxScore = 0

        // News coverage quality (40%)
        maxScore += 0.4
        const relevantNews = fundamentalAnalysis.newsAnalysis.relevantNews.length
        if (relevantNews >= 5) {
            qualityScore += 0.4
            factors.push(`Comprehensive news coverage (${relevantNews} articles)`)
        } else if (relevantNews >= 2) {
            qualityScore += 0.25
            factors.push(`Adequate news coverage (${relevantNews} articles)`)
        }

        // Financial data completeness (30%)
        maxScore += 0.3
        const metrics = fundamentalAnalysis.financialMetrics
        const hasCompleteMetrics = metrics.pe > 0 && metrics.eps !== 0 && metrics.revenue > 0
        if (hasCompleteMetrics) {
            qualityScore += 0.3
            factors.push('Complete financial metrics available')
        } else {
            qualityScore += 0.15
            factors.push('Partial financial data available')
        }

        // Sector analysis depth (20%)
        maxScore += 0.2
        if (fundamentalAnalysis.sectorAnalysis.peerComparison.length > 0) {
            qualityScore += 0.2
            factors.push('Sector comparison available')
        }

        // Event calendar (10%)
        maxScore += 0.1
        if (fundamentalAnalysis.upcomingEvents.length > 0) {
            qualityScore += 0.1
            factors.push(`${fundamentalAnalysis.upcomingEvents.length} upcoming event(s)`)
        }

        return {
            score: maxScore > 0 ? qualityScore / maxScore : 0,
            factors
        }
    }

    /**
     * Assess risk based on volatility and market conditions
     */
    private static assessRisk(
        signal: TradingSignal,
        technicalAnalysis: TechnicalAnalysisResult,
        fundamentalAnalysis: FundamentalAnalysisResult | null,
        data: OHLCV[]
    ): TradingSignal {
        let riskLevel = signal.riskLevel
        const riskFactors: string[] = []

        // Volatility risk assessment
        const volatility = technicalAnalysis.volatility
        if (volatility.volatilityRank > 0.8) {
            riskLevel = this.increaseRiskLevel(riskLevel)
            riskFactors.push('High volatility environment')
        } else if (volatility.volatilityRank < 0.2) {
            riskFactors.push('Low volatility - potential for sudden moves')
        }

        // Bollinger Band squeeze risk
        if (volatility.bollingerBands.squeeze) {
            riskFactors.push('Bollinger Band squeeze - volatility expansion expected')
        }

        // Trend risk assessment
        if (technicalAnalysis.trend.direction === 'SIDEWAYS') {
            riskLevel = this.increaseRiskLevel(riskLevel)
            riskFactors.push('Sideways trend increases directional uncertainty')
        }

        // Support/Resistance proximity risk
        const currentPrice = data[data.length - 1].close
        const nearbyLevels = technicalAnalysis.supportResistance.filter(sr => {
            const distance = Math.abs(sr.level - currentPrice) / currentPrice
            return distance < 0.02 // Within 2%
        })

        if (nearbyLevels.length > 0) {
            riskFactors.push(`Price near key S/R level (${nearbyLevels[0].level.toFixed(2)})`)
        }

        // Fundamental risk factors
        if (fundamentalAnalysis) {
            const highImpactEvents = fundamentalAnalysis.upcomingEvents.filter(e => e.expectedImpact === 'HIGH')
            if (highImpactEvents.length > 0) {
                riskLevel = this.increaseRiskLevel(riskLevel)
                riskFactors.push(`${highImpactEvents.length} high-impact event(s) approaching`)
            }

            // Earnings risk
            const earningsEvents = fundamentalAnalysis.upcomingEvents.filter(e => e.type === 'EARNINGS')
            if (earningsEvents.length > 0) {
                riskFactors.push('Earnings announcement approaching')
            }
        }

        // Pattern-based risk
        const uncertainPatterns = technicalAnalysis.patterns.filter(p =>
            p.type === 'SYMMETRICAL_TRIANGLE' && p.confidence > 0.6
        )
        if (uncertainPatterns.length > 0) {
            riskFactors.push('Symmetrical triangle - directional uncertainty')
        }

        return {
            ...signal,
            riskLevel,
            reasoning: [
                ...signal.reasoning,
                ...riskFactors.slice(0, 3) // Add top 3 risk factors
            ]
        }
    }

    /**
     * Calculate enhanced price targets
     */
    private static calculateEnhancedPriceTargets(
        technicalAnalysis: TechnicalAnalysisResult,
        currentPrice: number,
        data: OHLCV[]
    ): PriceTarget[] {
        // Find swing high and low for Fibonacci calculations
        const recentData = data.slice(-50) // Last 50 periods
        const swingHigh = Math.max(...recentData.map(d => d.high))
        const swingLow = Math.min(...recentData.map(d => d.low))

        // Determine likely direction based on trend
        let direction: 'BULLISH' | 'BEARISH' | undefined
        if (technicalAnalysis.trend.direction === 'UPTREND' && technicalAnalysis.trend.strength > 0.5) {
            direction = 'BULLISH'
        } else if (technicalAnalysis.trend.direction === 'DOWNTREND' && technicalAnalysis.trend.strength > 0.5) {
            direction = 'BEARISH'
        }

        return PriceTargetCalculator.calculateComprehensiveTargets(
            currentPrice,
            technicalAnalysis.supportResistance,
            technicalAnalysis.patterns,
            data,
            swingHigh,
            swingLow,
            direction
        )
    }

    /**
     * Enhance signal with comprehensive price targets
     */
    private static enhanceWithPriceTargets(
        signal: TradingSignal,
        allTargets: PriceTarget[],
        currentPrice: number
    ): TradingSignal {
        if (signal.action === 'HOLD') return signal

        // Filter targets relevant to signal direction
        const relevantTargets = allTargets.filter(target => {
            if (signal.action === 'BUY') {
                return target.type === 'TARGET' && target.level > currentPrice
            } else {
                return target.type === 'TARGET' && target.level < currentPrice
            }
        })

        // Find stop loss targets
        const stopLossTargets = allTargets.filter(target => {
            if (signal.action === 'BUY') {
                return target.type === 'STOP_LOSS' || (target.level < currentPrice && target.confidence > 0.6)
            } else {
                return target.type === 'STOP_LOSS' || (target.level > currentPrice && target.confidence > 0.6)
            }
        })

        // Update signal with enhanced targets
        const enhancedTargets = relevantTargets.slice(0, 3) // Top 3 targets
        let enhancedStopLoss = signal.stopLoss

        if (stopLossTargets.length > 0 && signal.stopLoss === 0) {
            enhancedStopLoss = stopLossTargets[0].level
        }

        return {
            ...signal,
            priceTargets: enhancedTargets.length > 0 ? enhancedTargets : signal.priceTargets,
            stopLoss: enhancedStopLoss
        }
    }

    /**
     * Increase risk level
     */
    private static increaseRiskLevel(currentLevel: 'LOW' | 'MEDIUM' | 'HIGH'): 'LOW' | 'MEDIUM' | 'HIGH' {
        switch (currentLevel) {
            case 'LOW': return 'MEDIUM'
            case 'MEDIUM': return 'HIGH'
            case 'HIGH': return 'HIGH'
        }
    }

    /**
     * Generate market context summary
     */
    static generateMarketContext(
        technicalAnalysis: TechnicalAnalysisResult,
        fundamentalAnalysis: FundamentalAnalysisResult | null
    ): {
        summary: string
        keyPoints: string[]
        riskFactors: string[]
        opportunities: string[]
    } {
        const keyPoints: string[] = []
        const riskFactors: string[] = []
        const opportunities: string[] = []

        // Technical context
        keyPoints.push(`Trend: ${technicalAnalysis.trend.direction} (${(technicalAnalysis.trend.strength * 100).toFixed(0)}% strength)`)
        keyPoints.push(`Momentum: ${technicalAnalysis.momentum.interpretation}`)

        if (technicalAnalysis.patterns.length > 0) {
            keyPoints.push(`${technicalAnalysis.patterns.length} chart pattern(s) identified`)
        }

        // Volatility context
        if (technicalAnalysis.volatility.volatilityRank > 0.7) {
            riskFactors.push('High volatility environment')
        } else if (technicalAnalysis.volatility.bollingerBands.squeeze) {
            opportunities.push('Bollinger Band squeeze - potential breakout setup')
        }

        // Support/Resistance context
        const strongLevels = technicalAnalysis.supportResistance.filter(sr => sr.strength > 0.7)
        if (strongLevels.length > 0) {
            opportunities.push(`${strongLevels.length} strong support/resistance level(s) for trade planning`)
        }

        // Fundamental context (if available)
        if (fundamentalAnalysis) {
            const sentiment = fundamentalAnalysis.marketSentiment.overall
            if (sentiment > 0.7) {
                opportunities.push('Strong positive market sentiment')
            } else if (sentiment < 0.3) {
                riskFactors.push('Negative market sentiment')
            }

            const highImpactEvents = fundamentalAnalysis.upcomingEvents.filter(e => e.expectedImpact === 'HIGH')
            if (highImpactEvents.length > 0) {
                riskFactors.push(`${highImpactEvents.length} high-impact event(s) approaching`)
            }
        }

        // Generate summary
        const trendDescription = technicalAnalysis.trend.direction === 'UPTREND' ? 'bullish' :
            technicalAnalysis.trend.direction === 'DOWNTREND' ? 'bearish' : 'neutral'

        const summary = `Market shows ${trendDescription} technical bias with ${technicalAnalysis.momentum.interpretation.toLowerCase()}. ` +
            `${technicalAnalysis.patterns.length} pattern(s) and ${strongLevels.length} strong S/R level(s) identified. ` +
            (fundamentalAnalysis ?
                `Fundamental sentiment is ${fundamentalAnalysis.marketSentiment.overall > 0.6 ? 'positive' :
                    fundamentalAnalysis.marketSentiment.overall < 0.4 ? 'negative' : 'neutral'}.` :
                'Fundamental analysis not available.')

        return {
            summary,
            keyPoints: keyPoints.slice(0, 5),
            riskFactors: riskFactors.slice(0, 4),
            opportunities: opportunities.slice(0, 4)
        }
    }
}