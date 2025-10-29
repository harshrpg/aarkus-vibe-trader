import {
    TechnicalAnalysisResult,
    FundamentalAnalysisResult,
    TradingSignal,
    PriceTarget,
    IndicatorResult,
    PatternResult,
    SupportResistanceLevel,
    OHLCV
} from '../types/trading'

/**
 * Signal Generation Engine
 * Combines technical and fundamental analysis to generate trading recommendations
 */
export class SignalGenerator {
    /**
     * Generate trading signals by combining technical indicators
     */
    static generateTechnicalSignals(
        analysis: TechnicalAnalysisResult,
        timeframe: string = '1D'
    ): TradingSignal[] {
        const signals: TradingSignal[] = []

        // Calculate signal strength from multiple indicators
        const signalStrength = this.calculateSignalStrength(analysis.indicators)

        // Get confluence from multiple analysis components
        const confluence = this.calculateConfluence(analysis)

        // Generate timeframe-specific signals
        const timeframeSignals = this.generateTimeframeSpecificSignals(analysis, timeframe)

        // Combine all factors into final signals
        for (const signal of timeframeSignals) {
            const enhancedSignal = this.enhanceSignalWithConfluence(signal, confluence, signalStrength)
            signals.push(enhancedSignal)
        }

        return signals.sort((a, b) => b.confidence - a.confidence)
    }

    /**
     * Calculate signal strength based on multiple indicator confluence
     */
    private static calculateSignalStrength(indicators: IndicatorResult[]): {
        bullish: number
        bearish: number
        neutral: number
    } {
        let bullishCount = 0
        let bearishCount = 0
        let neutralCount = 0
        let totalWeight = 0

        // Weight different indicators based on reliability
        const indicatorWeights: Record<string, number> = {
            'RSI': 1.0,
            'MACD': 1.2,
            'Bollinger Bands': 0.8,
            'Stochastic': 0.9,
            'SMA20': 1.1,
            'SMA50': 1.3,
            'EMA12': 0.9,
            'EMA26': 1.0
        }

        for (const indicator of indicators) {
            const weight = indicatorWeights[indicator.name] || 1.0
            totalWeight += weight

            switch (indicator.signal) {
                case 'BULLISH':
                    bullishCount += weight
                    break
                case 'BEARISH':
                    bearishCount += weight
                    break
                case 'NEUTRAL':
                    neutralCount += weight
                    break
            }
        }

        return {
            bullish: totalWeight > 0 ? bullishCount / totalWeight : 0,
            bearish: totalWeight > 0 ? bearishCount / totalWeight : 0,
            neutral: totalWeight > 0 ? neutralCount / totalWeight : 0
        }
    }

