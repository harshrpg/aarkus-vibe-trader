import { OHLCV, SupportResistanceLevel } from '../types/trading'

/**
 * Support and Resistance Level Detection Module
 * Implements pivot point calculation and dynamic level detection
 */

export class SupportResistanceDetector {
    /**
     * Calculate traditional pivot points (daily, weekly, monthly)
     */
    static calculatePivotPoints(
        high: number,
        low: number,
        close: number,
        type: 'daily' | 'weekly' | 'monthly' = 'daily'
    ): {
        pivot: number
        r1: number
        r2: number
        r3: number
        s1: number
        s2: number
        s3: number
    } {
        const pivot = (high + low + close) / 3

        // Standard pivot point calculations
        const r1 = (2 * pivot) - low
        const s1 = (2 * pivot) - high
        const r2 = pivot + (high - low)
        const s2 = pivot - (high - low)
        const r3 = high + 2 * (pivot - low)
        const s3 = low - 2 * (high - pivot)

        return { pivot, r1, r2, r3, s1, s2, s3 }
    }

    /**
     * Detect dynamic support and resistance levels based on price action
     */
    static detectDynamicLevels(data: OHLCV[], lookbackPeriod: number = 50): SupportResistanceLevel[] {
        const levels: SupportResistanceLevel[] = []

        if (data.length < lookbackPeriod) return levels

        // Find significant highs and lows
        const significantLevels = this.findSignificantLevels(data, lookbackPeriod)

        // Group nearby levels and calculate strength
        const groupedLevels = this.groupNearbyLevels(significantLevels, data)

        // Convert to SupportResistanceLevel format
        for (const group of groupedLevels) {
            const level = this.calculateLevelStrength(group, data)
            if (level.strength > 0.3) { // Only include levels with decent strength
                levels.push(level)
            }
        }

        // Sort by strength (strongest first)
        return levels.sort((a, b) => b.strength - a.strength)
    }

    /**
     * Find significant price levels (highs and lows)
     */
    private static findSignificantLevels(
        data: OHLCV[],
        lookbackPeriod: number
    ): Array<{ price: number, type: 'SUPPORT' | 'RESISTANCE', index: number, volume: number }> {
        const levels: Array<{ price: number, type: 'SUPPORT' | 'RESISTANCE', index: number, volume: number }> = []
        const recentData = data.slice(-lookbackPeriod)

        // Find local highs (resistance levels)
        for (let i = 2; i < recentData.length - 2; i++) {
            const current = recentData[i]
            const isLocalHigh =
                current.high > recentData[i - 1].high &&
                current.high > recentData[i - 2].high &&
                current.high > recentData[i + 1].high &&
                current.high > recentData[i + 2].high

            if (isLocalHigh) {
                levels.push({
                    price: current.high,
                    type: 'RESISTANCE',
                    index: data.length - lookbackPeriod + i,
                    volume: current.volume
                })
            }
        }

        // Find local lows (support levels)
        for (let i = 2; i < recentData.length - 2; i++) {
            const current = recentData[i]
            const isLocalLow =
                current.low < recentData[i - 1].low &&
                current.low < recentData[i - 2].low &&
                current.low < recentData[i + 1].low &&
                current.low < recentData[i + 2].low

            if (isLocalLow) {
                levels.push({
                    price: current.low,
                    type: 'SUPPORT',
                    index: data.length - lookbackPeriod + i,
                    volume: current.volume
                })
            }
        }

        return levels
    }

    /**
     * Group nearby levels together (within 1% of each other)
     */
    private static groupNearbyLevels(
        levels: Array<{ price: number, type: 'SUPPORT' | 'RESISTANCE', index: number, volume: number }>,
        data: OHLCV[]
    ): Array<Array<{ price: number, type: 'SUPPORT' | 'RESISTANCE', index: number, volume: number }>> {
        const groups: Array<Array<{ price: number, type: 'SUPPORT' | 'RESISTANCE', index: number, volume: number }>> = []
        const tolerance = 0.01 // 1% tolerance for grouping

        const sortedLevels = [...levels].sort((a, b) => a.price - b.price)

        for (const level of sortedLevels) {
            let addedToGroup = false

            // Try to add to existing group
            for (const group of groups) {
                const groupAverage = group.reduce((sum, l) => sum + l.price, 0) / group.length
                const priceDiff = Math.abs(level.price - groupAverage) / groupAverage

                if (priceDiff <= tolerance && group[0].type === level.type) {
                    group.push(level)
                    addedToGroup = true
                    break
                }
            }

            // Create new group if not added to existing one
            if (!addedToGroup) {
                groups.push([level])
            }
        }

        return groups
    }

