/**
 * Performance Monitoring Module
 * Monitors system performance, resource usage, and analysis metrics
 */

export interface PerformanceMetrics {
    analysisSpeed: {
        averageTime: number
        medianTime: number
        p95Time: number
        p99Time: number
        totalAnalyses: number
    }
    memoryUsage: {
        heapUsed: number
        heapTotal: number
        external: number
        rss: number
        peakUsage: number
    }
    accuracy: {
        overall: number
        byTimeframe: Record<string, number>
        byAction: Record<string, number>
        trend: number
    }
    resourceUtilization: {
        cpuUsage: number
        memoryUtilization: number
        concurrentAnalyses: number
        queueLength: number
    }
    errorRates: {
        totalErrors: number
        errorRate: number
        errorsByType: Record<string, number>
        recentErrors: Array<{
            timestamp: Date
            type: string
            message: string
        }>
    }
}

export interface PerformanceAlert {
    type: 'PERFORMANCE' | 'MEMORY' | 'ACCURACY' | 'ERROR'
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    message: string
    timestamp: Date
    metrics: any
    recommendations: string[]
}

export interface AnalysisPerformanceRecord {
    id: string
    symbol: string
    type: 'single' | 'multi-timeframe'
    startTime: Date
    endTime: Date
    duration: number
    memoryBefore: number
    memoryAfter: number
    memoryDelta: number
    success: boolean
    error?: string
    parameters: Record<string, any>
}

export class PerformanceMonitor {
    private static instance: PerformanceMonitor
    private performanceRecords: AnalysisPerformanceRecord[] = []
    private activeAnalyses: Map<string, { startTime: Date, memoryBefore: number }> = new Map()
    private errorLog: Array<{ timestamp: Date, type: string, message: string }> = []
    private maxRecords: number = 1000
    private alertThresholds = {
        analysisTime: 30000, // 30 seconds
        memoryUsage: 500 * 1024 * 1024, // 500MB
        errorRate: 0.1, // 10%
        accuracyDrop: 0.2 // 20% drop
    }

    private constructor() {
        // Start periodic monitoring
        this.startPeriodicMonitoring()
    }