    /**
     * Calculate confluence score from all analysis components
     */
    private static calculateConfluence(analysis: TechnicalAnalysisResult): {
        score: number
        factors: string[]
    } {
        const factors: string[] = []
        let confluenceScore = 0
        let maxScore = 0

        // Trend analysis (weight: 25%)
        maxScore += 0.25
        if (analysis.trend.direction === 'UPTREND' && analysis.trend.strength > 0.6) {
            confluenceScore += 0.25
            factors.push('Strong uptrend confirmed')
        } else if (analysis.trend.direction === 'DOWNTREND' && analysis.trend.strength > 0.6) {
            confluenceScore += 0.25
            factors.push('Strong downtrend confirmed')
        } else if (analysis.trend.strength > 0.4) {
            confluenceScore += 0.15
            factors.push(`Moderate ${analysis.trend.direction.toLowerCase()}`)
        }

        // Momentum analysis (weight: 20%)
        maxScore += 0.20
        const { rsi, macd, stochastic } = analysis.momentum

        if ((rsi > 50 && macd.histogram > 0 && stochastic.k > stochastic.d) ||
            (rsi < 50 && macd.histogram < 0 && stochastic.k < stochastic.d)) {
            confluenceScore += 0.20
            factors.push('Momentum indicators aligned')
        } else if ((rsi > 50 && macd.histogram > 0) || (rsi < 50 && macd.histogram < 0)) {
            confluenceScore += 0.12
            factors.push('Partial momentum alignment')
        }

        // Pattern analysis (weight: 20%)
        maxScore += 0.20
        const strongPatterns = analysis.patterns.filter(p => p.confidence > 0.7)
        if (strongPatterns.length > 0) {
            confluenceScore += 0.20
            factors.push(`${strongPatterns.length} high-confidence pattern(s) identified`)
        } else if (analysis.patterns.length > 0) {
            confluenceScore += 0.10
            factors.push(`${analysis.patterns.length} pattern(s) identified`)
        }

        // Support/Resistance analysis (weight: 15%)
        maxScore += 0.15
        const strongLevels = analysis.supportResistance.filter(sr => sr.strength > 0.7)
        if (strongLevels.length >= 2) {
            confluenceScore += 0.15
            factors.push('Strong support/resistance levels identified')
        } else if (strongLevels.length > 0) {
            confluenceScore += 0.08
            factors.push('Key support/resistance level identified')
        }

        // Volatility analysis (weight: 10%)
        maxScore += 0.10
        if (analysis.volatility.volatilityRank > 0.3 && analysis.volatility.volatilityRank < 0.8) {
            confluenceScore += 0.10
            factors.push('Favorable volatility conditions')
        } else if (analysis.volatility.bollingerBands.squeeze) {
            confluenceScore += 0.05
            factors.push('Bollinger Band squeeze - potential breakout')
        }

        // Volume confirmation (weight: 10%)
        maxScore += 0.10
        const volumeLevels = analysis.supportResistance.filter(sr => sr.volume > 0)
        if (volumeLevels.length > 0) {
            confluenceScore += 0.10
            factors.push('Volume confirmation at key levels')
        }

        return {
            score: maxScore > 0 ? confluenceScore / maxScore : 0,
            factors
        }
    }

    /**
     * Generate signals specific to timeframe
     */
    private static generateTimeframeSpecificSignals(
        analysis: TechnicalAnalysisResult,
        timeframe: string
    ): TradingSignal[] {
        const signals: TradingSignal[] = []

        // Determine signal characteristics based on timeframe
        const timeframeConfig = this.getTimeframeConfig(timeframe)

        // Generate primary signal based on overall analysis
        const primarySignal = this.generatePrimarySignal(analysis, timeframeConfig)
        if (primarySignal) {
            signals.push(primarySignal)
        }

        // Generate counter-trend signals for shorter timeframes
        if (timeframeConfig.allowCounterTrend) {
            const counterSignal = this.generateCounterTrendSignal(analysis, timeframeConfig)
            if (counterSignal) {
                signals.push(counterSignal)
            }
        }

        return signals
    }

    /**
     * Get configuration for specific timeframe
     */
    private static getTimeframeConfig(timeframe: string): {
        horizon: string
        riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH'
        allowCounterTrend: boolean
        minConfidence: number
        stopLossMultiplier: number
    } {
        switch (timeframe) {
            case '1m':
            case '5m':
            case '15m':
                return {
                    horizon: 'Scalping (minutes to hours)',
                    riskTolerance: 'HIGH',
                    allowCounterTrend: true,
                    minConfidence: 0.6,
                    stopLossMultiplier: 0.5
                }
            case '1h':
            case '4h':
                return {
                    horizon: 'Intraday (hours to 1 day)',
                    riskTolerance: 'MEDIUM',
                    allowCounterTrend: true,
                    minConfidence: 0.65,
                    stopLossMultiplier: 0.75
                }
            case '1d':
                return {
                    horizon: 'Swing (days to weeks)',
                    riskTolerance: 'MEDIUM',
                    allowCounterTrend: false,
                    minConfidence: 0.7,
                    stopLossMultiplier: 1.0
                }
            case '1w':
            case '1M':
                return {
                    horizon: 'Position (weeks to months)',
                    riskTolerance: 'LOW',
                    allowCounterTrend: false,
                    minConfidence: 0.75,
                    stopLossMultiplier: 1.5
                }
            default:
                return {
                    horizon: 'Medium-term (days to weeks)',
                    riskTolerance: 'MEDIUM',
                    allowCounterTrend: false,
                    minConfidence: 0.7,
                    stopLossMultiplier: 1.0
                }
        }
    }

