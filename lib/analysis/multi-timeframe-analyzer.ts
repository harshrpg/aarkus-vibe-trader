import {
    OHLCV,
    TechnicalAnalysisResult,
    AnalysisResult,
    TradingSignal,
    IndicatorResult,
    PatternResult,
    SupportResistanceLevel,
    PriceTarget
} from '../types/trading'
import { TechnicalAnalysisEngine } from '../agents/technical-analyzer'

/**
 * Multi-Timeframe Analysis Module
 * Analyzes multiple timeframes and provides confluence-based recommendations
 */

export interface TimeframeAnalysis {
    timeframe: string
    analysis: TechnicalAnalysisResult
    signals: TradingSignal[]
    weight: number
    confidence: number
}

export interface MultiTimeframeResult {
    symbol: string
    primaryTimeframe: string
    timeframeAnalyses: TimeframeAnalysis[]
    confluenceSignals: TradingSignal[]
    overallConfidence: number
    timeframeCorrelation: TimeframeCorrelation
    riskAssessment: MultiTimeframeRiskAssessment
}

export interface TimeframeCorrelation {
    trendAlignment: number // 0-1, how aligned trends are across timeframes
    momentumAlignment: number // 0-1, how aligned momentum is across timeframes
    supportResistanceAlignment: number // 0-1, how aligned key levels are
    conflictingSignals: string[] // List of conflicting signals between timeframes
}

export interface MultiTimeframeRiskAssessment {
    overallRisk: 'LOW' | 'MEDIUM' | 'HIGH'
    timeframeRisks: Record<string, 'LOW' | 'MEDIUM' | 'HIGH'>
    riskFactors: string[]
    recommendedPosition: 'LONG' | 'SHORT' | 'NEUTRAL'
    positionSize: number // 0-1, recommended position size based on confluence
}

export class MultiTimeframeAnalyzer {
    private static readonly STANDARD_TIMEFRAMES = ['1H', '4H', '1D', '1W']
    private static readonly TIMEFRAME_WEIGHTS = {
        '1H': 0.15,
        '4H': 0.25,
        '1D': 0.35,
        '1W': 0.25
    }

    /**
     * Perform multi-timeframe analysis across standard timeframes
     */
    static async analyzeMultipleTimeframes(
        symbol: string,
        priceDataMap: Record<string, OHLCV[]>,
        primaryTimeframe: string = '1D'
    ): Promise<MultiTimeframeResult> {
        const timeframeAnalyses: TimeframeAnalysis[] = []

        // Analyze each timeframe
        for (const timeframe of this.STANDARD_TIMEFRAMES) {
            const priceData = priceDataMap[timeframe]
            if (!priceData || priceData.length < 20) {
                console.warn(`Insufficient data for ${timeframe} timeframe`)
                continue
            }

            try {
                const analysis = await TechnicalAnalysisEngine.analyzePrice(symbol, timeframe, priceData)
                const signals = TechnicalAnalysisEngine.generateSignals(analysis)
                const weight = this.TIMEFRAME_WEIGHTS[timeframe as keyof typeof this.TIMEFRAME_WEIGHTS] || 0.1
                const confidence = this.calculateTimeframeConfidence(analysis, signals)

                timeframeAnalyses.push({
                    timeframe,
                    analysis,
                    signals,
                    weight,
                    confidence
                })
            } catch (error) {
                console.error(`Error analyzing ${timeframe} timeframe:`, error)
            }
        }

        if (timeframeAnalyses.length === 0) {
            throw new Error('No timeframe data available for analysis')
        }

        // Calculate timeframe correlation
        const timeframeCorrelation = this.calculateTimeframeCorrelation(timeframeAnalyses)

        // Generate confluence-based signals
        const confluenceSignals = this.generateConfluenceSignals(timeframeAnalyses, timeframeCorrelation)

        // Calculate overall confidence
        const overallConfidence = this.calculateOverallConfidence(timeframeAnalyses, timeframeCorrelation)

        // Assess multi-timeframe risk
        const riskAssessment = this.assessMultiTimeframeRisk(timeframeAnalyses, confluenceSignals)

        return {
            symbol,
            primaryTimeframe,
            timeframeAnalyses,
            confluenceSignals,
            overallConfidence,
            timeframeCorrelation,
            riskAssessment
        }
    }

