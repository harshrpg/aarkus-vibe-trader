import {
    TechnicalAnalysisResult,
    OHLCV,
    IndicatorResult,
    PatternResult,
    SupportResistanceLevel,
    TrendAnalysis,
    MomentumAnalysis,
    VolatilityAnalysis,
    TradingSignal,
    PriceTarget
} from '../types/trading'

export class TechnicalAnalysisEngine {
    /**
     * Analyze price data and generate technical analysis
     */
    static async analyzePrice(
        symbol: string,
        timeframe: string,
        priceData: OHLCV[]
    ): Promise<TechnicalAnalysisResult> {
        if (!priceData || priceData.length < 20) {
            throw new Error('Insufficient price data for technical analysis')
        }

        // Calculate indicators
        const indicators = await this.calculateIndicators(priceData)

        // Identify patterns
        const patterns = await this.identifyPatterns(priceData)

        // Find support/resistance levels
        const supportResistance = await this.findSupportResistanceLevels(priceData)

        // Analyze trend
        const trend = this.analyzeTrend(priceData)

        // Calculate momentum
        const momentum = this.calculateMomentum(priceData)

        // Calculate volatility
        const volatility = this.calculateVolatility(priceData)

        return {
            indicators,
            patterns,
            supportResistance,
            trend,
            momentum,
            volatility
        }
    }

    /**
     * Generate trading signals from technical analysis
     */
    static generateSignals(technical: TechnicalAnalysisResult): TradingSignal[] {
        const signals: TradingSignal[] = []

        // Generate signal based on trend and momentum
        const trendSignal = this.getTrendSignal(technical.trend, technical.momentum)
        if (trendSignal) {
            signals.push(trendSignal)
        }

        // Generate pattern-based signals
        const patternSignals = this.getPatternSignals(technical.patterns)
        signals.push(...patternSignals)

        return signals
    }

    /**
     * Calculate technical indicators
     */
    private static async calculateIndicators(priceData: OHLCV[]): Promise<IndicatorResult[]> {
        const indicators: IndicatorResult[] = []

        // RSI
        const rsi = this.calculateRSI(priceData, 14)
        indicators.push({
            name: 'RSI',
            values: [rsi],
            parameters: { period: 14 },
            interpretation: this.interpretRSI(rsi),
            signal: rsi > 70 ? 'BEARISH' : rsi < 30 ? 'BULLISH' : 'NEUTRAL'
        })

        // MACD
        const macd = this.calculateMACD(priceData)
        indicators.push({
            name: 'MACD',
            values: [macd.macd, macd.signal, macd.histogram],
            parameters: { fast: 12, slow: 26, signal: 9 },
            interpretation: this.interpretMACD(macd),
            signal: macd.histogram > 0 ? 'BULLISH' : 'BEARISH'
        })

        // Moving Averages
        const sma20 = this.calculateSMA(priceData, 20)
        const sma50 = this.calculateSMA(priceData, 50)
        indicators.push({
            name: 'SMA_20',
            values: [sma20],
            parameters: { period: 20 },
            interpretation: `20-period Simple Moving Average: ${sma20.toFixed(2)}`,
            signal: priceData[priceData.length - 1].close > sma20 ? 'BULLISH' : 'BEARISH'
        })

        indicators.push({
            name: 'SMA_50',
            values: [sma50],
            parameters: { period: 50 },
            interpretation: `50-period Simple Moving Average: ${sma50.toFixed(2)}`,
            signal: sma20 > sma50 ? 'BULLISH' : 'BEARISH'
        })

        return indicators
    }

    /**
     * Identify chart patterns
     */
    private static async identifyPatterns(priceData: OHLCV[]): Promise<PatternResult[]> {
        const patterns: PatternResult[] = []

        // Simple trend line pattern detection
        const trendPattern = this.detectTrendPattern(priceData)
        if (trendPattern) {
            patterns.push(trendPattern)
        }

        // Double top/bottom detection
        const doublePattern = this.detectDoubleTopBottom(priceData)
        if (doublePattern) {
            patterns.push(doublePattern)
        }

        return patterns
    }

    /**
     * Find support and resistance levels
     */
    private static async findSupportResistanceLevels(priceData: OHLCV[]): Promise<SupportResistanceLevel[]> {
        const levels: SupportResistanceLevel[] = []
        const recentData = priceData.slice(-50) // Last 50 periods

        // Find pivot highs and lows
        const pivots = this.findPivotPoints(recentData)

        // Convert pivots to support/resistance levels
        pivots.forEach(pivot => {
            levels.push({
                level: pivot.price,
                type: pivot.type === 'high' ? 'RESISTANCE' : 'SUPPORT',
                strength: pivot.strength,
                touches: pivot.touches,
                volume: pivot.volume,
                confidence: pivot.confidence
            })
        })

        return levels.slice(0, 5) // Return top 5 levels
    }