    /**
     * Generate primary signal based on trend and momentum
     */
    private static generatePrimarySignal(
        analysis: TechnicalAnalysisResult,
        config: ReturnType<typeof SignalGenerator.getTimeframeConfig>
    ): TradingSignal | null {
        const { trend, momentum, supportResistance } = analysis

        // Determine signal direction
        let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD'
        let confidence = 0.5
        let reasoning: string[] = []

        // Bullish conditions
        if (trend.direction === 'UPTREND' && trend.strength > 0.5) {
            if (momentum.rsi > 30 && momentum.rsi < 70 && momentum.macd.histogram > 0) {
                action = 'BUY'
                confidence = 0.7 + (trend.strength * 0.2)
                reasoning.push('Strong uptrend with bullish momentum')
                reasoning.push(`RSI at ${momentum.rsi.toFixed(1)} - not overbought`)
                reasoning.push('MACD histogram positive')
            }
        }
        // Bearish conditions
        else if (trend.direction === 'DOWNTREND' && trend.strength > 0.5) {
            if (momentum.rsi > 30 && momentum.rsi < 70 && momentum.macd.histogram < 0) {
                action = 'SELL'
                confidence = 0.7 + (trend.strength * 0.2)
                reasoning.push('Strong downtrend with bearish momentum')
                reasoning.push(`RSI at ${momentum.rsi.toFixed(1)} - not oversold`)
                reasoning.push('MACD histogram negative')
            }
        }
        // Reversal conditions
        else if (momentum.rsi > 80 || momentum.rsi < 20) {
            if (momentum.rsi > 80) {
                action = 'SELL'
                confidence = 0.6
                reasoning.push('Extremely overbought conditions (RSI > 80)')
            } else {
                action = 'BUY'
                confidence = 0.6
                reasoning.push('Extremely oversold conditions (RSI < 20)')
            }
        }

        // Check if confidence meets minimum threshold
        if (confidence < config.minConfidence) {
            return null
        }

        // Generate price targets and stop loss
        const priceTargets = this.calculatePriceTargetsFromLevels(
            supportResistance,
            action,
            confidence
        )

        const stopLoss = this.calculateStopLoss(
            supportResistance,
            action,
            config.stopLossMultiplier
        )

        return {
            action,
            confidence: Math.min(0.95, confidence),
            reasoning,
            priceTargets,
            stopLoss,
            timeHorizon: config.horizon,
            riskLevel: config.riskTolerance
        }
    }

    /**
     * Generate counter-trend signals for mean reversion
     */
    private static generateCounterTrendSignal(
        analysis: TechnicalAnalysisResult,
        config: ReturnType<typeof SignalGenerator.getTimeframeConfig>
    ): TradingSignal | null {
        const { momentum, supportResistance, volatility } = analysis

        // Only generate counter-trend signals in oversold/overbought conditions
        if (momentum.rsi <= 25 || momentum.rsi >= 75) {
            const action: 'BUY' | 'SELL' = momentum.rsi <= 25 ? 'BUY' : 'SELL'
            const confidence = 0.5 + Math.abs(momentum.rsi - 50) / 100

            // Look for support/resistance confluence
            const relevantLevels = supportResistance.filter(sr =>
                (action === 'BUY' && sr.type === 'SUPPORT') ||
                (action === 'SELL' && sr.type === 'RESISTANCE')
            )

            if (relevantLevels.length === 0) {
                return null // No levels to support counter-trend trade
            }

            const reasoning = [
                `Counter-trend ${action.toLowerCase()} signal`,
                `RSI at extreme level: ${momentum.rsi.toFixed(1)}`,
                `${relevantLevels.length} key level(s) providing confluence`
            ]

            // Add Bollinger Band squeeze information
            if (volatility.bollingerBands.squeeze) {
                reasoning.push('Bollinger Band squeeze suggests imminent volatility expansion')
            }

            const priceTargets = this.calculatePriceTargetsFromLevels(
                relevantLevels,
                action,
                confidence * 0.8 // Lower confidence for counter-trend
            )

            const stopLoss = this.calculateStopLoss(
                supportResistance,
                action,
                config.stopLossMultiplier * 0.7 // Tighter stops for counter-trend
            )

            return {
                action,
                confidence: Math.min(0.8, confidence),
                reasoning,
                priceTargets,
                stopLoss,
                timeHorizon: config.horizon,
                riskLevel: 'HIGH' // Counter-trend is always higher risk
            }
        }

        return null
    }

