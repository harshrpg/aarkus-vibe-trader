import {
    OHLCV,
    PriceTarget,
    SupportResistanceLevel,
    PatternResult,
    ChartCoordinate
} from '../types/trading'

/**
 * Price Target Calculation System
 * Implements Fibonacci retracements, extensions, support/resistance targets, and pattern-based calculations
 */
export class PriceTargetCalculator {
    /**
     * Calculate Fibonacci retracement levels
     */
    static calculateFibonacciRetracements(
        swingHigh: number,
        swingLow: number,
        currentPrice: number
    ): PriceTarget[] {
        const targets: PriceTarget[] = []
        const range = swingHigh - swingLow

        // Standard Fibonacci retracement levels
        const fibLevels = [
            { ratio: 0.236, name: '23.6%' },
            { ratio: 0.382, name: '38.2%' },
            { ratio: 0.5, name: '50%' },
            { ratio: 0.618, name: '61.8%' },
            { ratio: 0.786, name: '78.6%' }
        ]

        for (const fib of fibLevels) {
            const level = swingHigh - (range * fib.ratio)

            // Determine if this is a support or resistance level
            const isSupport = level < currentPrice
            const distance = Math.abs(level - currentPrice) / currentPrice

            // Only include levels that are reasonable distance from current price (1-20%)
            if (distance > 0.01 && distance < 0.20) {
                let confidence = 0.6

                // Golden ratio levels (38.2%, 61.8%) have higher confidence
                if (fib.ratio === 0.382 || fib.ratio === 0.618) {
                    confidence = 0.8
                } else if (fib.ratio === 0.5) {
                    confidence = 0.7
                }

                // Closer levels have slightly higher confidence
                confidence += (0.20 - distance) * 0.5

                targets.push({
                    level,
                    type: isSupport ? 'STOP_LOSS' : 'TARGET',
                    confidence: Math.min(0.9, confidence),
                    reasoning: `Fibonacci ${fib.name} retracement level from swing high ${swingHigh.toFixed(2)} to swing low ${swingLow.toFixed(2)}`
                })
            }
        }

        return targets.sort((a, b) => b.confidence - a.confidence)
    }

    /**
     * Calculate Fibonacci extension levels for breakout targets
     */
    static calculateFibonacciExtensions(
        swingHigh: number,
        swingLow: number,
        currentPrice: number,
        direction: 'BULLISH' | 'BEARISH'
    ): PriceTarget[] {
        const targets: PriceTarget[] = []
        const range = Math.abs(swingHigh - swingLow)

        // Standard Fibonacci extension levels
        const fibExtensions = [
            { ratio: 1.272, name: '127.2%' },
            { ratio: 1.414, name: '141.4%' },
            { ratio: 1.618, name: '161.8%' },
            { ratio: 2.0, name: '200%' },
            { ratio: 2.618, name: '261.8%' }
        ]

        const baseLevel = direction === 'BULLISH' ? swingLow : swingHigh

        for (const fib of fibExtensions) {
            let level: number

            if (direction === 'BULLISH') {
                level = baseLevel + (range * fib.ratio)
            } else {
                level = baseLevel - (range * fib.ratio)
            }

            const distance = Math.abs(level - currentPrice) / currentPrice

            // Only include reasonable extension targets (2-50% from current price)
            if (distance > 0.02 && distance < 0.50) {
                let confidence = 0.5

                // Golden ratio extensions (127.2%, 161.8%) have higher confidence
                if (fib.ratio === 1.272 || fib.ratio === 1.618) {
                    confidence = 0.75
                } else if (fib.ratio === 1.414 || fib.ratio === 2.0) {
                    confidence = 0.65
                }

                // Adjust confidence based on distance (closer targets more reliable)
                if (distance < 0.10) {
                    confidence += 0.1
                } else if (distance > 0.30) {
                    confidence -= 0.1
                }

                targets.push({
                    level,
                    type: 'TARGET',
                    confidence: Math.max(0.3, Math.min(0.85, confidence)),
                    reasoning: `Fibonacci ${fib.name} extension target (${direction.toLowerCase()} projection)`
                })
            }
        }

        return targets.sort((a, b) => b.confidence - a.confidence)
    }