    /**
     * Calculate strength of a support/resistance level
     */
    private static calculateLevelStrength(
        group: Array<{ price: number, type: 'SUPPORT' | 'RESISTANCE', index: number, volume: number }>,
        data: OHLCV[]
    ): SupportResistanceLevel {
        const averagePrice = group.reduce((sum, l) => sum + l.price, 0) / group.length
        const totalVolume = group.reduce((sum, l) => sum + l.volume, 0)
        const touches = group.length
        const type = group[0].type

        // Calculate how many times price has tested this level
        const testCount = this.countLevelTests(averagePrice, data, type)

        // Calculate recency factor (more recent levels are stronger)
        const latestIndex = Math.max(...group.map(l => l.index))
        const recencyFactor = Math.max(0.1, 1 - (data.length - latestIndex) / data.length)

        // Calculate volume factor (higher volume = stronger level)
        const averageVolume = data.reduce((sum, d) => sum + d.volume, 0) / data.length
        const volumeFactor = Math.min(2, totalVolume / (averageVolume * touches))

        // Calculate overall strength (0-1 scale)
        let strength = (touches * 0.3) + (testCount * 0.4) + (recencyFactor * 0.2) + (volumeFactor * 0.1)
        strength = Math.min(1, strength / 3) // Normalize to 0-1

        // Calculate confidence based on multiple factors
        const confidence = Math.min(1, (touches / 5) + (testCount / 10) + recencyFactor)

        return {
            level: averagePrice,
            type,
            strength,
            touches: testCount,
            volume: totalVolume,
            confidence
        }
    }

    /**
     * Count how many times price has tested a specific level
     */
    private static countLevelTests(
        level: number,
        data: OHLCV[],
        type: 'SUPPORT' | 'RESISTANCE',
        tolerance: number = 0.005 // 0.5% tolerance
    ): number {
        let testCount = 0

        for (const candle of data) {
            const testPrice = type === 'SUPPORT' ? candle.low : candle.high
            const priceDiff = Math.abs(testPrice - level) / level

            if (priceDiff <= tolerance) {
                testCount++
            }
        }

        return testCount
    }

    /**
     * Identify key psychological levels (round numbers)
     */
    static identifyPsychologicalLevels(
        currentPrice: number,
        range: number = 0.2
    ): SupportResistanceLevel[] {
        const levels: SupportResistanceLevel[] = []

        // Determine the appropriate round number intervals based on price
        let interval: number
        if (currentPrice < 1) {
            interval = 0.1
        } else if (currentPrice < 10) {
            interval = 1
        } else if (currentPrice < 100) {
            interval = 5
        } else if (currentPrice < 1000) {
            interval = 10
        } else {
            interval = 50
        }

        // Find round numbers within range
        const minPrice = currentPrice * (1 - range)
        const maxPrice = currentPrice * (1 + range)

        let roundLevel = Math.floor(minPrice / interval) * interval

        while (roundLevel <= maxPrice) {
            if (roundLevel > 0) {
                const distance = Math.abs(roundLevel - currentPrice) / currentPrice
                const strength = Math.max(0.2, 1 - (distance * 5)) // Closer levels are stronger

                const type: 'SUPPORT' | 'RESISTANCE' = roundLevel < currentPrice ? 'SUPPORT' : 'RESISTANCE'

                levels.push({
                    level: roundLevel,
                    type,
                    strength,
                    touches: 1, // Psychological levels always have at least conceptual "touch"
                    volume: 0, // No specific volume for psychological levels
                    confidence: 0.6 // Moderate confidence for psychological levels
                })
            }

            roundLevel += interval
        }

        return levels
    }

    /**
     * Calculate Fibonacci retracement levels
     */
    static calculateFibonacciLevels(
        swingHigh: number,
        swingLow: number,
        type: 'retracement' | 'extension' = 'retracement'
    ): SupportResistanceLevel[] {
        const levels: SupportResistanceLevel[] = []
        const range = swingHigh - swingLow

        const fibRatios = type === 'retracement'
            ? [0.236, 0.382, 0.5, 0.618, 0.786]
            : [1.272, 1.414, 1.618, 2.0, 2.618]

        for (const ratio of fibRatios) {
            let level: number
            let levelType: 'SUPPORT' | 'RESISTANCE'

            if (type === 'retracement') {
                level = swingHigh - (range * ratio)
                levelType = 'SUPPORT'
            } else {
                level = swingHigh + (range * ratio)
                levelType = 'RESISTANCE'
            }

            // Fibonacci levels have varying strength based on the ratio
            let strength: number
            if (ratio === 0.382 || ratio === 0.618 || ratio === 1.618) {
                strength = 0.8 // Golden ratio levels are strongest
            } else if (ratio === 0.5 || ratio === 1.272) {
                strength = 0.7 // 50% and 127.2% are also strong
            } else {
                strength = 0.6 // Other levels are moderately strong
            }

            levels.push({
                level,
                type: levelType,
                strength,
                touches: 1,
                volume: 0,
                confidence: 0.7
            })
        }

        return levels
    }