    /**
     * Enhance signal with confluence analysis
     */
    private static enhanceSignalWithConfluence(
        signal: TradingSignal,
        confluence: ReturnType<typeof SignalGenerator.calculateConfluence>,
        signalStrength: ReturnType<typeof SignalGenerator.calculateSignalStrength>
    ): TradingSignal {
        // Adjust confidence based on confluence
        const confluenceBonus = confluence.score * 0.2
        const enhancedConfidence = Math.min(0.95, signal.confidence + confluenceBonus)

        // Add confluence factors to reasoning
        const enhancedReasoning = [
            ...signal.reasoning,
            `Confluence score: ${(confluence.score * 100).toFixed(0)}%`,
            ...confluence.factors.slice(0, 3) // Top 3 confluence factors
        ]

        // Add signal strength information
        if (signal.action === 'BUY' && signalStrength.bullish > 0.6) {
            enhancedReasoning.push(`Strong bullish indicator alignment (${(signalStrength.bullish * 100).toFixed(0)}%)`)
        } else if (signal.action === 'SELL' && signalStrength.bearish > 0.6) {
            enhancedReasoning.push(`Strong bearish indicator alignment (${(signalStrength.bearish * 100).toFixed(0)}%)`)
        }

        return {
            ...signal,
            confidence: enhancedConfidence,
            reasoning: enhancedReasoning
        }
    }

    /**
     * Calculate price targets from support/resistance levels
     */
    private static calculatePriceTargetsFromLevels(
        levels: SupportResistanceLevel[],
        action: 'BUY' | 'SELL' | 'HOLD',
        confidence: number
    ): PriceTarget[] {
        const targets: PriceTarget[] = []

        if (action === 'HOLD') return targets

        // Filter levels based on action
        const relevantLevels = levels.filter(level =>
            (action === 'BUY' && level.type === 'RESISTANCE') ||
            (action === 'SELL' && level.type === 'SUPPORT')
        ).sort((a, b) => b.strength - a.strength) // Sort by strength

        // Generate up to 3 targets
        for (let i = 0; i < Math.min(3, relevantLevels.length); i++) {
            const level = relevantLevels[i]
            const targetConfidence = confidence * level.strength * (1 - i * 0.15) // Reduce confidence for further targets

            targets.push({
                level: level.level,
                type: 'TARGET',
                confidence: Math.max(0.3, targetConfidence),
                reasoning: `${level.type.toLowerCase()} level with ${level.touches} touches (strength: ${(level.strength * 100).toFixed(0)}%)`
            })
        }

        return targets
    }

    /**
     * Calculate stop loss based on support/resistance levels
     */
    private static calculateStopLoss(
        levels: SupportResistanceLevel[],
        action: 'BUY' | 'SELL' | 'HOLD',
        multiplier: number = 1.0
    ): number {
        if (action === 'HOLD') return 0

        // Find the strongest level that would act as stop loss
        const stopLossLevels = levels.filter(level =>
            (action === 'BUY' && level.type === 'SUPPORT') ||
            (action === 'SELL' && level.type === 'RESISTANCE')
        ).sort((a, b) => b.strength - a.strength)

        if (stopLossLevels.length > 0) {
            const baseLevel = stopLossLevels[0].level

            // Add buffer based on multiplier
            if (action === 'BUY') {
                return baseLevel * (1 - 0.02 * multiplier) // 2% buffer below support
            } else {
                return baseLevel * (1 + 0.02 * multiplier) // 2% buffer above resistance
            }
        }

        return 0 // No clear stop loss level identified
    }

