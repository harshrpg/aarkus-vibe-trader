import {
    OHLCV,
    PatternResult,
    PatternType,
    ChartCoordinate,
    PriceTarget,
    TrendLine
} from '../types/trading'

/**
 * Pattern Recognition Module
 * Implements detection algorithms for common chart patterns
 */

export class PatternRecognition {
    /**
     * Identify triangle patterns (ascending, descending, symmetrical)
     */
    static identifyTrianglePatterns(data: OHLCV[]): PatternResult[] {
        const patterns: PatternResult[] = []
        const minPatternLength = 20
        const maxPatternLength = 100

        if (data.length < minPatternLength) return patterns

        // Look for triangle patterns in recent data
        for (let start = Math.max(0, data.length - maxPatternLength); start < data.length - minPatternLength; start++) {
            const segment = data.slice(start, start + minPatternLength)

            // Find potential triangle patterns
            const highs = this.findLocalHighs(segment)
            const lows = this.findLocalLows(segment)

            if (highs.length >= 2 && lows.length >= 2) {
                const trianglePattern = this.analyzeTrianglePattern(segment, highs, lows, start)
                if (trianglePattern) {
                    patterns.push(trianglePattern)
                }
            }
        }

        return patterns
    }

    /**
     * Detect head and shoulders patterns
     */
    static identifyHeadAndShoulders(data: OHLCV[]): PatternResult[] {
        const patterns: PatternResult[] = []
        const minPatternLength = 15

        if (data.length < minPatternLength) return patterns

        const highs = this.findLocalHighs(data)

        // Need at least 3 highs for head and shoulders
        if (highs.length < 3) return patterns

        for (let i = 1; i < highs.length - 1; i++) {
            const leftShoulder = highs[i - 1]
            const head = highs[i]
            const rightShoulder = highs[i + 1]

            // Check if it forms a head and shoulders pattern
            if (this.isHeadAndShouldersPattern(leftShoulder, head, rightShoulder, data)) {
                const pattern = this.createHeadAndShouldersPattern(leftShoulder, head, rightShoulder, data)
                patterns.push(pattern)
            }
        }

        return patterns
    }

    /**
     * Identify channel patterns (up and down channels)
     */
    static identifyChannels(data: OHLCV[]): PatternResult[] {
        const patterns: PatternResult[] = []
        const minChannelLength = 20

        if (data.length < minChannelLength) return patterns

        const highs = this.findLocalHighs(data)
        const lows = this.findLocalLows(data)

        // Find parallel trend lines
        const upperTrendLines = this.findTrendLines(highs, data, 'RESISTANCE')
        const lowerTrendLines = this.findTrendLines(lows, data, 'SUPPORT')

        // Look for parallel channels
        for (const upperLine of upperTrendLines) {
            for (const lowerLine of lowerTrendLines) {
                if (this.areParallelLines(upperLine, lowerLine)) {
                    const channelPattern = this.createChannelPattern(upperLine, lowerLine, data)
                    if (channelPattern) {
                        patterns.push(channelPattern)
                    }
                }
            }
        }

        return patterns
    }

    /**
     * Detect double top and double bottom patterns
     */
    static identifyDoubleTopBottom(data: OHLCV[]): PatternResult[] {
        const patterns: PatternResult[] = []
        const minPatternLength = 20

        if (data.length < minPatternLength) return patterns

        // Find double tops
        const highs = this.findLocalHighs(data)
        for (let i = 0; i < highs.length - 1; i++) {
            for (let j = i + 1; j < highs.length; j++) {
                if (this.isDoubleTop(highs[i], highs[j], data)) {
                    const pattern = this.createDoubleTopPattern(highs[i], highs[j], data)
                    patterns.push(pattern)
                }
            }
        }

        // Find double bottoms
        const lows = this.findLocalLows(data)
        for (let i = 0; i < lows.length - 1; i++) {
            for (let j = i + 1; j < lows.length; j++) {
                if (this.isDoubleBottom(lows[i], lows[j], data)) {
                    const pattern = this.createDoubleBottomPattern(lows[i], lows[j], data)
                    patterns.push(pattern)
                }
            }
        }

        return patterns
    }

    /**
     * Find local highs in price data
     */
    private static findLocalHighs(data: OHLCV[], lookback: number = 3): Array<{ index: number, price: number }> {
        const highs: Array<{ index: number, price: number }> = []

        for (let i = lookback; i < data.length - lookback; i++) {
            let isHigh = true

            // Check if current point is higher than surrounding points
            for (let j = i - lookback; j <= i + lookback; j++) {
                if (j !== i && data[j].high >= data[i].high) {
                    isHigh = false
                    break
                }
            }

            if (isHigh) {
                highs.push({ index: i, price: data[i].high })
            }

            // Limit the number of highs to prevent excessive computation
            if (highs.length >= 50) {
                break
            }
        }

        return highs
    }

