'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  Target,
  TrendingUp,
  RefreshCw,
  Layers,
  AlertCircle,
  Activity,
  Zap
} from 'lucide-react'
import type {
  AnalysisResult,
  AnalysisStreamChunk,
  TechnicalPartialChunk,
  RecommendationsPartialChunk,
  ChartUpdateChunk,
  AnalysisStatusChunk
} from '@/lib/types/trading'
import {
  setSymbol,
  applyIndicator,
  drawPattern,
  drawPriceTarget,
  drawSupportResistanceLevel,
  clearAllIndicators,
  clearAllPatterns,
  clearAllPriceTargets,
  ready as chartReady
} from '@/lib/tv/bridge'

interface VibeTraderStreamingChartProps {
  symbol: string
  query?: string
  onChartReady?: () => void
  onError?: (error: string) => void
  onComplete?: (result: AnalysisResult) => void
  className?: string
}

interface StreamingChartState {
  isReady: boolean
  isStreaming: boolean
  currentStage: string
  progress: number
  appliedIndicators: Set<string>
  appliedPatterns: Set<string>
  appliedTargets: Set<string>
  error: string | null
  lastUpdate: Date | null
}

interface PendingUpdate {
  type: 'indicator' | 'pattern' | 'target' | 'level'
  data: any
  timestamp: Date
}