    /**
     * Calculate price targets based on support and resistance levels
     */
    static calculateSupportResistanceTargets(
        levels: SupportResistanceLevel[],
        currentPrice: number,
        direction: 'BULLISH' | 'BEARISH'
    ): PriceTarget[] {
        const targets: PriceTarget[] = []

        // Filter levels based on direction
        const relevantLevels = levels.filter(level => {
            if (direction === 'BULLISH') {
                return level.type === 'RESISTANCE' && level.level > currentPrice
            } else {
                return level.type === 'SUPPORT' && level.level < currentPrice
            }
        })

        // Sort by strength and proximity
        const sortedLevels = relevantLevels.sort((a, b) => {
            const aDistance = Math.abs(a.level - currentPrice) / currentPrice
            const bDistance = Math.abs(b.level - currentPrice) / currentPrice

            // Combine strength and proximity (closer levels with higher strength preferred)
            const aScore = a.strength - (aDistance * 0.5)
            const bScore = b.strength - (bDistance * 0.5)

            return bScore - aScore
        })

        // Generate targets from top levels
        for (let i = 0; i < Math.min(5, sortedLevels.length); i++) {
            const level = sortedLevels[i]
            const distance = Math.abs(level.level - currentPrice) / currentPrice

            // Skip levels that are too close or too far
            if (distance < 0.005 || distance > 0.25) continue

            // Calculate confidence based on level strength, touches, and distance
            let confidence = level.strength * 0.6 + level.confidence * 0.4

            // Bonus for multiple touches
            if (level.touches >= 3) {
                confidence += 0.1
            }

            // Penalty for being further away
            if (i > 0) {
                confidence *= (1 - i * 0.1)
            }

            targets.push({
                level: level.level,
                type: 'TARGET',
                confidence: Math.max(0.3, Math.min(0.9, confidence)),
                reasoning: `${level.type.toLowerCase()} level at ${level.level.toFixed(2)} (${level.touches} touches, strength: ${(level.strength * 100).toFixed(0)}%)`
            })
        }

        return targets
    }

    /**
     * Calculate pattern-based price targets using measured moves
     */
    static calculatePatternTargets(
        pattern: PatternResult,
        currentPrice: number,
        data: OHLCV[]
    ): PriceTarget[] {
        const targets: PriceTarget[] = []

        switch (pattern.type) {
            case 'ASCENDING_TRIANGLE':
                targets.push(...this.calculateTriangleTargets(pattern, currentPrice, 'BULLISH'))
                break
            case 'DESCENDING_TRIANGLE':
                targets.push(...this.calculateTriangleTargets(pattern, currentPrice, 'BEARISH'))
                break
            case 'SYMMETRICAL_TRIANGLE':
                targets.push(...this.calculateSymmetricalTriangleTargets(pattern, currentPrice))
                break
            case 'HEAD_AND_SHOULDERS':
                targets.push(...this.calculateHeadAndShouldersTargets(pattern, currentPrice, 'BEARISH'))
                break
            case 'INVERSE_HEAD_AND_SHOULDERS':
                targets.push(...this.calculateHeadAndShouldersTargets(pattern, currentPrice, 'BULLISH'))
                break
            case 'DOUBLE_TOP':
                targets.push(...this.calculateDoubleTopBottomTargets(pattern, currentPrice, 'BEARISH'))
                break
            case 'DOUBLE_BOTTOM':
                targets.push(...this.calculateDoubleTopBottomTargets(pattern, currentPrice, 'BULLISH'))
                break
            case 'CHANNEL_UP':
            case 'CHANNEL_DOWN':
                targets.push(...this.calculateChannelTargets(pattern, currentPrice, data))
                break
            case 'WEDGE_RISING':
                targets.push(...this.calculateWedgeTargets(pattern, currentPrice, 'BEARISH'))
                break
            case 'WEDGE_FALLING':
                targets.push(...this.calculateWedgeTargets(pattern, currentPrice, 'BULLISH'))
                break
            case 'FLAG':
            case 'PENNANT':
                targets.push(...this.calculateFlagPennantTargets(pattern, currentPrice, data))
                break
        }

        return targets.filter(target => {
            const distance = Math.abs(target.level - currentPrice) / currentPrice
            return distance > 0.01 && distance < 0.30 // Reasonable target range
        })
    }