    /**
     * Calculate confidence for a single timeframe analysis
     */
    private static calculateTimeframeConfidence(
        analysis: TechnicalAnalysisResult,
        signals: TradingSignal[]
    ): number {
        let confidence = 0.5

        // Factor in trend strength
        confidence += analysis.trend.strength * 0.2

        // Factor in pattern confidence
        if (analysis.patterns.length > 0) {
            const avgPatternConfidence = analysis.patterns.reduce((sum, p) => sum + p.confidence, 0) / analysis.patterns.length
            confidence += avgPatternConfidence * 0.2
        }

        // Factor in indicator alignment
        const bullishIndicators = analysis.indicators.filter(i => i.signal === 'BULLISH').length
        const bearishIndicators = analysis.indicators.filter(i => i.signal === 'BEARISH').length
        const totalIndicators = analysis.indicators.length

        if (totalIndicators > 0) {
            const alignment = Math.abs(bullishIndicators - bearishIndicators) / totalIndicators
            confidence += alignment * 0.15
        }

        // Factor in signal confidence
        if (signals.length > 0) {
            const avgSignalConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length
            confidence += avgSignalConfidence * 0.15
        }

        return Math.max(0.1, Math.min(0.9, confidence))
    }

    /**
     * Calculate correlation between different timeframes
     */
    private static calculateTimeframeCorrelation(timeframeAnalyses: TimeframeAnalysis[]): TimeframeCorrelation {
        if (timeframeAnalyses.length < 2) {
            return {
                trendAlignment: 0.5,
                momentumAlignment: 0.5,
                supportResistanceAlignment: 0.5,
                conflictingSignals: []
            }
        }

        // Calculate trend alignment
        const trendAlignment = this.calculateTrendAlignment(timeframeAnalyses)

        // Calculate momentum alignment
        const momentumAlignment = this.calculateMomentumAlignment(timeframeAnalyses)

        // Calculate support/resistance alignment
        const supportResistanceAlignment = this.calculateSupportResistanceAlignment(timeframeAnalyses)

        // Identify conflicting signals
        const conflictingSignals = this.identifyConflictingSignals(timeframeAnalyses)

        return {
            trendAlignment,
            momentumAlignment,
            supportResistanceAlignment,
            conflictingSignals
        }
    }

    /**
     * Calculate trend alignment across timeframes
     */
    private static calculateTrendAlignment(timeframeAnalyses: TimeframeAnalysis[]): number {
        const trends = timeframeAnalyses.map(ta => ta.analysis.trend.direction)

        // Count how many timeframes agree on trend direction
        const trendCounts = {
            'UPTREND': trends.filter(t => t === 'UPTREND').length,
            'DOWNTREND': trends.filter(t => t === 'DOWNTREND').length,
            'SIDEWAYS': trends.filter(t => t === 'SIDEWAYS').length
        }

        const maxCount = Math.max(...Object.values(trendCounts))
        return maxCount / trends.length
    }

    /**
     * Calculate momentum alignment across timeframes
     */
    private static calculateMomentumAlignment(timeframeAnalyses: TimeframeAnalysis[]): number {
        const rsiValues = timeframeAnalyses.map(ta => ta.analysis.momentum.rsi)
        const macdHistograms = timeframeAnalyses.map(ta => ta.analysis.momentum.macd.histogram)

        // Check RSI alignment (all overbought, oversold, or neutral)
        const rsiOverbought = rsiValues.filter(rsi => rsi > 70).length
        const rsiOversold = rsiValues.filter(rsi => rsi < 30).length
        const rsiNeutral = rsiValues.filter(rsi => rsi >= 30 && rsi <= 70).length

        const rsiAlignment = Math.max(rsiOverbought, rsiOversold, rsiNeutral) / rsiValues.length

        // Check MACD alignment (all positive or negative histograms)
        const macdPositive = macdHistograms.filter(h => h > 0).length
        const macdNegative = macdHistograms.filter(h => h < 0).length

        const macdAlignment = Math.max(macdPositive, macdNegative) / macdHistograms.length

        return (rsiAlignment + macdAlignment) / 2
    }