    /**
     * Find local lows in price data
     */
    private static findLocalLows(data: OHLCV[], lookback: number = 3): Array<{ index: number, price: number }> {
        const lows: Array<{ index: number, price: number }> = []

        for (let i = lookback; i < data.length - lookback; i++) {
            let isLow = true

            // Check if current point is lower than surrounding points
            for (let j = i - lookback; j <= i + lookback; j++) {
                if (j !== i && data[j].low <= data[i].low) {
                    isLow = false
                    break
                }
            }

            if (isLow) {
                lows.push({ index: i, price: data[i].low })
            }

            // Limit the number of lows to prevent excessive computation
            if (lows.length >= 50) {
                break
            }
        }

        return lows
    }

    /**
     * Analyze triangle pattern type and validity
     */
    private static analyzeTrianglePattern(
        data: OHLCV[],
        highs: Array<{ index: number, price: number }>,
        lows: Array<{ index: number, price: number }>,
        startIndex: number
    ): PatternResult | null {
        if (highs.length < 2 || lows.length < 2) return null

        // Calculate trend lines for highs and lows
        const highTrend = this.calculateTrendLine(highs)
        const lowTrend = this.calculateTrendLine(lows)

        // Determine triangle type
        let patternType: PatternType
        let confidence = 0.5

        if (highTrend.slope < -0.001 && Math.abs(lowTrend.slope) < 0.001) {
            patternType = 'DESCENDING_TRIANGLE'
            confidence = 0.7
        } else if (Math.abs(highTrend.slope) < 0.001 && lowTrend.slope > 0.001) {
            patternType = 'ASCENDING_TRIANGLE'
            confidence = 0.7
        } else if (highTrend.slope < -0.001 && lowTrend.slope > 0.001) {
            patternType = 'SYMMETRICAL_TRIANGLE'
            confidence = 0.6
        } else {
            return null // Not a valid triangle
        }

        // Create coordinates
        const coordinates: ChartCoordinate[] = [
            { x: startIndex + highs[0].index, y: highs[0].price },
            { x: startIndex + highs[highs.length - 1].index, y: highs[highs.length - 1].price },
            { x: startIndex + lows[0].index, y: lows[0].price },
            { x: startIndex + lows[lows.length - 1].index, y: lows[lows.length - 1].price }
        ]

        // Calculate price targets
        const priceTargets = this.calculateTrianglePriceTargets(patternType, data, coordinates)

        return {
            type: patternType,
            confidence,
            coordinates,
            description: this.getPatternDescription(patternType),
            implications: this.getPatternImplications(patternType),
            priceTargets
        }
    }

    /**
     * Check if three points form a head and shoulders pattern
     */
    private static isHeadAndShouldersPattern(
        leftShoulder: { index: number, price: number },
        head: { index: number, price: number },
        rightShoulder: { index: number, price: number },
        data: OHLCV[]
    ): boolean {
        // Head should be higher than both shoulders
        if (head.price <= leftShoulder.price || head.price <= rightShoulder.price) {
            return false
        }

        // Shoulders should be roughly equal (within 5%)
        const shoulderDiff = Math.abs(leftShoulder.price - rightShoulder.price) / leftShoulder.price
        if (shoulderDiff > 0.05) {
            return false
        }

        // Check for neckline (support level between shoulders)
        const necklineLevel = Math.min(leftShoulder.price, rightShoulder.price) * 0.98

        // Verify pattern structure
        return head.index > leftShoulder.index && rightShoulder.index > head.index
    }

    /**
     * Create head and shoulders pattern result
     */
    private static createHeadAndShouldersPattern(
        leftShoulder: { index: number, price: number },
        head: { index: number, price: number },
        rightShoulder: { index: number, price: number },
        data: OHLCV[]
    ): PatternResult {
        const coordinates: ChartCoordinate[] = [
            { x: leftShoulder.index, y: leftShoulder.price },
            { x: head.index, y: head.price },
            { x: rightShoulder.index, y: rightShoulder.price }
        ]

        const necklineLevel = Math.min(leftShoulder.price, rightShoulder.price)
        const patternHeight = head.price - necklineLevel
        const priceTarget = necklineLevel - patternHeight

        const priceTargets: PriceTarget[] = [
            {
                level: priceTarget,
                type: 'TARGET',
                confidence: 0.7,
                reasoning: 'Head and shoulders measured move target'
            }
        ]

        return {
            type: 'HEAD_AND_SHOULDERS',
            confidence: 0.75,
            coordinates,
            description: 'Head and shoulders reversal pattern',
            implications: ['Bearish reversal signal', 'Potential trend change from up to down'],
            priceTargets
        }
    }