    /**
     * Calculate triangle pattern targets
     */
    private static calculateTriangleTargets(
        pattern: PatternResult,
        currentPrice: number,
        direction: 'BULLISH' | 'BEARISH'
    ): PriceTarget[] {
        const coordinates = pattern.coordinates
        if (coordinates.length < 4) return []

        // Calculate pattern height
        const highs = coordinates.filter((_, i) => i % 2 === 0).map(c => c.y)
        const lows = coordinates.filter((_, i) => i % 2 === 1).map(c => c.y)

        const patternHigh = Math.max(...highs)
        const patternLow = Math.min(...lows)
        const patternHeight = patternHigh - patternLow

        // Measured move target
        let targetLevel: number
        if (direction === 'BULLISH') {
            targetLevel = patternHigh + patternHeight
        } else {
            targetLevel = patternLow - patternHeight
        }

        const confidence = pattern.confidence * 0.8 // Slightly lower confidence for projected targets

        return [{
            level: targetLevel,
            type: 'TARGET',
            confidence,
            reasoning: `${pattern.type.replace('_', ' ').toLowerCase()} measured move target (pattern height: ${patternHeight.toFixed(2)})`
        }]
    }

    /**
     * Calculate symmetrical triangle targets (both directions)
     */
    private static calculateSymmetricalTriangleTargets(
        pattern: PatternResult,
        currentPrice: number
    ): PriceTarget[] {
        const coordinates = pattern.coordinates
        if (coordinates.length < 4) return []

        const patternHigh = Math.max(...coordinates.map(c => c.y))
        const patternLow = Math.min(...coordinates.map(c => c.y))
        const patternHeight = patternHigh - patternLow

        const confidence = pattern.confidence * 0.7 // Lower confidence due to directional uncertainty

        return [
            {
                level: patternHigh + patternHeight,
                type: 'TARGET',
                confidence,
                reasoning: 'Symmetrical triangle upside breakout target'
            },
            {
                level: patternLow - patternHeight,
                type: 'TARGET',
                confidence,
                reasoning: 'Symmetrical triangle downside breakdown target'
            }
        ]
    }

    /**
     * Calculate head and shoulders targets
     */
    private static calculateHeadAndShouldersTargets(
        pattern: PatternResult,
        currentPrice: number,
        direction: 'BULLISH' | 'BEARISH'
    ): PriceTarget[] {
        const coordinates = pattern.coordinates
        if (coordinates.length < 3) return []

        // Find head (highest/lowest point) and shoulders
        let head: ChartCoordinate
        let neckline: number

        if (direction === 'BEARISH') {
            head = coordinates.reduce((max, coord) => coord.y > max.y ? coord : max)
            neckline = Math.min(...coordinates.filter(c => c !== head).map(c => c.y))
        } else {
            head = coordinates.reduce((min, coord) => coord.y < min.y ? coord : min)
            neckline = Math.max(...coordinates.filter(c => c !== head).map(c => c.y))
        }

        const patternHeight = Math.abs(head.y - neckline)
        const targetLevel = direction === 'BEARISH' ?
            neckline - patternHeight :
            neckline + patternHeight

        return [{
            level: targetLevel,
            type: 'TARGET',
            confidence: pattern.confidence * 0.85,
            reasoning: `${pattern.type.replace('_', ' ').toLowerCase()} measured move from neckline (${neckline.toFixed(2)})`
        }]
    }