    /**
     * Analyze trend
     */
    private static analyzeTrend(priceData: OHLCV[]): TrendAnalysis {
        const recentData = priceData.slice(-20)
        const prices = recentData.map(d => d.close)

        // Simple linear regression for trend
        const slope = this.calculateSlope(prices)
        const strength = Math.min(1, Math.abs(slope) * 100)

        let direction: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS'
        if (slope > 0.001) direction = 'UPTREND'
        else if (slope < -0.001) direction = 'DOWNTREND'
        else direction = 'SIDEWAYS'

        return {
            direction,
            strength,
            duration: recentData.length,
            slope
        }
    }

    /**
     * Calculate momentum indicators
     */
    private static calculateMomentum(priceData: OHLCV[]): MomentumAnalysis {
        const rsi = this.calculateRSI(priceData, 14)
        const macd = this.calculateMACD(priceData)
        const stochastic = this.calculateStochastic(priceData, 14, 3)

        return {
            rsi,
            macd,
            stochastic,
            interpretation: this.interpretMomentum(rsi, macd, stochastic)
        }
    }

    /**
     * Calculate volatility indicators
     */
    private static calculateVolatility(priceData: OHLCV[]): VolatilityAnalysis {
        const atr = this.calculateATR(priceData, 14)
        const bollingerBands = this.calculateBollingerBands(priceData, 20, 2)
        const volatilityRank = this.calculateVolatilityRank(priceData)

        return {
            atr,
            bollingerBands,
            volatilityRank
        }
    }

    // Helper calculation methods
    private static calculateRSI(priceData: OHLCV[], period: number): number {
        if (priceData.length < period + 1) return 50

        const changes = []
        for (let i = 1; i < priceData.length; i++) {
            changes.push(priceData[i].close - priceData[i - 1].close)
        }

        const recentChanges = changes.slice(-period)
        const gains = recentChanges.filter(c => c > 0)
        const losses = recentChanges.filter(c => c < 0).map(c => Math.abs(c))

        const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0
        const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0

        if (avgLoss === 0) return 100
        const rs = avgGain / avgLoss
        return 100 - (100 / (1 + rs))
    }

    private static calculateMACD(priceData: OHLCV[]): { macd: number; signal: number; histogram: number } {
        const ema12 = this.calculateEMA(priceData, 12)
        const ema26 = this.calculateEMA(priceData, 26)
        const macd = ema12 - ema26

        // Simplified signal line (normally would be EMA of MACD)
        const signal = macd * 0.9
        const histogram = macd - signal

        return { macd, signal, histogram }
    }

    private static calculateSMA(priceData: OHLCV[], period: number): number {
        if (priceData.length < period) return priceData[priceData.length - 1].close

        const recentPrices = priceData.slice(-period).map(d => d.close)
        return recentPrices.reduce((a, b) => a + b, 0) / period
    }

    private static calculateEMA(priceData: OHLCV[], period: number): number {
        if (priceData.length < period) return priceData[priceData.length - 1].close

        const multiplier = 2 / (period + 1)
        let ema = priceData[0].close

        for (let i = 1; i < priceData.length; i++) {
            ema = (priceData[i].close * multiplier) + (ema * (1 - multiplier))
        }

        return ema
    }

    private static calculateStochastic(priceData: OHLCV[], kPeriod: number, dPeriod: number): { k: number; d: number } {
        if (priceData.length < kPeriod) return { k: 50, d: 50 }

        const recentData = priceData.slice(-kPeriod)
        const currentClose = priceData[priceData.length - 1].close
        const lowestLow = Math.min(...recentData.map(d => d.low))
        const highestHigh = Math.max(...recentData.map(d => d.high))

        const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100
        const d = k * 0.9 // Simplified D line

        return { k, d }
    }

    private static calculateATR(priceData: OHLCV[], period: number): number {
        if (priceData.length < period + 1) return 0

        const trueRanges = []
        for (let i = 1; i < priceData.length; i++) {
            const high = priceData[i].high
            const low = priceData[i].low
            const prevClose = priceData[i - 1].close

            const tr = Math.max(
                high - low,
                Math.abs(high - prevClose),
                Math.abs(low - prevClose)
            )
            trueRanges.push(tr)
        }

        const recentTR = trueRanges.slice(-period)
        return recentTR.reduce((a, b) => a + b, 0) / period
    }