    static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor()
        }
        return PerformanceMonitor.instance
    }

    /**
     * Start timing an analysis
     */
    startAnalysis(
        symbol: string,
        type: 'single' | 'multi-timeframe' = 'single',
        parameters: Record<string, any> = {}
    ): string {
        const id = `${symbol}_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const startTime = new Date()
        const memoryBefore = process.memoryUsage().heapUsed

        this.activeAnalyses.set(id, { startTime, memoryBefore })

        return id
    }

    /**
     * End timing an analysis
     */
    endAnalysis(
        id: string,
        success: boolean = true,
        error?: string
    ): AnalysisPerformanceRecord | null {
        const activeAnalysis = this.activeAnalyses.get(id)
        if (!activeAnalysis) {
            console.warn(`No active analysis found for ID: ${id}`)
            return null
        }

        const endTime = new Date()
        const memoryAfter = process.memoryUsage().heapUsed
        const duration = endTime.getTime() - activeAnalysis.startTime.getTime()
        const memoryDelta = memoryAfter - activeAnalysis.memoryBefore

        // Extract symbol and type from ID
        const [symbol, type] = id.split('_')

        const record: AnalysisPerformanceRecord = {
            id,
            symbol,
            type: type as 'single' | 'multi-timeframe',
            startTime: activeAnalysis.startTime,
            endTime,
            duration,
            memoryBefore: activeAnalysis.memoryBefore,
            memoryAfter,
            memoryDelta,
            success,
            error,
            parameters: {}
        }

        // Store the record
        this.performanceRecords.unshift(record)

        // Limit records
        if (this.performanceRecords.length > this.maxRecords) {
            this.performanceRecords.splice(this.maxRecords)
        }

        // Remove from active analyses
        this.activeAnalyses.delete(id)

        // Log error if analysis failed
        if (!success && error) {
            this.logError('ANALYSIS_ERROR', error)
        }

        // Check for performance alerts
        this.checkPerformanceAlerts(record)

        return record
    }

    /**
     * Log an error
     */
    logError(type: string, message: string): void {
        this.errorLog.unshift({
            timestamp: new Date(),
            type,
            message
        })

        // Limit error log size
        if (this.errorLog.length > 100) {
            this.errorLog.splice(100)
        }
    }

    /**
     * Get current performance metrics
     */
    getPerformanceMetrics(): PerformanceMetrics {
        const recentRecords = this.performanceRecords.slice(0, 100) // Last 100 analyses
        const successfulRecords = recentRecords.filter(r => r.success)

        // Calculate analysis speed metrics
        const durations = successfulRecords.map(r => r.duration).sort((a, b) => a - b)
        const analysisSpeed = {
            averageTime: durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0,
            medianTime: durations.length > 0 ? durations[Math.floor(durations.length / 2)] : 0,
            p95Time: durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0,
            p99Time: durations.length > 0 ? durations[Math.floor(durations.length * 0.99)] : 0,
            totalAnalyses: this.performanceRecords.length
        }

        // Get current memory usage
        const memUsage = process.memoryUsage()
        const peakMemory = Math.max(...this.performanceRecords.map(r => r.memoryAfter))
        const memoryUsage = {
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external,
            rss: memUsage.rss,
            peakUsage: peakMemory
        }

        // Calculate accuracy metrics (mock - would integrate with actual accuracy tracking)
        const accuracy = {
            overall: 0.75, // Mock value
            byTimeframe: {
                '1H': 0.70,
                '4H': 0.75,
                '1D': 0.80,
                '1W': 0.78
            },
            byAction: {
                'BUY': 0.72,
                'SELL': 0.74,
                'HOLD': 0.80
            },
            trend: 0.05 // 5% improvement
        }

        // Calculate resource utilization
        const resourceUtilization = {
            cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
            memoryUtilization: memUsage.heapUsed / memUsage.heapTotal,
            concurrentAnalyses: this.activeAnalyses.size,
            queueLength: 0 // Would track actual queue if implemented
        }

        // Calculate error rates
        const recentErrors = this.errorLog.slice(0, 50)
        const errorsByType: Record<string, number> = {}
        recentErrors.forEach(error => {
            errorsByType[error.type] = (errorsByType[error.type] || 0) + 1
        })

        const errorRates = {
            totalErrors: this.errorLog.length,
            errorRate: recentRecords.length > 0 ? (recentRecords.length - successfulRecords.length) / recentRecords.length : 0,
            errorsByType,
            recentErrors: recentErrors.slice(0, 10)
        }

        return {
            analysisSpeed,
            memoryUsage,
            accuracy,
            resourceUtilization,
            errorRates
        }
    }

    /**
     * Get performance alerts
     */
    getPerformanceAlerts(): PerformanceAlert[] {
        const alerts: PerformanceAlert[] = []
        const metrics = this.getPerformanceMetrics()

        // Check analysis speed
        if (metrics.analysisSpeed.p95Time > this.alertThresholds.analysisTime) {
            alerts.push({
                type: 'PERFORMANCE',
                severity: 'HIGH',
                message: `95th percentile analysis time (${(metrics.analysisSpeed.p95Time / 1000).toFixed(1)}s) exceeds threshold`,
                timestamp: new Date(),
                metrics: { p95Time: metrics.analysisSpeed.p95Time },
                recommendations: [
                    'Consider optimizing analysis algorithms',
                    'Check for memory leaks',
                    'Review data processing efficiency'
                ]
            })
        }

        // Check memory usage
        if (metrics.memoryUsage.heapUsed > this.alertThresholds.memoryUsage) {
            alerts.push({
                type: 'MEMORY',
                severity: 'MEDIUM',
                message: `Memory usage (${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB) is high`,
                timestamp: new Date(),
                metrics: { heapUsed: metrics.memoryUsage.heapUsed },
                recommendations: [
                    'Review memory usage patterns',
                    'Implement garbage collection optimization',
                    'Consider reducing cache sizes'
                ]
            })
        }

        // Check error rate
        if (metrics.errorRates.errorRate > this.alertThresholds.errorRate) {
            alerts.push({
                type: 'ERROR',
                severity: 'HIGH',
                message: `Error rate (${(metrics.errorRates.errorRate * 100).toFixed(1)}%) exceeds threshold`,
                timestamp: new Date(),
                metrics: { errorRate: metrics.errorRates.errorRate },
                recommendations: [
                    'Investigate recent errors',
                    'Review input validation',
                    'Check external service dependencies'
                ]
            })
        }

        return alerts
    }

    /**
     * Get analysis performance by symbol
     */
    getSymbolPerformance(symbol: string): {
        totalAnalyses: number
        averageTime: number
        successRate: number
        memoryEfficiency: number
        recentTrend: 'IMPROVING' | 'STABLE' | 'DECLINING'
    } {
        const symbolRecords = this.performanceRecords.filter(r => r.symbol === symbol)

        if (symbolRecords.length === 0) {
            return {
                totalAnalyses: 0,
                averageTime: 0,
                successRate: 0,
                memoryEfficiency: 0,
                recentTrend: 'STABLE'
            }
        }

        const successfulRecords = symbolRecords.filter(r => r.success)
        const averageTime = successfulRecords.reduce((sum, r) => sum + r.duration, 0) / successfulRecords.length
        const successRate = successfulRecords.length / symbolRecords.length
        const averageMemoryDelta = symbolRecords.reduce((sum, r) => sum + Math.abs(r.memoryDelta), 0) / symbolRecords.length
        const memoryEfficiency = 1 - (averageMemoryDelta / (100 * 1024 * 1024)) // Normalize to 100MB baseline

        // Calculate recent trend
        const recentRecords = symbolRecords.slice(0, 10)
        const olderRecords = symbolRecords.slice(10, 20)

        let recentTrend: 'IMPROVING' | 'STABLE' | 'DECLINING' = 'STABLE'

        if (recentRecords.length >= 5 && olderRecords.length >= 5) {
            const recentAvgTime = recentRecords.reduce((sum, r) => sum + r.duration, 0) / recentRecords.length
            const olderAvgTime = olderRecords.reduce((sum, r) => sum + r.duration, 0) / olderRecords.length

            const improvement = (olderAvgTime - recentAvgTime) / olderAvgTime

            if (improvement > 0.1) {
                recentTrend = 'IMPROVING'
            } else if (improvement < -0.1) {
                recentTrend = 'DECLINING'
            }
        }

        return {
            totalAnalyses: symbolRecords.length,
            averageTime,
            successRate,
            memoryEfficiency: Math.max(0, Math.min(1, memoryEfficiency)),
            recentTrend
        }
    }

    /**
     * Get performance comparison between timeframes
     */
    getTimeframeComparison(): Record<string, {
        averageTime: number
        successRate: number
        memoryUsage: number
        count: number
    }> {
        const comparison: Record<string, {
            averageTime: number
            successRate: number
            memoryUsage: number
            count: number
        }> = {}

        // Group records by type
        const singleTimeframeRecords = this.performanceRecords.filter(r => r.type === 'single')
        const multiTimeframeRecords = this.performanceRecords.filter(r => r.type === 'multi-timeframe')

        // Calculate metrics for single timeframe
        if (singleTimeframeRecords.length > 0) {
            const successful = singleTimeframeRecords.filter(r => r.success)
            comparison['single'] = {
                averageTime: successful.reduce((sum, r) => sum + r.duration, 0) / successful.length,
                successRate: successful.length / singleTimeframeRecords.length,
                memoryUsage: singleTimeframeRecords.reduce((sum, r) => sum + r.memoryDelta, 0) / singleTimeframeRecords.length,
                count: singleTimeframeRecords.length
            }
        }

        // Calculate metrics for multi-timeframe
        if (multiTimeframeRecords.length > 0) {
            const successful = multiTimeframeRecords.filter(r => r.success)
            comparison['multi-timeframe'] = {
                averageTime: successful.reduce((sum, r) => sum + r.duration, 0) / successful.length,
                successRate: successful.length / multiTimeframeRecords.length,
                memoryUsage: multiTimeframeRecords.reduce((sum, r) => sum + r.memoryDelta, 0) / multiTimeframeRecords.length,
                count: multiTimeframeRecords.length
            }
        }

        return comparison
    }

    /**
     * Clear performance data
     */
    clearPerformanceData(): void {
        this.performanceRecords = []
        this.errorLog = []
        this.activeAnalyses.clear()
    }

    /**
     * Export performance data for analysis
     */
    exportPerformanceData(): {
        records: AnalysisPerformanceRecord[]
        errors: Array<{ timestamp: Date, type: string, message: string }>
        summary: PerformanceMetrics
    } {
        return {
            records: [...this.performanceRecords],
            errors: [...this.errorLog],
            summary: this.getPerformanceMetrics()
        }
    }

    /**
     * Private helper methods
     */
    private checkPerformanceAlerts(record: AnalysisPerformanceRecord): void {
        // Check if this analysis took too long
        if (record.duration > this.alertThresholds.analysisTime) {
            console.warn(`Slow analysis detected: ${record.symbol} took ${record.duration}ms`)
        }

        // Check if memory usage is excessive
        if (record.memoryDelta > 50 * 1024 * 1024) { // 50MB
            console.warn(`High memory usage detected: ${record.symbol} used ${record.memoryDelta / 1024 / 1024}MB`)
        }
    }

    private startPeriodicMonitoring(): void {
        // Monitor every 5 minutes
        setInterval(() => {
            const metrics = this.getPerformanceMetrics()

            // Log key metrics
            console.log('Performance Metrics:', {
                averageAnalysisTime: `${(metrics.analysisSpeed.averageTime / 1000).toFixed(1)}s`,
                memoryUsage: `${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`,
                errorRate: `${(metrics.errorRates.errorRate * 100).toFixed(1)}%`,
                activeAnalyses: metrics.resourceUtilization.concurrentAnalyses
            })

            // Check for alerts
            const alerts = this.getPerformanceAlerts()
            if (alerts.length > 0) {
                console.warn(`Performance alerts: ${alerts.length} issues detected`)
                alerts.forEach(alert => {
                    console.warn(`${alert.type} Alert (${alert.severity}): ${alert.message}`)
                })
            }
        }, 5 * 60 * 1000) // 5 minutes
    }
}