    /**
     * Calculate double top/bottom targets
     */
    private static calculateDoubleTopBottomTargets(
        pattern: PatternResult,
        currentPrice: number,
        direction: 'BULLISH' | 'BEARISH'
    ): PriceTarget[] {
        const coordinates = pattern.coordinates
        if (coordinates.length < 2) return []

        const peaks = coordinates.map(c => c.y)
        const avgPeak = peaks.reduce((sum, p) => sum + p, 0) / peaks.length

        // Estimate neckline (would need more data in real implementation)
        const necklineEstimate = direction === 'BEARISH' ?
            avgPeak * 0.95 : // Assume neckline 5% below double top
            avgPeak * 1.05   // Assume neckline 5% above double bottom

        const patternHeight = Math.abs(avgPeak - necklineEstimate)
        const targetLevel = direction === 'BEARISH' ?
            necklineEstimate - patternHeight :
            necklineEstimate + patternHeight

        return [{
            level: targetLevel,
            type: 'TARGET',
            confidence: pattern.confidence * 0.8,
            reasoning: `${pattern.type.replace('_', ' ').toLowerCase()} measured move target`
        }]
    }

    /**
     * Calculate channel targets
     */
    private static calculateChannelTargets(
        pattern: PatternResult,
        currentPrice: number,
        data: OHLCV[]
    ): PriceTarget[] {
        const coordinates = pattern.coordinates
        if (coordinates.length < 4) return []

        // Calculate channel width
        const upperPoints = coordinates.filter((_, i) => i < 2)
        const lowerPoints = coordinates.filter((_, i) => i >= 2)

        const avgUpper = upperPoints.reduce((sum, p) => sum + p.y, 0) / upperPoints.length
        const avgLower = lowerPoints.reduce((sum, p) => sum + p.y, 0) / lowerPoints.length
        const channelWidth = avgUpper - avgLower

        const isUpChannel = pattern.type === 'CHANNEL_UP'
        const confidence = pattern.confidence * 0.7

        // Generate targets based on channel direction
        if (isUpChannel) {
            return [
                {
                    level: currentPrice + channelWidth * 0.5,
                    type: 'TARGET',
                    confidence,
                    reasoning: 'Ascending channel resistance target'
                },
                {
                    level: currentPrice - channelWidth * 0.3,
                    type: 'STOP_LOSS',
                    confidence: confidence + 0.1,
                    reasoning: 'Ascending channel support level'
                }
            ]
        } else {
            return [
                {
                    level: currentPrice - channelWidth * 0.5,
                    type: 'TARGET',
                    confidence,
                    reasoning: 'Descending channel support target'
                },
                {
                    level: currentPrice + channelWidth * 0.3,
                    type: 'STOP_LOSS',
                    confidence: confidence + 0.1,
                    reasoning: 'Descending channel resistance level'
                }
            ]
        }
    }

    /**
     * Calculate wedge targets
     */
    private static calculateWedgeTargets(
        pattern: PatternResult,
        currentPrice: number,
        direction: 'BULLISH' | 'BEARISH'
    ): PriceTarget[] {
        const coordinates = pattern.coordinates
        if (coordinates.length < 4) return []

        // Calculate wedge height at the beginning
        const startHigh = Math.max(coordinates[0].y, coordinates[1].y)
        const startLow = Math.min(coordinates[0].y, coordinates[1].y)
        const wedgeHeight = startHigh - startLow

        // Wedge targets are typically the full height of the wedge
        const targetLevel = direction === 'BULLISH' ?
            currentPrice + wedgeHeight :
            currentPrice - wedgeHeight

        return [{
            level: targetLevel,
            type: 'TARGET',
            confidence: pattern.confidence * 0.75,
            reasoning: `${pattern.type.replace('_', ' ').toLowerCase()} reversal target (wedge height: ${wedgeHeight.toFixed(2)})`
        }]
    }