    /**
     * Check if two points form a double top
     */
    private static isDoubleTop(
        first: { index: number, price: number },
        second: { index: number, price: number },
        data: OHLCV[]
    ): boolean {
        // Peaks should be roughly equal (within 3%)
        const priceDiff = Math.abs(first.price - second.price) / first.price
        if (priceDiff > 0.03) return false

        // Should be separated by at least 10 periods
        if (second.index - first.index < 10) return false

        // There should be a valley between the peaks
        const valleyStart = first.index + 1
        const valleyEnd = second.index - 1
        const lowestInBetween = Math.min(...data.slice(valleyStart, valleyEnd + 1).map(d => d.low))

        // Valley should be at least 5% below the peaks
        return (first.price - lowestInBetween) / first.price > 0.05
    }

    /**
     * Check if two points form a double bottom
     */
    private static isDoubleBottom(
        first: { index: number, price: number },
        second: { index: number, price: number },
        data: OHLCV[]
    ): boolean {
        // Bottoms should be roughly equal (within 3%)
        const priceDiff = Math.abs(first.price - second.price) / first.price
        if (priceDiff > 0.03) return false

        // Should be separated by at least 10 periods
        if (second.index - first.index < 10) return false

        // There should be a peak between the bottoms
        const peakStart = first.index + 1
        const peakEnd = second.index - 1
        const highestInBetween = Math.max(...data.slice(peakStart, peakEnd + 1).map(d => d.high))

        // Peak should be at least 5% above the bottoms
        return (highestInBetween - first.price) / first.price > 0.05
    }

    /**
     * Create double top pattern result
     */
    private static createDoubleTopPattern(
        first: { index: number, price: number },
        second: { index: number, price: number },
        data: OHLCV[]
    ): PatternResult {
        const coordinates: ChartCoordinate[] = [
            { x: first.index, y: first.price },
            { x: second.index, y: second.price }
        ]

        // Find the valley between peaks for neckline
        const valleyStart = first.index + 1
        const valleyEnd = second.index - 1
        const valleyData = data.slice(valleyStart, valleyEnd + 1)
        const necklineLevel = Math.min(...valleyData.map(d => d.low))

        const patternHeight = first.price - necklineLevel
        const priceTarget = necklineLevel - patternHeight

        const priceTargets: PriceTarget[] = [
            {
                level: priceTarget,
                type: 'TARGET',
                confidence: 0.7,
                reasoning: 'Double top measured move target'
            }
        ]

        return {
            type: 'DOUBLE_TOP',
            confidence: 0.7,
            coordinates,
            description: 'Double top reversal pattern',
            implications: ['Bearish reversal signal', 'Resistance level confirmed'],
            priceTargets
        }
    }

    /**
     * Create double bottom pattern result
     */
    private static createDoubleBottomPattern(
        first: { index: number, price: number },
        second: { index: number, price: number },
        data: OHLCV[]
    ): PatternResult {
        const coordinates: ChartCoordinate[] = [
            { x: first.index, y: first.price },
            { x: second.index, y: second.price }
        ]

        // Find the peak between bottoms for neckline
        const peakStart = first.index + 1
        const peakEnd = second.index - 1
        const peakData = data.slice(peakStart, peakEnd + 1)
        const necklineLevel = Math.max(...peakData.map(d => d.high))

        const patternHeight = necklineLevel - first.price
        const priceTarget = necklineLevel + patternHeight

        const priceTargets: PriceTarget[] = [
            {
                level: priceTarget,
                type: 'TARGET',
                confidence: 0.7,
                reasoning: 'Double bottom measured move target'
            }
        ]

        return {
            type: 'DOUBLE_BOTTOM',
            confidence: 0.7,
            coordinates,
            description: 'Double bottom reversal pattern',
            implications: ['Bullish reversal signal', 'Support level confirmed'],
            priceTargets
        }
    }

