import { OHLCV, IndicatorResult } from '../types/trading'

/**
 * Core Technical Indicators Calculation Module
 * Implements RSI, MACD, Moving Averages, Bollinger Bands and other common indicators
 */

export class TechnicalIndicators {
    /**
     * Calculate Simple Moving Average (SMA)
     */
    static calculateSMA(prices: number[], period: number): number[] {
        const sma: number[] = []

        for (let i = period - 1; i < prices.length; i++) {
            const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
            sma.push(sum / period)
        }

        return sma
    }

    /**
     * Calculate Exponential Moving Average (EMA)
     */
    static calculateEMA(prices: number[], period: number): number[] {
        const ema: number[] = []
        const multiplier = 2 / (period + 1)

        // Start with SMA for first value
        const sma = prices.slice(0, period).reduce((a, b) => a + b, 0) / period
        ema.push(sma)

        for (let i = period; i < prices.length; i++) {
            const currentEma = (prices[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier))
            ema.push(currentEma)
        }

        return ema
    }

    /**
     * Calculate Relative Strength Index (RSI)
     */
    static calculateRSI(prices: number[], period: number = 14): IndicatorResult {
        const changes: number[] = []
        const gains: number[] = []
        const losses: number[] = []

        // Calculate price changes
        for (let i = 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1]
            changes.push(change)
            gains.push(change > 0 ? change : 0)
            losses.push(change < 0 ? Math.abs(change) : 0)
        }

        const rsiValues: number[] = []

        // Calculate initial average gain and loss
        let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period
        let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period

        for (let i = period; i < changes.length; i++) {
            // Smoothed averages
            avgGain = ((avgGain * (period - 1)) + gains[i]) / period
            avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period

            const rs = avgGain / avgLoss
            const rsi = 100 - (100 / (1 + rs))
            rsiValues.push(rsi)
        }

        const currentRSI = rsiValues[rsiValues.length - 1]
        let signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL'
        let interpretation = 'RSI is in neutral territory'

        if (currentRSI > 70) {
            signal = 'BEARISH'
            interpretation = 'RSI indicates overbought conditions, potential sell signal'
        } else if (currentRSI < 30) {
            signal = 'BULLISH'
            interpretation = 'RSI indicates oversold conditions, potential buy signal'
        }