    /**
     * Calculate flag and pennant targets
     */
    private static calculateFlagPennantTargets(
        pattern: PatternResult,
        currentPrice: number,
        data: OHLCV[]
    ): PriceTarget[] {
        // Flag/pennant targets are based on the prior trend move
        // This would require identifying the flagpole in a real implementation

        // Simplified calculation: assume 10% move as typical flagpole
        const estimatedFlagpoleHeight = currentPrice * 0.10

        // Direction depends on the prior trend (simplified assumption)
        const recentTrend = this.detectRecentTrend(data)
        const direction = recentTrend === 'UP' ? 'BULLISH' : 'BEARISH'

        const targetLevel = direction === 'BULLISH' ?
            currentPrice + estimatedFlagpoleHeight :
            currentPrice - estimatedFlagpoleHeight

        return [{
            level: targetLevel,
            type: 'TARGET',
            confidence: pattern.confidence * 0.8,
            reasoning: `${pattern.type.toLowerCase()} continuation target (estimated flagpole projection)`
        }]
    }

    /**
     * Detect recent trend direction (simplified)
     */
    private static detectRecentTrend(data: OHLCV[]): 'UP' | 'DOWN' | 'SIDEWAYS' {
        if (data.length < 10) return 'SIDEWAYS'

        const recent = data.slice(-10)
        const startPrice = recent[0].close
        const endPrice = recent[recent.length - 1].close

        const change = (endPrice - startPrice) / startPrice

        if (change > 0.02) return 'UP'
        if (change < -0.02) return 'DOWN'
        return 'SIDEWAYS'
    }

    /**
     * Calculate comprehensive price targets combining all methods
     */
    static calculateComprehensiveTargets(
        currentPrice: number,
        supportResistanceLevels: SupportResistanceLevel[],
        patterns: PatternResult[],
        data: OHLCV[],
        swingHigh?: number,
        swingLow?: number,
        direction?: 'BULLISH' | 'BEARISH'
    ): PriceTarget[] {
        const allTargets: PriceTarget[] = []

        // Support/Resistance targets
        if (direction) {
            const srTargets = this.calculateSupportResistanceTargets(
                supportResistanceLevels,
                currentPrice,
                direction
            )
            allTargets.push(...srTargets)
        }

        // Pattern-based targets
        for (const pattern of patterns) {
            if (pattern.confidence > 0.6) { // Only use high-confidence patterns
                const patternTargets = this.calculatePatternTargets(pattern, currentPrice, data)
                allTargets.push(...patternTargets)
            }
        }

        // Fibonacci targets (if swing points provided)
        if (swingHigh && swingLow) {
            const fibRetracements = this.calculateFibonacciRetracements(
                swingHigh,
                swingLow,
                currentPrice
            )
            allTargets.push(...fibRetracements)

            if (direction) {
                const fibExtensions = this.calculateFibonacciExtensions(
                    swingHigh,
                    swingLow,
                    currentPrice,
                    direction
                )
                allTargets.push(...fibExtensions)
            }
        }

        // Remove duplicates and sort by confidence
        const uniqueTargets = this.deduplicateTargets(allTargets)
        return uniqueTargets.sort((a, b) => b.confidence - a.confidence).slice(0, 8) // Top 8 targets
    }

    /**
     * Remove duplicate targets that are too close to each other
     */
    private static deduplicateTargets(targets: PriceTarget[]): PriceTarget[] {
        const uniqueTargets: PriceTarget[] = []
        const tolerance = 0.015 // 1.5% tolerance for considering targets as duplicates

        for (const target of targets) {
            const isDuplicate = uniqueTargets.some(existing =>
                Math.abs(existing.level - target.level) / existing.level < tolerance &&
                existing.type === target.type
            )

            if (!isDuplicate) {
                uniqueTargets.push(target)
            } else {
                // If duplicate, keep the one with higher confidence
                const existingIndex = uniqueTargets.findIndex(existing =>
                    Math.abs(existing.level - target.level) / existing.level < tolerance &&
                    existing.type === target.type
                )

                if (existingIndex !== -1 && target.confidence > uniqueTargets[existingIndex].confidence) {
                    uniqueTargets[existingIndex] = target
                }
            }
        }

        return uniqueTargets
    }
}