    /**
     * Calculate trend line from points
     */
    private static calculateTrendLine(points: Array<{ index: number, price: number }>): { slope: number, intercept: number } {
        if (points.length < 2) return { slope: 0, intercept: 0 }

        const n = points.length
        const sumX = points.reduce((sum, p) => sum + p.index, 0)
        const sumY = points.reduce((sum, p) => sum + p.price, 0)
        const sumXY = points.reduce((sum, p) => sum + p.index * p.price, 0)
        const sumXX = points.reduce((sum, p) => sum + p.index * p.index, 0)

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
        const intercept = (sumY - slope * sumX) / n

        return { slope, intercept }
    }

    /**
     * Find trend lines from pivot points
     */
    private static findTrendLines(
        points: Array<{ index: number, price: number }>,
        data: OHLCV[],
        type: 'SUPPORT' | 'RESISTANCE'
    ): TrendLine[] {
        const trendLines: TrendLine[] = []

        // Need at least 2 points for a trend line
        if (points.length < 2) return trendLines

        // Limit the number of points to prevent stack overflow
        const limitedPoints = points.slice(0, Math.min(20, points.length))

        for (let i = 0; i < limitedPoints.length - 1; i++) {
            for (let j = i + 1; j < limitedPoints.length; j++) {
                const startPoint = limitedPoints[i]
                const endPoint = limitedPoints[j]

                // Skip if points are too close
                if (endPoint.index - startPoint.index < 5) continue

                // Calculate slope
                const slope = (endPoint.price - startPoint.price) / (endPoint.index - startPoint.index)

                // Validate trend line by checking how many points it touches
                let touches = 0
                const tolerance = 0.02 // 2% tolerance

                for (const point of limitedPoints) {
                    if (point.index >= startPoint.index && point.index <= endPoint.index) {
                        const expectedPrice = startPoint.price + slope * (point.index - startPoint.index)
                        const priceDiff = Math.abs(point.price - expectedPrice) / expectedPrice

                        if (priceDiff <= tolerance) {
                            touches++
                        }
                    }
                }

                // Valid trend line should touch at least 2 points (reduced from 3)
                if (touches >= 2) {
                    trendLines.push({
                        startPoint: { x: startPoint.index, y: startPoint.price },
                        endPoint: { x: endPoint.index, y: endPoint.price },
                        slope,
                        strength: touches,
                        type
                    })
                }

                // Limit the number of trend lines to prevent excessive computation
                if (trendLines.length >= 10) {
                    return trendLines
                }
            }
        }

        return trendLines
    }

    /**
     * Check if two trend lines are parallel
     */
    private static areParallelLines(line1: TrendLine, line2: TrendLine): boolean {
        const slopeDiff = Math.abs(line1.slope - line2.slope)
        return slopeDiff < 0.001 // Very small slope difference indicates parallel lines
    }

    /**
     * Create channel pattern from parallel trend lines
     */
    private static createChannelPattern(upperLine: TrendLine, lowerLine: TrendLine, data: OHLCV[]): PatternResult | null {
        // Determine channel direction
        const isUpChannel = upperLine.slope > 0 && lowerLine.slope > 0
        const isDownChannel = upperLine.slope < 0 && lowerLine.slope < 0

        if (!isUpChannel && !isDownChannel) return null

        const patternType: PatternType = isUpChannel ? 'CHANNEL_UP' : 'CHANNEL_DOWN'

        const coordinates: ChartCoordinate[] = [
            upperLine.startPoint,
            upperLine.endPoint,
            lowerLine.startPoint,
            lowerLine.endPoint
        ]

        // Calculate channel width for price targets
        const channelWidth = Math.abs(upperLine.startPoint.y - lowerLine.startPoint.y)
        const currentPrice = data[data.length - 1].close

        const priceTargets: PriceTarget[] = []

        if (isUpChannel) {
            priceTargets.push({
                level: currentPrice + channelWidth * 0.5,
                type: 'TARGET',
                confidence: 0.6,
                reasoning: 'Channel resistance target'
            })
        } else {
            priceTargets.push({
                level: currentPrice - channelWidth * 0.5,
                type: 'TARGET',
                confidence: 0.6,
                reasoning: 'Channel support target'
            })
        }

        return {
            type: patternType,
            confidence: 0.65,
            coordinates,
            description: isUpChannel ? 'Ascending channel pattern' : 'Descending channel pattern',
            implications: isUpChannel ?
                ['Bullish trend continuation', 'Buy at support, sell at resistance'] :
                ['Bearish trend continuation', 'Sell at resistance, buy at support'],
            priceTargets
        }
    }