    /**
     * Calculate support/resistance alignment across timeframes
     */
    private static calculateSupportResistanceAlignment(timeframeAnalyses: TimeframeAnalysis[]): number {
        // Get all support/resistance levels from all timeframes
        const allLevels: Array<{ level: number, type: 'SUPPORT' | 'RESISTANCE', timeframe: string }> = []

        timeframeAnalyses.forEach(ta => {
            ta.analysis.supportResistance.forEach(sr => {
                allLevels.push({
                    level: sr.level,
                    type: sr.type,
                    timeframe: ta.timeframe
                })
            })
        })

        if (allLevels.length === 0) return 0.5

        // Find levels that appear in multiple timeframes (within 2% tolerance)
        let alignedLevels = 0
        const tolerance = 0.02

        for (let i = 0; i < allLevels.length; i++) {
            let matches = 1 // Count itself
            for (let j = i + 1; j < allLevels.length; j++) {
                const priceDiff = Math.abs(allLevels[i].level - allLevels[j].level) / allLevels[i].level
                if (priceDiff <= tolerance && allLevels[i].type === allLevels[j].type) {
                    matches++
                }
            }
            if (matches > 1) {
                alignedLevels++
            }
        }

        return Math.min(1, alignedLevels / (allLevels.length * 0.5))
    }

    /**
     * Identify conflicting signals between timeframes
     */
    private static identifyConflictingSignals(timeframeAnalyses: TimeframeAnalysis[]): string[] {
        const conflicts: string[] = []

        // Check for trend conflicts
        const trends = timeframeAnalyses.map(ta => ({
            timeframe: ta.timeframe,
            trend: ta.analysis.trend.direction
        }))

        const uptrends = trends.filter(t => t.trend === 'UPTREND')
        const downtrends = trends.filter(t => t.trend === 'DOWNTREND')

        if (uptrends.length > 0 && downtrends.length > 0) {
            conflicts.push(`Trend conflict: ${uptrends.map(t => t.timeframe).join(', ')} showing uptrend while ${downtrends.map(t => t.timeframe).join(', ')} showing downtrend`)
        }

        // Check for signal conflicts
        const signals = timeframeAnalyses.map(ta => ({
            timeframe: ta.timeframe,
            signals: ta.signals.filter(s => s.action !== 'HOLD')
        }))

        const buySignals = signals.filter(s => s.signals.some(sig => sig.action === 'BUY'))
        const sellSignals = signals.filter(s => s.signals.some(sig => sig.action === 'SELL'))

        if (buySignals.length > 0 && sellSignals.length > 0) {
            conflicts.push(`Signal conflict: ${buySignals.map(s => s.timeframe).join(', ')} showing buy signals while ${sellSignals.map(s => s.timeframe).join(', ')} showing sell signals`)
        }

        return conflicts
    }