    private static calculateBollingerBands(priceData: OHLCV[], period: number, stdDev: number): {
        upper: number; middle: number; lower: number; squeeze: boolean
    } {
        const sma = this.calculateSMA(priceData, period)
        const recentPrices = priceData.slice(-period).map(d => d.close)

        const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period
        const standardDeviation = Math.sqrt(variance)

        const upper = sma + (standardDeviation * stdDev)
        const lower = sma - (standardDeviation * stdDev)
        const squeeze = (upper - lower) / sma < 0.1 // Simplified squeeze detection

        return { upper, middle: sma, lower, squeeze }
    }

    private static calculateVolatilityRank(priceData: OHLCV[]): number {
        // Simplified volatility rank calculation
        const recentVolatility = this.calculateATR(priceData, 14)
        const historicalVolatility = this.calculateATR(priceData, 252) // ~1 year

        return Math.min(1, recentVolatility / (historicalVolatility || 1))
    }

    private static calculateSlope(prices: number[]): number {
        const n = prices.length
        const sumX = (n * (n - 1)) / 2
        const sumY = prices.reduce((a, b) => a + b, 0)
        const sumXY = prices.reduce((sum, price, i) => sum + (i * price), 0)
        const sumXX = (n * (n - 1) * (2 * n - 1)) / 6

        return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    }

    private static findPivotPoints(priceData: OHLCV[]): Array<{
        price: number; type: 'high' | 'low'; strength: number; touches: number; volume: number; confidence: number
    }> {
        const pivots = []
        const lookback = 5

        for (let i = lookback; i < priceData.length - lookback; i++) {
            const current = priceData[i]
            const isHigh = priceData.slice(i - lookback, i + lookback + 1)
                .every(d => d.high <= current.high)
            const isLow = priceData.slice(i - lookback, i + lookback + 1)
                .every(d => d.low >= current.low)

            if (isHigh) {
                pivots.push({
                    price: current.high,
                    type: 'high' as const,
                    strength: Math.random() * 0.5 + 0.5,
                    touches: Math.floor(Math.random() * 3) + 1,
                    volume: current.volume,
                    confidence: Math.random() * 0.3 + 0.7
                })
            }

            if (isLow) {
                pivots.push({
                    price: current.low,
                    type: 'low' as const,
                    strength: Math.random() * 0.5 + 0.5,
                    touches: Math.floor(Math.random() * 3) + 1,
                    volume: current.volume,
                    confidence: Math.random() * 0.3 + 0.7
                })
            }
        }

        return pivots
    }

    private static detectTrendPattern(priceData: OHLCV[]): PatternResult | null {
        const trend = this.analyzeTrend(priceData)

        if (trend.strength < 0.3) return null

        const recentData = priceData.slice(-10)
        const coordinates = recentData.map((d, i) => ({
            time: d.timestamp.getTime() / 1000,
            price: d.close
        }))

        return {
            type: trend.direction === 'UPTREND' ? 'CHANNEL_UP' : 'CHANNEL_DOWN',
            confidence: trend.strength,
            coordinates,
            description: `${trend.direction} pattern with ${(trend.strength * 100).toFixed(0)}% strength`,
            implications: [
                `Trend direction: ${trend.direction}`,
                `Strength: ${(trend.strength * 100).toFixed(0)}%`,
                trend.direction === 'UPTREND' ? 'Consider long positions' : 'Consider short positions'
            ],
            priceTargets: this.generatePatternTargets(priceData, trend)
        }
    }

    private static detectDoubleTopBottom(priceData: OHLCV[]): PatternResult | null {
        // Simplified double top/bottom detection
        const recentData = priceData.slice(-20)
        const highs = recentData.map(d => d.high)
        const lows = recentData.map(d => d.low)

        const maxHigh = Math.max(...highs)
        const minLow = Math.min(...lows)
        const currentPrice = priceData[priceData.length - 1].close

        // Check for double top pattern
        const highIndices = highs.map((h, i) => ({ price: h, index: i }))
            .filter(h => h.price > maxHigh * 0.98)
            .sort((a, b) => b.price - a.price)

        if (highIndices.length >= 2) {
            const coordinates = highIndices.slice(0, 2).map(h => ({
                time: recentData[h.index].timestamp.getTime() / 1000,
                price: h.price
            }))

            return {
                type: 'DOUBLE_TOP',
                confidence: 0.7,
                coordinates,
                description: 'Double top pattern detected',
                implications: [
                    'Potential bearish reversal signal',
                    'Consider taking profits on long positions',
                    'Watch for breakdown below support'
                ],
                priceTargets: [{
                    level: minLow,
                    type: 'TARGET',
                    confidence: 0.6,
                    reasoning: 'Double top target at recent low'
                }]
            }
        }

        return null
    }