export function VibeTraderStreamingChart({
  symbol,
  query,
  onChartReady,
  onError,
  onComplete,
  className
}: VibeTraderStreamingChartProps) {
  const [chartState, setChartState] = useState<StreamingChartState>({
    isReady: false,
    isStreaming: false,
    currentStage: 'initializing',
    progress: 0,
    appliedIndicators: new Set(),
    appliedPatterns: new Set(),
    appliedTargets: new Set(),
    error: null,
    lastUpdate: null
  })

  const [pendingUpdates, setPendingUpdates] = useState<PendingUpdate[]>([])
  const streamRef = useRef<ReadableStreamDefaultReader | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Initialize chart readiness
  useEffect(() => {
    const initChart = async () => {
      try {
        await chartReady
        setChartState(prev => ({ ...prev, isReady: true, error: null }))
        onChartReady?.()
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Chart initialization failed'
        setChartState(prev => ({ ...prev, error: errorMessage }))
        onError?.(errorMessage)
      }
    }

    initChart()
  }, [onChartReady, onError])

  // Start streaming analysis when chart is ready and symbol is provided
  useEffect(() => {
    if (!chartState.isReady || !symbol || !query || chartState.isStreaming) return

    startStreamingAnalysis()

    return () => {
      stopStreaming()
    }
  }, [chartState.isReady, symbol, query])

  // Process pending updates with smooth transitions
  useEffect(() => {
    if (pendingUpdates.length === 0 || !chartState.isReady) return

    const processPendingUpdates = async () => {
      const updates = [...pendingUpdates]
      setPendingUpdates([])

      for (const update of updates) {
        try {
          await applyUpdateToChart(update)
          // Small delay for smooth transitions
          await new Promise(resolve => setTimeout(resolve, 200))
        } catch (error) {
          console.error('Failed to apply chart update:', error)
        }
      }
    }

    const timeoutId = setTimeout(processPendingUpdates, 100)
    return () => clearTimeout(timeoutId)
  }, [pendingUpdates, chartState.isReady])

  const startStreamingAnalysis = useCallback(async () => {
    if (!symbol || !query) return

    try {
      // Abort any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()

      setChartState(prev => ({
        ...prev,
        isStreaming: true,
        error: null,
        currentStage: 'initializing',
        progress: 0
      }))

      // Clear existing chart elements
      await Promise.all([
        clearAllIndicators(),
        clearAllPatterns(),
        clearAllPriceTargets()
      ])

      // Normalize for API while preserving TradingView symbol format
      const apiSymbol = symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
      const tvSymbol = symbol

      // Set symbol on chart (expects formats like BTC/USD)
      await setSymbol(tvSymbol, '1D')

      // Start streaming request
      const response = await fetch('/api/vibe-trader', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: apiSymbol,
          timeframe: '1D',
          query: query || `Analyze ${tvSymbol} for trading opportunities`
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`Analysis request failed: ${response.statusText}`)
      }

      if (!response.body) {
        throw new Error('No response body received')
      }

      // Process streaming response
      const reader = response.body.getReader()
      streamRef.current = reader

      await processStreamingResponse(reader)

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Streaming analysis aborted')
        return
      }

      const errorMessage = error instanceof Error ? error.message : 'Streaming analysis failed'
      setChartState(prev => ({
        ...prev,
        error: errorMessage,
        isStreaming: false
      }))
      onError?.(errorMessage)
    }
  }, [symbol, onError])

  const processStreamingResponse = async (reader: ReadableStreamDefaultReader) => {
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          setChartState(prev => ({
            ...prev,
            isStreaming: false,
            currentStage: 'complete',
            progress: 100
          }))
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim()) {
            try {
              await processStreamChunk(line)
            } catch (error) {
              console.error('Error processing stream chunk:', error)
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream processing error:', error)
      throw error
    }
  }

  const processStreamChunk = async (line: string) => {
    try {
      // Parse the streaming data format (assuming it follows AI SDK format)
      if (line.startsWith('0:')) {
        // Text chunk - ignore for chart updates
        return
      }

      if (line.startsWith('8:')) {
        // Message annotation
        const jsonStr = line.substring(2)
        const annotation = JSON.parse(jsonStr)

        if (annotation.type === 'vibe_trader_chunk') {
          await handleAnalysisChunk(annotation.data)
        }
      }
    } catch (error) {
      console.error('Error parsing stream chunk:', error)
    }
  }

  const handleAnalysisChunk = async (chunk: AnalysisStreamChunk) => {
    switch (chunk.type) {
      case 'status':
        handleStatusUpdate(chunk.data as AnalysisStatusChunk)
        break

      case 'technical_partial':
        handleTechnicalUpdate(chunk.data as TechnicalPartialChunk)
        break

      case 'recommendations_partial':
        handleRecommendationsUpdate(chunk.data as RecommendationsPartialChunk)
        break

      case 'chart_update':
        handleChartUpdate(chunk.data as ChartUpdateChunk)
        break

      case 'complete':
        handleAnalysisComplete(chunk.data as AnalysisResult)
        break

      case 'error':
        handleAnalysisError(chunk.data)
        break
    }
  }

  const handleStatusUpdate = (status: AnalysisStatusChunk) => {
    setChartState(prev => ({
      ...prev,
      currentStage: status.stage,
      progress: status.progress,
      lastUpdate: new Date()
    }))
  }

  const handleTechnicalUpdate = (technical: TechnicalPartialChunk) => {
    const updates: PendingUpdate[] = []

    // Queue indicator updates
    if (technical.indicators) {
      technical.indicators.forEach(indicator => {
        updates.push({
          type: 'indicator',
          data: indicator,
          timestamp: technical.timestamp
        })
      })
    }

    // Queue pattern updates
    if (technical.patterns) {
      technical.patterns.forEach(pattern => {
        updates.push({
          type: 'pattern',
          data: pattern,
          timestamp: technical.timestamp
        })
      })
    }

    // Queue support/resistance level updates
    if (technical.supportResistance) {
      technical.supportResistance.forEach(level => {
        updates.push({
          type: 'level',
          data: level,
          timestamp: technical.timestamp
        })
      })
    }

    setPendingUpdates(prev => [...prev, ...updates])
  }

  const handleRecommendationsUpdate = (recommendations: RecommendationsPartialChunk) => {
    const updates: PendingUpdate[] = []

    // Queue price target updates
    recommendations.recommendations.forEach(rec => {
      rec.priceTargets.forEach(target => {
        updates.push({
          type: 'target',
          data: target,
          timestamp: recommendations.timestamp
        })
      })

      // Add stop loss as target
      updates.push({
        type: 'target',
        data: {
          level: rec.stopLoss,
          type: 'STOP_LOSS',
          confidence: 0.9,
          reasoning: 'Stop loss level'
        },
        timestamp: recommendations.timestamp
      })
    })

    setPendingUpdates(prev => [...prev, ...updates])
  }

  const handleChartUpdate = (chartUpdate: ChartUpdateChunk) => {
    const updates: PendingUpdate[] = []

    chartUpdate.annotations.forEach(annotation => {
      updates.push({
        type: 'pattern',
        data: annotation,
        timestamp: chartUpdate.timestamp
      })
    })

    chartUpdate.priceTargets.forEach(target => {
      updates.push({
        type: 'target',
        data: target,
        timestamp: chartUpdate.timestamp
      })
    })

    setPendingUpdates(prev => [...prev, ...updates])
  }

  const handleAnalysisComplete = (result: AnalysisResult) => {
    setChartState(prev => ({
      ...prev,
      isStreaming: false,
      currentStage: 'complete',
      progress: 100,
      lastUpdate: new Date()
    }))
    onComplete?.(result)
  }

  const handleAnalysisError = (error: any) => {
    setChartState(prev => ({
      ...prev,
      error: error.message || 'Analysis failed',
      isStreaming: false
    }))
  }

  const applyUpdateToChart = async (update: PendingUpdate) => {
    try {
      switch (update.type) {
        case 'indicator':
          await applyIndicator({
            name: update.data.name,
            parameters: update.data.parameters || {},
            visible: true
          })
          setChartState(prev => ({
            ...prev,
            appliedIndicators: new Set([...prev.appliedIndicators, update.data.name])
          }))
          break

        case 'pattern':
          await drawPattern(adaptPatternForBridge(update.data))
          setChartState(prev => ({
            ...prev,
            appliedPatterns: new Set([...prev.appliedPatterns, update.data.type])
          }))
          break

        case 'target':
          await drawPriceTarget(update.data)
          setChartState(prev => ({
            ...prev,
            appliedTargets: new Set([...prev.appliedTargets, `${update.data.type}_${update.data.level}`])
          }))
          break

        case 'level':
          await drawSupportResistanceLevel({
            ...update.data,
            description: `${update.data.type} level at ${update.data.level.toFixed(2)}`
          })
          break
      }
    } catch (error) {
      console.error(`Failed to apply ${update.type} update:`, error)
    }
  }

  // Adapter: convert analysis PatternResult (x/y, domain types) to bridge format (time/price, bridge PatternType)
  const adaptPatternForBridge = (pattern: any) => {
    const typeMap: Record<string, string> = {
      ASCENDING_TRIANGLE: 'TRIANGLE_ASCENDING',
      DESCENDING_TRIANGLE: 'TRIANGLE_DESCENDING',
      SYMMETRICAL_TRIANGLE: 'TRIANGLE_SYMMETRICAL',
      CHANNEL_UP: 'CHANNEL_UP',
      CHANNEL_DOWN: 'CHANNEL_DOWN',
      HEAD_AND_SHOULDERS: 'HEAD_AND_SHOULDERS',
      DOUBLE_TOP: 'DOUBLE_TOP',
      DOUBLE_BOTTOM: 'DOUBLE_BOTTOM'
    }

    const coords = Array.isArray(pattern.coordinates) ? pattern.coordinates : []
    const maxX = coords.reduce((m: number, c: any) => (typeof c.x === 'number' && c.x > m ? c.x : m), 0)
    const nowSec = Math.floor(Date.now() / 1000)
    const day = 86400

    const convertedCoords = coords.map((c: any) => ({
      time: nowSec - Math.max(0, (maxX - (typeof c.x === 'number' ? c.x : 0))) * day,
      price: typeof c.y === 'number' ? c.y : 0
    }))

    return {
      ...pattern,
      type: typeMap[pattern.type] || 'TREND_LINE',
      coordinates: convertedCoords
    }
  }

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    if (streamRef.current) {
      streamRef.current.cancel()
    }
    setChartState(prev => ({ ...prev, isStreaming: false }))
  }, [])

  const restartAnalysis = useCallback(async () => {
    stopStreaming()
    await new Promise(resolve => setTimeout(resolve, 500))
    startStreamingAnalysis()
  }, [stopStreaming, startStreamingAnalysis])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Streaming Status Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className={cn(
                'h-5 w-5',
                chartState.isStreaming ? 'text-green-500 animate-pulse' : 'text-muted-foreground'
              )} />
              <CardTitle className="text-lg">Live Analysis - {symbol}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={chartState.isReady ? 'default' : 'secondary'}>
                {chartState.isReady ? 'Chart Ready' : 'Loading Chart'}
              </Badge>
              <Badge variant={chartState.isStreaming ? 'default' : 'outline'}>
                {chartState.isStreaming ? 'Streaming' : 'Idle'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={restartAnalysis}
                disabled={!chartState.isReady}
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', chartState.isStreaming && 'animate-spin')} />
                Restart
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium capitalize">
                {chartState.currentStage.replace('_', ' ')}
              </span>
              <span className="text-muted-foreground">
                {chartState.progress}%
              </span>
            </div>
            <Progress value={chartState.progress} className="h-2" />
          </div>

          {/* Real-time Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-blue-600">
                {chartState.appliedIndicators.size}
              </div>
              <div className="text-xs text-muted-foreground">Indicators</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-600">
                {chartState.appliedPatterns.size}
              </div>
              <div className="text-xs text-muted-foreground">Patterns</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-orange-600">
                {chartState.appliedTargets.size}
              </div>
              <div className="text-xs text-muted-foreground">Targets</div>
            </div>
          </div>

          {/* Last Update */}
          {chartState.lastUpdate && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Zap className="h-3 w-3" />
              Last update: {chartState.lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </CardContent>

        {chartState.error && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-600 dark:text-red-400">{chartState.error}</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Pending Updates Queue */}
      {pendingUpdates.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Pending Updates
              <Badge variant="outline" className="ml-auto">
                {pendingUpdates.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {pendingUpdates.slice(0, 5).map((update, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span className="capitalize">{update.type}</span>
                  <span className="text-muted-foreground">
                    {update.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
              {pendingUpdates.length > 5 && (
                <div className="text-xs text-muted-foreground text-center pt-1">
                  +{pendingUpdates.length - 5} more updates...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}