    /**
     * Generate confluence-based trading signals
     */
    private static generateConfluenceSignals(
        timeframeAnalyses: TimeframeAnalysis[],
        correlation: TimeframeCorrelation
    ): TradingSignal[] {
        const confluenceSignals: TradingSignal[] = []

        // Collect all signals with their weights
        const weightedSignals: Array<{ signal: TradingSignal, weight: number, timeframe: string }> = []

        timeframeAnalyses.forEach(ta => {
            ta.signals.forEach(signal => {
                weightedSignals.push({
                    signal,
                    weight: ta.weight * ta.confidence,
                    timeframe: ta.timeframe
                })
            })
        })

        // Calculate weighted signal scores
        let buyScore = 0
        let sellScore = 0
        let holdScore = 0

        weightedSignals.forEach(ws => {
            switch (ws.signal.action) {
                case 'BUY':
                    buyScore += ws.weight * ws.signal.confidence
                    break
                case 'SELL':
                    sellScore += ws.weight * ws.signal.confidence
                    break
                case 'HOLD':
                    holdScore += ws.weight * ws.signal.confidence
                    break
            }
        })

        // Determine primary signal based on highest score
        const totalScore = buyScore + sellScore + holdScore
        if (totalScore === 0) {
            return [this.createHoldSignal('No clear signals across timeframes')]
        }

        const buyPercentage = buyScore / totalScore
        const sellPercentage = sellScore / totalScore
        const holdPercentage = holdScore / totalScore

        // Generate confluence signal
        if (buyPercentage > 0.4 && buyPercentage > sellPercentage) {
            confluenceSignals.push(this.createConfluenceBuySignal(
                timeframeAnalyses,
                correlation,
                buyPercentage
            ))
        } else if (sellPercentage > 0.4 && sellPercentage > buyPercentage) {
            confluenceSignals.push(this.createConfluenceSellSignal(
                timeframeAnalyses,
                correlation,
                sellPercentage
            ))
        } else {
            confluenceSignals.push(this.createHoldSignal(
                `Mixed signals: ${(buyPercentage * 100).toFixed(0)}% buy, ${(sellPercentage * 100).toFixed(0)}% sell`
            ))
        }

        return confluenceSignals
    }

    /**
     * Create confluence-based buy signal
     */
    private static createConfluenceBuySignal(
        timeframeAnalyses: TimeframeAnalysis[],
        correlation: TimeframeCorrelation,
        confidence: number
    ): TradingSignal {
        const supportingTimeframes = timeframeAnalyses
            .filter(ta => ta.signals.some(s => s.action === 'BUY'))
            .map(ta => ta.timeframe)

        // Collect price targets from all timeframes
        const allTargets: PriceTarget[] = []
        timeframeAnalyses.forEach(ta => {
            ta.signals.forEach(signal => {
                if (signal.action === 'BUY') {
                    allTargets.push(...signal.priceTargets)
                }
            })
        })

        // Calculate confluence-based price targets
        const confluenceTargets = this.calculateConfluencePriceTargets(allTargets, 'BUY')

        const reasoning = [
            `Multi-timeframe confluence: ${supportingTimeframes.join(', ')} showing buy signals`,
            `Trend alignment: ${(correlation.trendAlignment * 100).toFixed(0)}%`,
            `Momentum alignment: ${(correlation.momentumAlignment * 100).toFixed(0)}%`
        ]

        if (correlation.conflictingSignals.length > 0) {
            reasoning.push(`Note: ${correlation.conflictingSignals.length} conflicting signals identified`)
        }

        return {
            action: 'BUY',
            confidence: Math.min(0.9, confidence * correlation.trendAlignment),
            reasoning,
            priceTargets: confluenceTargets,
            stopLoss: this.calculateConfluenceStopLoss(timeframeAnalyses, 'BUY'),
            timeHorizon: this.determineTimeHorizon(supportingTimeframes),
            riskLevel: this.determineRiskLevel(correlation, confidence)
        }
    }

    /**
     * Create confluence-based sell signal
     */
    private static createConfluenceSellSignal(
        timeframeAnalyses: TimeframeAnalysis[],
        correlation: TimeframeCorrelation,
        confidence: number
    ): TradingSignal {
        const supportingTimeframes = timeframeAnalyses
            .filter(ta => ta.signals.some(s => s.action === 'SELL'))
            .map(ta => ta.timeframe)

        // Collect price targets from all timeframes
        const allTargets: PriceTarget[] = []
        timeframeAnalyses.forEach(ta => {
            ta.signals.forEach(signal => {
                if (signal.action === 'SELL') {
                    allTargets.push(...signal.priceTargets)
                }
            })
        })

        // Calculate confluence-based price targets
        const confluenceTargets = this.calculateConfluencePriceTargets(allTargets, 'SELL')

        const reasoning = [
            `Multi-timeframe confluence: ${supportingTimeframes.join(', ')} showing sell signals`,
            `Trend alignment: ${(correlation.trendAlignment * 100).toFixed(0)}%`,
            `Momentum alignment: ${(correlation.momentumAlignment * 100).toFixed(0)}%`
        ]

        if (correlation.conflictingSignals.length > 0) {
            reasoning.push(`Note: ${correlation.conflictingSignals.length} conflicting signals identified`)
        }

        return {
            action: 'SELL',
            confidence: Math.min(0.9, confidence * correlation.trendAlignment),
            reasoning,
            priceTargets: confluenceTargets,
            stopLoss: this.calculateConfluenceStopLoss(timeframeAnalyses, 'SELL'),
            timeHorizon: this.determineTimeHorizon(supportingTimeframes),
            riskLevel: this.determineRiskLevel(correlation, confidence)
        }
    }