        return {
            name: 'RSI',
            values: rsiValues,
            parameters: { period },
            interpretation,
            signal
        }
    }

    /**
     * Calculate MACD (Moving Average Convergence Divergence)
     */
    static calculateMACD(
        prices: number[],
        fastPeriod: number = 12,
        slowPeriod: number = 26,
        signalPeriod: number = 9
    ): IndicatorResult {
        const fastEMA = this.calculateEMA(prices, fastPeriod)
        const slowEMA = this.calculateEMA(prices, slowPeriod)

        // MACD line = Fast EMA - Slow EMA
        const macdLine: number[] = []
        const startIndex = slowPeriod - fastPeriod

        for (let i = 0; i < fastEMA.length - startIndex; i++) {
            macdLine.push(fastEMA[i + startIndex] - slowEMA[i])
        }

        // Signal line = EMA of MACD line
        const signalLine = this.calculateEMA(macdLine, signalPeriod)

        // Histogram = MACD - Signal
        const histogram: number[] = []
        const histogramStartIndex = macdLine.length - signalLine.length

        for (let i = 0; i < signalLine.length; i++) {
            histogram.push(macdLine[i + histogramStartIndex] - signalLine[i])
        }

        const currentMACD = macdLine[macdLine.length - 1]
        const currentSignal = signalLine[signalLine.length - 1]
        const currentHistogram = histogram[histogram.length - 1]

        let signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL'
        let interpretation = 'MACD shows neutral momentum'

        if (currentMACD > currentSignal && currentHistogram > 0) {
            signal = 'BULLISH'
            interpretation = 'MACD bullish crossover, upward momentum'
        } else if (currentMACD < currentSignal && currentHistogram < 0) {
            signal = 'BEARISH'
            interpretation = 'MACD bearish crossover, downward momentum'
        }

        return {
            name: 'MACD',
            values: [...macdLine, ...signalLine, ...histogram],
            parameters: { fastPeriod, slowPeriod, signalPeriod },
            interpretation,
            signal
        }
    }

    /**
     * Calculate Bollinger Bands
     */
    static calculateBollingerBands(
        prices: number[],
        period: number = 20,
        standardDeviations: number = 2
    ): IndicatorResult {
        const sma = this.calculateSMA(prices, period)
        const upperBand: number[] = []
        const lowerBand: number[] = []

        for (let i = period - 1; i < prices.length; i++) {
            const slice = prices.slice(i - period + 1, i + 1)
            const mean = slice.reduce((a, b) => a + b, 0) / period
            const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period
            const stdDev = Math.sqrt(variance)

            upperBand.push(sma[i - period + 1] + (standardDeviations * stdDev))
            lowerBand.push(sma[i - period + 1] - (standardDeviations * stdDev))
        }

        const currentPrice = prices[prices.length - 1]
        const currentUpper = upperBand[upperBand.length - 1]
        const currentLower = lowerBand[lowerBand.length - 1]
        const currentMiddle = sma[sma.length - 1]

        let signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL'
        let interpretation = 'Price is within normal Bollinger Band range'

        if (currentPrice > currentUpper) {
            signal = 'BEARISH'
            interpretation = 'Price above upper Bollinger Band, potentially overbought'
        } else if (currentPrice < currentLower) {
            signal = 'BULLISH'
            interpretation = 'Price below lower Bollinger Band, potentially oversold'
        } else if (currentPrice > currentMiddle) {
            interpretation = 'Price above middle band, bullish bias'
        } else {
            interpretation = 'Price below middle band, bearish bias'
        }

        return {
            name: 'Bollinger Bands',
            values: [...sma, ...upperBand, ...lowerBand],
            parameters: { period, standardDeviations },
            interpretation,
            signal
        }
    }

    /**
     * Calculate Stochastic Oscillator
     */
    static calculateStochastic(
        highs: number[],
        lows: number[],
        closes: number[],
        kPeriod: number = 14,
        dPeriod: number = 3
    ): IndicatorResult {
        const kValues: number[] = []

        for (let i = kPeriod - 1; i < closes.length; i++) {
            const highestHigh = Math.max(...highs.slice(i - kPeriod + 1, i + 1))
            const lowestLow = Math.min(...lows.slice(i - kPeriod + 1, i + 1))
            const currentClose = closes[i]

            const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100
            kValues.push(k)
        }

        const dValues = this.calculateSMA(kValues, dPeriod)

        const currentK = kValues[kValues.length - 1]
        const currentD = dValues[dValues.length - 1]

        let signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL'
        let interpretation = 'Stochastic in neutral territory'

        if (currentK > 80 && currentD > 80) {
            signal = 'BEARISH'
            interpretation = 'Stochastic overbought, potential sell signal'
        } else if (currentK < 20 && currentD < 20) {
            signal = 'BULLISH'
            interpretation = 'Stochastic oversold, potential buy signal'
        } else if (currentK > currentD) {
            interpretation = 'Stochastic %K above %D, bullish momentum'
        } else {
            interpretation = 'Stochastic %K below %D, bearish momentum'
        }

        return {
            name: 'Stochastic',
            values: [...kValues, ...dValues],
            parameters: { kPeriod, dPeriod },
            interpretation,
            signal
        }
    }

    /**
     * Calculate Average True Range (ATR)
     */
    static calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number[] {
        const trueRanges: number[] = []

        for (let i = 1; i < highs.length; i++) {
            const tr1 = highs[i] - lows[i]
            const tr2 = Math.abs(highs[i] - closes[i - 1])
            const tr3 = Math.abs(lows[i] - closes[i - 1])

            trueRanges.push(Math.max(tr1, tr2, tr3))
        }

        return this.calculateSMA(trueRanges, period)
    }

    /**
     * Optimize indicator parameters based on timeframe and market conditions
     */
    static optimizeParameters(timeframe: string, volatility: number): Record<string, any> {
        const baseParams = {
            rsi: { period: 14 },
            macd: { fast: 12, slow: 26, signal: 9 },
            bollinger: { period: 20, stdDev: 2 },
            stochastic: { k: 14, d: 3 }
        }

        // Adjust parameters based on timeframe
        switch (timeframe) {
            case '1m':
            case '5m':
                // Shorter periods for intraday
                baseParams.rsi.period = 9
                baseParams.macd = { fast: 8, slow: 17, signal: 6 }
                baseParams.bollinger.period = 15
                break
            case '1h':
            case '4h':
                // Standard parameters work well
                break
            case '1d':
            case '1w':
                // Longer periods for longer timeframes
                baseParams.rsi.period = 21
                baseParams.macd = { fast: 19, slow: 39, signal: 14 }
                baseParams.bollinger.period = 30
                break
        }

        // Adjust for volatility
        if (volatility > 0.8) {
            // High volatility - use wider bands
            baseParams.bollinger.stdDev = 2.5
        } else if (volatility < 0.3) {
            // Low volatility - use tighter bands
            baseParams.bollinger.stdDev = 1.5
        }

        return baseParams
    }
}