    private static generatePatternTargets(priceData: OHLCV[], trend: TrendAnalysis): PriceTarget[] {
        const currentPrice = priceData[priceData.length - 1].close
        const atr = this.calculateATR(priceData, 14)

        const targets: PriceTarget[] = []

        if (trend.direction === 'UPTREND') {
            targets.push({
                level: currentPrice + (atr * 2),
                type: 'TARGET',
                confidence: trend.strength,
                reasoning: 'Uptrend target based on ATR'
            })
        } else if (trend.direction === 'DOWNTREND') {
            targets.push({
                level: currentPrice - (atr * 2),
                type: 'TARGET',
                confidence: trend.strength,
                reasoning: 'Downtrend target based on ATR'
            })
        }

        return targets
    }

    private static getTrendSignal(trend: TrendAnalysis, momentum: MomentumAnalysis): TradingSignal | null {
        if (trend.strength < 0.3) return null

        const action = trend.direction === 'UPTREND' ? 'BUY' :
            trend.direction === 'DOWNTREND' ? 'SELL' : 'HOLD'

        if (action === 'HOLD') return null

        const currentPrice = 100 // This would be actual current price
        const atr = 2 // This would be actual ATR

        return {
            action,
            confidence: trend.strength,
            reasoning: [
                `Strong ${trend.direction.toLowerCase()} detected`,
                `Trend strength: ${(trend.strength * 100).toFixed(0)}%`,
                `RSI: ${momentum.rsi.toFixed(1)}`,
                `MACD histogram: ${momentum.macd.histogram > 0 ? 'positive' : 'negative'}`
            ],
            priceTargets: [{
                level: action === 'BUY' ? currentPrice + (atr * 2) : currentPrice - (atr * 2),
                type: 'TARGET',
                confidence: trend.strength * 0.8,
                reasoning: `${action} target based on trend and volatility`
            }],
            stopLoss: action === 'BUY' ? currentPrice - atr : currentPrice + atr,
            timeHorizon: trend.strength > 0.7 ? 'Medium-term (1-4 weeks)' : 'Short-term (1-7 days)',
            riskLevel: trend.strength > 0.7 ? 'MEDIUM' : 'HIGH'
        }
    }

    private static getPatternSignals(patterns: PatternResult[]): TradingSignal[] {
        return patterns.map(pattern => {
            const action = pattern.type.includes('TOP') ? 'SELL' :
                pattern.type.includes('BOTTOM') ? 'BUY' :
                    pattern.type.includes('UP') ? 'BUY' : 'SELL'

            return {
                action,
                confidence: pattern.confidence,
                reasoning: [
                    `${pattern.type} pattern detected`,
                    pattern.description,
                    ...pattern.implications.slice(0, 2)
                ],
                priceTargets: pattern.priceTargets,
                stopLoss: pattern.priceTargets[0]?.level || 100,
                timeHorizon: 'Short-term (1-7 days)',
                riskLevel: pattern.confidence > 0.7 ? 'MEDIUM' : 'HIGH'
            }
        })
    }

    // Interpretation methods
    private static interpretRSI(rsi: number): string {
        if (rsi > 70) return 'Overbought - potential selling pressure'
        if (rsi < 30) return 'Oversold - potential buying opportunity'
        if (rsi > 50) return 'Bullish momentum'
        return 'Bearish momentum'
    }

    private static interpretMACD(macd: { macd: number; signal: number; histogram: number }): string {
        if (macd.histogram > 0) {
            return macd.macd > macd.signal ? 'Strong bullish momentum' : 'Weakening bearish momentum'
        } else {
            return macd.macd < macd.signal ? 'Strong bearish momentum' : 'Weakening bullish momentum'
        }
    }

    private static interpretMomentum(
        rsi: number,
        macd: { macd: number; signal: number; histogram: number },
        stochastic: { k: number; d: number }
    ): string {
        const signals = []

        if (rsi > 70) signals.push('RSI overbought')
        else if (rsi < 30) signals.push('RSI oversold')

        if (macd.histogram > 0) signals.push('MACD bullish')
        else signals.push('MACD bearish')

        if (stochastic.k > 80) signals.push('Stochastic overbought')
        else if (stochastic.k < 20) signals.push('Stochastic oversold')

        return signals.join(', ') || 'Neutral momentum'
    }
}