    /**
     * Create hold signal
     */
    private static createHoldSignal(reason: string): TradingSignal {
        return {
            action: 'HOLD',
            confidence: 0.6,
            reasoning: [reason, 'Waiting for clearer multi-timeframe confluence'],
            priceTargets: [],
            stopLoss: 0,
            timeHorizon: 'Short-term (1-2 weeks)',
            riskLevel: 'LOW'
        }
    }

    /**
     * Calculate confluence-based price targets
     */
    private static calculateConfluencePriceTargets(
        allTargets: PriceTarget[],
        action: 'BUY' | 'SELL'
    ): PriceTarget[] {
        if (allTargets.length === 0) return []

        // Group targets by similar levels (within 2% tolerance)
        const targetGroups: Array<{ level: number, targets: PriceTarget[] }> = []
        const tolerance = 0.02

        allTargets.forEach(target => {
            let addedToGroup = false
            for (const group of targetGroups) {
                const priceDiff = Math.abs(target.level - group.level) / group.level
                if (priceDiff <= tolerance) {
                    group.targets.push(target)
                    addedToGroup = true
                    break
                }
            }
            if (!addedToGroup) {
                targetGroups.push({ level: target.level, targets: [target] })
            }
        })

        // Create confluence targets from groups with multiple targets
        const confluenceTargets: PriceTarget[] = []

        targetGroups
            .filter(group => group.targets.length > 1)
            .sort((a, b) => b.targets.length - a.targets.length)
            .slice(0, 3) // Take top 3 confluence levels
            .forEach((group, index) => {
                const avgLevel = group.targets.reduce((sum, t) => sum + t.level, 0) / group.targets.length
                const avgConfidence = group.targets.reduce((sum, t) => sum + t.confidence, 0) / group.targets.length

                confluenceTargets.push({
                    level: avgLevel,
                    type: 'TARGET',
                    confidence: Math.min(0.9, avgConfidence * (group.targets.length / allTargets.length) * 2),
                    reasoning: `Confluence target from ${group.targets.length} timeframes`
                })
            })

        return confluenceTargets
    }

    /**
     * Calculate confluence-based stop loss
     */
    private static calculateConfluenceStopLoss(
        timeframeAnalyses: TimeframeAnalysis[],
        action: 'BUY' | 'SELL'
    ): number {
        const stopLosses = timeframeAnalyses
            .flatMap(ta => ta.signals)
            .filter(signal => signal.action === action && signal.stopLoss > 0)
            .map(signal => signal.stopLoss)

        if (stopLosses.length === 0) return 0

        // Use the most conservative (furthest) stop loss
        return action === 'BUY'
            ? Math.min(...stopLosses)
            : Math.max(...stopLosses)
    }

    /**
     * Determine time horizon based on supporting timeframes
     */
    private static determineTimeHorizon(supportingTimeframes: string[]): string {
        const hasLongTerm = supportingTimeframes.some(tf => ['1D', '1W'].includes(tf))
        const hasShortTerm = supportingTimeframes.some(tf => ['1H', '4H'].includes(tf))

        if (hasLongTerm && hasShortTerm) {
            return 'Medium to long-term (2-8 weeks)'
        } else if (hasLongTerm) {
            return 'Long-term (4-12 weeks)'
        } else {
            return 'Short to medium-term (1-4 weeks)'
        }
    }