    /**
     * Calculate price targets for triangle patterns
     */
    private static calculateTrianglePriceTargets(
        patternType: PatternType,
        data: OHLCV[],
        coordinates: ChartCoordinate[]
    ): PriceTarget[] {
        const currentPrice = data[data.length - 1].close
        const patternHeight = Math.max(...coordinates.map(c => c.y)) - Math.min(...coordinates.map(c => c.y))

        const priceTargets: PriceTarget[] = []

        switch (patternType) {
            case 'ASCENDING_TRIANGLE':
                priceTargets.push({
                    level: currentPrice + patternHeight,
                    type: 'TARGET',
                    confidence: 0.7,
                    reasoning: 'Ascending triangle breakout target'
                })
                break
            case 'DESCENDING_TRIANGLE':
                priceTargets.push({
                    level: currentPrice - patternHeight,
                    type: 'TARGET',
                    confidence: 0.7,
                    reasoning: 'Descending triangle breakdown target'
                })
                break
            case 'SYMMETRICAL_TRIANGLE':
                priceTargets.push(
                    {
                        level: currentPrice + patternHeight * 0.75,
                        type: 'TARGET',
                        confidence: 0.6,
                        reasoning: 'Symmetrical triangle upside breakout target'
                    },
                    {
                        level: currentPrice - patternHeight * 0.75,
                        type: 'TARGET',
                        confidence: 0.6,
                        reasoning: 'Symmetrical triangle downside breakdown target'
                    }
                )
                break
        }

        return priceTargets
    }

    /**
     * Get pattern description
     */
    private static getPatternDescription(patternType: PatternType): string {
        const descriptions: Record<PatternType, string> = {
            'ASCENDING_TRIANGLE': 'Ascending triangle - bullish continuation pattern',
            'DESCENDING_TRIANGLE': 'Descending triangle - bearish continuation pattern',
            'SYMMETRICAL_TRIANGLE': 'Symmetrical triangle - neutral consolidation pattern',
            'HEAD_AND_SHOULDERS': 'Head and shoulders - bearish reversal pattern',
            'INVERSE_HEAD_AND_SHOULDERS': 'Inverse head and shoulders - bullish reversal pattern',
            'DOUBLE_TOP': 'Double top - bearish reversal pattern',
            'DOUBLE_BOTTOM': 'Double bottom - bullish reversal pattern',
            'CHANNEL_UP': 'Ascending channel - bullish trend continuation',
            'CHANNEL_DOWN': 'Descending channel - bearish trend continuation',
            'WEDGE_RISING': 'Rising wedge - bearish reversal pattern',
            'WEDGE_FALLING': 'Falling wedge - bullish reversal pattern',
            'FLAG': 'Flag pattern - trend continuation',
            'PENNANT': 'Pennant pattern - trend continuation'
        }

        return descriptions[patternType] || 'Unknown pattern'
    }

    /**
     * Get pattern implications
     */
    private static getPatternImplications(patternType: PatternType): string[] {
        const implications: Record<PatternType, string[]> = {
            'ASCENDING_TRIANGLE': ['Bullish bias', 'Expect upward breakout', 'Rising support with horizontal resistance'],
            'DESCENDING_TRIANGLE': ['Bearish bias', 'Expect downward breakdown', 'Falling resistance with horizontal support'],
            'SYMMETRICAL_TRIANGLE': ['Neutral bias', 'Breakout direction uncertain', 'Decreasing volatility before move'],
            'HEAD_AND_SHOULDERS': ['Bearish reversal', 'Trend change from up to down', 'Break of neckline confirms pattern'],
            'INVERSE_HEAD_AND_SHOULDERS': ['Bullish reversal', 'Trend change from down to up', 'Break of neckline confirms pattern'],
            'DOUBLE_TOP': ['Bearish reversal', 'Strong resistance level', 'Failed attempt to break higher'],
            'DOUBLE_BOTTOM': ['Bullish reversal', 'Strong support level', 'Failed attempt to break lower'],
            'CHANNEL_UP': ['Bullish trend', 'Buy dips to support', 'Sell rallies to resistance'],
            'CHANNEL_DOWN': ['Bearish trend', 'Sell rallies to resistance', 'Buy dips for short covering'],
            'WEDGE_RISING': ['Bearish divergence', 'Weakening uptrend', 'Expect downward reversal'],
            'WEDGE_FALLING': ['Bullish divergence', 'Weakening downtrend', 'Expect upward reversal'],
            'FLAG': ['Trend continuation', 'Brief consolidation', 'Expect resumption of prior trend'],
            'PENNANT': ['Trend continuation', 'Triangular consolidation', 'Expect resumption of prior trend']
        }

        return implications[patternType] || ['Pattern analysis needed']
    }
}