import { AnalysisResult, OHLCV } from '../types/trading'

interface CacheConfig {
    maxSize: number
    marketHoursTTL: number
    afterHoursTTL: number
}

interface CacheEntry<T> {
    data: T
    timestamp: Date
    ttl: number
}

export class AnalysisCache {
    private analysisCache = new Map<string, CacheEntry<AnalysisResult>>()
    private priceDataCache = new Map<string, CacheEntry<OHLCV[]>>()
    private config: CacheConfig

    constructor(config: CacheConfig) {
        this.config = config
    }

    /**
     * Get cached analysis result
     */
    getAnalysisResult(key: string): AnalysisResult | null {
        const entry = this.analysisCache.get(key)
        if (!entry) return null

        if (this.isExpired(entry)) {
            this.analysisCache.delete(key)
            return null
        }

        return entry.data
    }

    /**
     * Set analysis result in cache
     */
    setAnalysisResult(key: string, result: AnalysisResult): void {
        const ttl = this.isMarketHours() ? this.config.marketHoursTTL : this.config.afterHoursTTL

        this.analysisCache.set(key, {
            data: result,
            timestamp: new Date(),
            ttl
        })

        this.cleanup()
    }

    /**
     * Get cached price data
     */
    getPriceData(symbol: string, timeframe: string): OHLCV[] | null {
        const key = `${symbol}_${timeframe}`
        const entry = this.priceDataCache.get(key)

        if (!entry) return null

        if (this.isExpired(entry)) {
            this.priceDataCache.delete(key)
            return null
        }

        return entry.data
    }

    /**
     * Set price data in cache
     */
    setPriceData(symbol: string, timeframe: string, data: OHLCV[]): void {
        const key = `${symbol}_${timeframe}`
        const ttl = this.isMarketHours() ? this.config.marketHoursTTL : this.config.afterHoursTTL

        this.priceDataCache.set(key, {
            data,
            timestamp: new Date(),
            ttl
        })

        this.cleanup()
    }

    /**
     * Invalidate cache for a specific symbol
     */
    invalidateSymbol(symbol: string): void {
        const keysToDelete: string[] = []

        for (const key of this.analysisCache.keys()) {
            if (key.includes(symbol)) {
                keysToDelete.push(key)
            }
        }

        keysToDelete.forEach(key => this.analysisCache.delete(key))

        // Also invalidate price data
        for (const key of this.priceDataCache.keys()) {
            if (key.startsWith(symbol)) {
                this.priceDataCache.delete(key)
            }
        }
    }

    /**
     * Clear all caches
     */
    clearAll(): void {
        this.analysisCache.clear()
        this.priceDataCache.clear()
    }

    /**
     * Get cache statistics
     */
    getStatistics(): any {
        return {
            analysisEntries: this.analysisCache.size,
            priceDataEntries: this.priceDataCache.size,
            maxSize: this.config.maxSize,
            marketHoursTTL: this.config.marketHoursTTL,
            afterHoursTTL: this.config.afterHoursTTL
        }
    }

    /**
     * Invalidate cache based on market conditions
     */
    invalidateByMarketConditions(): void {
        // Invalidate all entries during high volatility or major market events
        this.clearAll()
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        this.clearAll()
    }

    /**
     * Check if entry is expired
     */
    private isExpired(entry: CacheEntry<any>): boolean {
        const now = new Date()
        const age = now.getTime() - entry.timestamp.getTime()
        return age > entry.ttl
    }

    /**
     * Check if it's market hours (simplified)
     */
    private isMarketHours(): boolean {
        const now = new Date()
        const hour = now.getHours()
        const day = now.getDay()

        // Simplified: weekdays 9 AM to 4 PM EST
        return day >= 1 && day <= 5 && hour >= 9 && hour <= 16
    }

    /**
     * Cleanup expired entries and enforce size limits
     */
    private cleanup(): void {
        // Remove expired entries
        for (const [key, entry] of this.analysisCache.entries()) {
            if (this.isExpired(entry)) {
                this.analysisCache.delete(key)
            }
        }

        for (const [key, entry] of this.priceDataCache.entries()) {
            if (this.isExpired(entry)) {
                this.priceDataCache.delete(key)
            }
        }

        // Enforce size limits (remove oldest entries)
        while (this.analysisCache.size > this.config.maxSize) {
            const firstKey = this.analysisCache.keys().next().value
            this.analysisCache.delete(firstKey)
        }

        while (this.priceDataCache.size > this.config.maxSize) {
            const firstKey = this.priceDataCache.keys().next().value
            this.priceDataCache.delete(firstKey)
        }
    }
}

export class PerformanceMonitor {
    private static instance: PerformanceMonitor
    private metrics = new Map<string, number[]>()
    private timers = new Map<string, number>()

    static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor()
        }
        return PerformanceMonitor.instance
    }

    /**
     * Start a performance timer
     */
    startTimer(operation: string): () => void {
        const startTime = performance.now()
        this.timers.set(operation, startTime)

        return () => {
            const endTime = performance.now()
            const duration = endTime - startTime

            if (!this.metrics.has(operation)) {
                this.metrics.set(operation, [])
            }

            this.metrics.get(operation)!.push(duration)
            this.timers.delete(operation)
        }
    }

    /**
     * Get performance metrics
     */
    getMetrics(): Record<string, any> {
        const result: Record<string, any> = {}

        for (const [operation, durations] of this.metrics.entries()) {
            if (durations.length > 0) {
                const avg = durations.reduce((a, b) => a + b, 0) / durations.length
                const min = Math.min(...durations)
                const max = Math.max(...durations)

                result[operation] = {
                    count: durations.length,
                    average: avg,
                    min,
                    max,
                    total: durations.reduce((a, b) => a + b, 0)
                }
            }
        }

        return result
    }

    /**
     * Clear all metrics
     */
    clearMetrics(): void {
        this.metrics.clear()
        this.timers.clear()
    }
}