    /**
     * Determine risk level based on correlation and confidence
     */
    private static determineRiskLevel(
        correlation: TimeframeCorrelation,
        confidence: number
    ): 'LOW' | 'MEDIUM' | 'HIGH' {
        const alignmentScore = (correlation.trendAlignment + correlation.momentumAlignment) / 2
        const conflictPenalty = correlation.conflictingSignals.length * 0.1

        const riskScore = (alignmentScore * confidence) - conflictPenalty

        if (riskScore > 0.7) return 'LOW'
        if (riskScore > 0.4) return 'MEDIUM'
        return 'HIGH'
    }

    /**
     * Calculate overall confidence across all timeframes
     */
    private static calculateOverallConfidence(
        timeframeAnalyses: TimeframeAnalysis[],
        correlation: TimeframeCorrelation
    ): number {
        const weightedConfidence = timeframeAnalyses.reduce((sum, ta) => {
            return sum + (ta.confidence * ta.weight)
        }, 0)

        const totalWeight = timeframeAnalyses.reduce((sum, ta) => sum + ta.weight, 0)
        const baseConfidence = totalWeight > 0 ? weightedConfidence / totalWeight : 0.5

        // Adjust based on correlation
        const correlationBonus = (correlation.trendAlignment + correlation.momentumAlignment) / 2 * 0.2
        const conflictPenalty = correlation.conflictingSignals.length * 0.05

        return Math.max(0.1, Math.min(0.9, baseConfidence + correlationBonus - conflictPenalty))
    }

    /**
     * Assess multi-timeframe risk
     */
    private static assessMultiTimeframeRisk(
        timeframeAnalyses: TimeframeAnalysis[],
        confluenceSignals: TradingSignal[]
    ): MultiTimeframeRiskAssessment {
        const timeframeRisks: Record<string, 'LOW' | 'MEDIUM' | 'HIGH'> = {}
        const riskFactors: string[] = []

        // Assess risk for each timeframe
        timeframeAnalyses.forEach(ta => {
            const volatility = ta.analysis.volatility.volatilityRank
            const trendStrength = ta.analysis.trend.strength

            let risk: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM'

            if (volatility > 0.8) {
                risk = 'HIGH'
                riskFactors.push(`High volatility in ${ta.timeframe} timeframe`)
            } else if (volatility < 0.3 && trendStrength > 0.7) {
                risk = 'LOW'
            }

            if (ta.confidence < 0.4) {
                risk = 'HIGH'
                riskFactors.push(`Low confidence in ${ta.timeframe} analysis`)
            }

            timeframeRisks[ta.timeframe] = risk
        })

        // Determine overall risk
        const riskValues = Object.values(timeframeRisks)
        const highRiskCount = riskValues.filter(r => r === 'HIGH').length
        const lowRiskCount = riskValues.filter(r => r === 'LOW').length

        let overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM'

        if (highRiskCount > riskValues.length / 2) {
            overallRisk = 'HIGH'
        } else if (lowRiskCount > riskValues.length / 2) {
            overallRisk = 'LOW'
        }

        // Determine recommended position
        const primarySignal = confluenceSignals[0]
        let recommendedPosition: 'LONG' | 'SHORT' | 'NEUTRAL' = 'NEUTRAL'
        let positionSize = 0.5

        if (primarySignal) {
            if (primarySignal.action === 'BUY') {
                recommendedPosition = 'LONG'
                positionSize = this.calculatePositionSize(primarySignal.confidence, overallRisk)
            } else if (primarySignal.action === 'SELL') {
                recommendedPosition = 'SHORT'
                positionSize = this.calculatePositionSize(primarySignal.confidence, overallRisk)
            }
        }

        return {
            overallRisk,
            timeframeRisks,
            riskFactors,
            recommendedPosition,
            positionSize
        }
    }

    /**
     * Calculate recommended position size based on confidence and risk
     */
    private static calculatePositionSize(confidence: number, risk: 'LOW' | 'MEDIUM' | 'HIGH'): number {
        let baseSize = confidence

        // Adjust based on risk
        switch (risk) {
            case 'LOW':
                baseSize *= 1.2
                break
            case 'MEDIUM':
                baseSize *= 1.0
                break
            case 'HIGH':
                baseSize *= 0.6
                break
        }

        return Math.max(0.1, Math.min(1.0, baseSize))
    }
}