    /**
     * Detect volume-based support and resistance levels
     */
    static detectVolumeBasedLevels(data: OHLCV[], volumeThreshold: number = 1.5): SupportResistanceLevel[] {
        const levels: SupportResistanceLevel[] = []

        // Find periods with high volume (above threshold * average volume)
        const averageVolume = data.reduce((sum, d) => sum + d.volume, 0) / data.length
        const highVolumeCandles = data.filter(d => d.volume > averageVolume * volumeThreshold)

        // Group high volume candles by price level
        const priceGroups: Map<number, OHLCV[]> = new Map()
        const tolerance = 0.01 // 1% price tolerance

        for (const candle of highVolumeCandles) {
            const priceLevel = Math.round(candle.close / (candle.close * tolerance)) * (candle.close * tolerance)

            if (!priceGroups.has(priceLevel)) {
                priceGroups.set(priceLevel, [])
            }
            priceGroups.get(priceLevel)!.push(candle)
        }

        // Convert groups to support/resistance levels
        for (const [priceLevel, candles] of priceGroups) {
            if (candles.length >= 2) { // Need at least 2 high volume touches
                const totalVolume = candles.reduce((sum, c) => sum + c.volume, 0)
                const strength = Math.min(1, (totalVolume / averageVolume) / 10)

                // Determine if it's support or resistance based on recent price action
                const currentPrice = data[data.length - 1].close
                const type: 'SUPPORT' | 'RESISTANCE' = priceLevel < currentPrice ? 'SUPPORT' : 'RESISTANCE'

                levels.push({
                    level: priceLevel,
                    type,
                    strength,
                    touches: candles.length,
                    volume: totalVolume,
                    confidence: Math.min(1, candles.length / 5)
                })
            }
        }

        return levels.sort((a, b) => b.strength - a.strength)
    }

    /**
     * Combine all level detection methods for comprehensive analysis
     */
    static detectAllLevels(data: OHLCV[], options?: {
        includePivots?: boolean
        includePsychological?: boolean
        includeFibonacci?: boolean
        includeVolume?: boolean
        swingHigh?: number
        swingLow?: number
    }): SupportResistanceLevel[] {
        const allLevels: SupportResistanceLevel[] = []
        const opts = {
            includePivots: true,
            includePsychological: true,
            includeFibonacci: false,
            includeVolume: true,
            ...options
        }

        // Dynamic levels from price action
        const dynamicLevels = this.detectDynamicLevels(data)
        allLevels.push(...dynamicLevels)

        // Pivot points
        if (opts.includePivots && data.length > 0) {
            const lastCandle = data[data.length - 1]
            const pivots = this.calculatePivotPoints(lastCandle.high, lastCandle.low, lastCandle.close)

            const pivotLevels: SupportResistanceLevel[] = [
                { level: pivots.pivot, type: 'SUPPORT', strength: 0.7, touches: 1, volume: 0, confidence: 0.7 },
                { level: pivots.r1, type: 'RESISTANCE', strength: 0.6, touches: 1, volume: 0, confidence: 0.6 },
                { level: pivots.r2, type: 'RESISTANCE', strength: 0.5, touches: 1, volume: 0, confidence: 0.5 },
                { level: pivots.s1, type: 'SUPPORT', strength: 0.6, touches: 1, volume: 0, confidence: 0.6 },
                { level: pivots.s2, type: 'SUPPORT', strength: 0.5, touches: 1, volume: 0, confidence: 0.5 }
            ]

            allLevels.push(...pivotLevels)
        }

        // Psychological levels
        if (opts.includePsychological && data.length > 0) {
            const currentPrice = data[data.length - 1].close
            const psychLevels = this.identifyPsychologicalLevels(currentPrice)
            allLevels.push(...psychLevels)
        }

        // Fibonacci levels
        if (opts.includeFibonacci && opts.swingHigh && opts.swingLow) {
            const fibLevels = this.calculateFibonacciLevels(opts.swingHigh, opts.swingLow)
            allLevels.push(...fibLevels)
        }

        // Volume-based levels
        if (opts.includeVolume) {
            const volumeLevels = this.detectVolumeBasedLevels(data)
            allLevels.push(...volumeLevels)
        }

        // Remove duplicates and sort by strength
        const uniqueLevels = this.removeDuplicateLevels(allLevels)
        return uniqueLevels.sort((a, b) => b.strength - a.strength).slice(0, 20) // Top 20 levels
    }

    /**
     * Remove duplicate levels that are too close to each other
     */
    private static removeDuplicateLevels(levels: SupportResistanceLevel[]): SupportResistanceLevel[] {
        const uniqueLevels: SupportResistanceLevel[] = []
        const tolerance = 0.005 // 0.5% tolerance

        for (const level of levels) {
            const isDuplicate = uniqueLevels.some(existing => {
                const priceDiff = Math.abs(existing.level - level.level) / existing.level
                return priceDiff <= tolerance && existing.type === level.type
            })

            if (!isDuplicate) {
                uniqueLevels.push(level)
            } else {
                // If duplicate, keep the one with higher strength
                const existingIndex = uniqueLevels.findIndex(existing => {
                    const priceDiff = Math.abs(existing.level - level.level) / existing.level
                    return priceDiff <= tolerance && existing.type === level.type
                })

                if (existingIndex !== -1 && level.strength > uniqueLevels[existingIndex].strength) {
                    uniqueLevels[existingIndex] = level
                }
            }
        }

        return uniqueLevels
    }
}