    /**
     * Combine multiple signals and remove conflicts
     */
    static consolidateSignals(signals: TradingSignal[]): TradingSignal[] {
        if (signals.length <= 1) return signals

        // Group signals by action
        const buySignals = signals.filter(s => s.action === 'BUY')
        const sellSignals = signals.filter(s => s.action === 'SELL')
        const holdSignals = signals.filter(s => s.action === 'HOLD')

        const consolidatedSignals: TradingSignal[] = []

        // Consolidate buy signals
        if (buySignals.length > 0) {
            const bestBuy = buySignals.reduce((best, current) =>
                current.confidence > best.confidence ? current : best
            )
            consolidatedSignals.push(this.mergeSimilarSignals(buySignals, bestBuy))
        }

        // Consolidate sell signals
        if (sellSignals.length > 0) {
            const bestSell = sellSignals.reduce((best, current) =>
                current.confidence > best.confidence ? current : best
            )
            consolidatedSignals.push(this.mergeSimilarSignals(sellSignals, bestSell))
        }

        // Add hold signal if no strong directional signals
        if (consolidatedSignals.length === 0 && holdSignals.length > 0) {
            consolidatedSignals.push(holdSignals[0])
        }

        return consolidatedSignals.sort((a, b) => b.confidence - a.confidence)
    }

    /**
     * Merge similar signals into one comprehensive signal
     */
    private static mergeSimilarSignals(signals: TradingSignal[], baseSignal: TradingSignal): TradingSignal {
        if (signals.length === 1) return baseSignal

        // Combine reasoning from all signals
        const allReasoning = signals.flatMap(s => s.reasoning)
        const uniqueReasoning = [...new Set(allReasoning)]

        // Combine price targets
        const allTargets = signals.flatMap(s => s.priceTargets)
        const uniqueTargets = this.deduplicateTargets(allTargets)

        // Calculate weighted average confidence
        const totalWeight = signals.reduce((sum, s) => sum + s.confidence, 0)
        const weightedConfidence = totalWeight / signals.length

        // Use the most conservative risk level
        const riskLevels = signals.map(s => s.riskLevel)
        const riskLevel = riskLevels.includes('HIGH') ? 'HIGH' :
            riskLevels.includes('MEDIUM') ? 'MEDIUM' : 'LOW'

        return {
            ...baseSignal,
            confidence: Math.min(0.95, weightedConfidence),
            reasoning: uniqueReasoning.slice(0, 8), // Limit to 8 reasons
            priceTargets: uniqueTargets.slice(0, 3), // Limit to 3 targets
            riskLevel
        }
    }

    /**
     * Remove duplicate price targets
     */
    private static deduplicateTargets(targets: PriceTarget[]): PriceTarget[] {
        const uniqueTargets: PriceTarget[] = []
        const tolerance = 0.01 // 1% tolerance for considering targets as duplicates

        for (const target of targets) {
            const isDuplicate = uniqueTargets.some(existing =>
                Math.abs(existing.level - target.level) / existing.level < tolerance
            )

            if (!isDuplicate) {
                uniqueTargets.push(target)
            } else {
                // If duplicate, keep the one with higher confidence
                const existingIndex = uniqueTargets.findIndex(existing =>
                    Math.abs(existing.level - target.level) / existing.level < tolerance
                )

                if (existingIndex !== -1 && target.confidence > uniqueTargets[existingIndex].confidence) {
                    uniqueTargets[existingIndex] = target
                }
            }
        }

        return uniqueTargets.sort((a, b) => b.confidence - a.confidence)
    }
}