'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { 
  BarChart3, 
  Target, 
  TrendingUp, 
  Eye, 
  EyeOff, 
  RefreshCw,
  Settings,
  Layers,
  AlertCircle
} from 'lucide-react'
import type { 
  AnalysisResult, 
  IndicatorResult, 
  PatternResult,
  PriceTarget,
  SupportResistanceLevel
} from '@/lib/types/trading'
import {
  setSymbol,
  applyIndicator,
  applyMultipleIndicators,
  drawPattern,
  drawMultiplePatterns,
  drawPriceTarget,
  drawMultiplePriceTargets,
  drawSupportResistanceLevel,
  clearAllIndicators,
  clearAllPatterns,
  clearAllPriceTargets,
  getAppliedIndicators,
  getAppliedPatterns,
  getAppliedPriceTargets,
  removeIndicator,
  removePattern,
  removePriceTarget,
  ready as chartReady
} from '@/lib/tv/bridge'

interface VibeTraderChartIntegrationProps {
  analysisResult?: AnalysisResult
  onChartReady?: () => void
  onError?: (error: string) => void
  className?: string
}

interface ChartState {
  isReady: boolean
  appliedIndicators: string[]
  appliedPatterns: string[]
  appliedPriceTargets: string[]
  isLoading: boolean
  error: string | null
}

interface IndicatorToggle {
  name: string
  applied: boolean
  visible: boolean
  config: any
}

interface PatternToggle {
  id: string
  type: string
  applied: boolean
  visible: boolean
  confidence: number
}

interface PriceTargetToggle {
  id: string
  type: string
  level: number
  applied: boolean
  visible: boolean
}

export function VibeTraderChartIntegration({ 
  analysisResult, 
  onChartReady,
  onError,
  className 
}: VibeTraderChartIntegrationProps) {
  const [chartState, setChartState] = useState<ChartState>({
    isReady: false,
    appliedIndicators: [],
    appliedPatterns: [],
    appliedPriceTargets: [],
    isLoading: false,
    error: null
  })

  const [indicatorToggles, setIndicatorToggles] = useState<IndicatorToggle[]>([])
  const [patternToggles, setPatternToggles] = useState<PatternToggle[]>([])
  const [priceTargetToggles, setPriceTargetToggles] = useState<PriceTargetToggle[]>([])
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(true)

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

  // Update toggles when analysis result changes
  useEffect(() => {
    if (!analysisResult) return

    // Update indicator toggles
    const indicators: IndicatorToggle[] = analysisResult.technicalAnalysis.indicators.map(indicator => ({
      name: indicator.name,
      applied: false,
      visible: true,
      config: indicator.parameters
    }))
    setIndicatorToggles(indicators)

    // Update pattern toggles
    const patterns: PatternToggle[] = analysisResult.technicalAnalysis.patterns.map((pattern, index) => ({
      id: `${pattern.type}_${index}`,
      type: pattern.type,
      applied: false,
      visible: true,
      confidence: pattern.confidence
    }))
    setPatternToggles(patterns)

    // Update price target toggles from recommendations
    const priceTargets: PriceTargetToggle[] = []
    analysisResult.recommendations.forEach((rec, recIndex) => {
      rec.priceTargets.forEach((target, targetIndex) => {
        priceTargets.push({
          id: `${rec.action}_${recIndex}_${target.type}_${targetIndex}`,
          type: target.type,
          level: target.level,
          applied: false,
          visible: true
        })
      })
      // Add stop loss as a price target
      priceTargets.push({
        id: `${rec.action}_${recIndex}_STOP_LOSS`,
        type: 'STOP_LOSS',
        level: rec.stopLoss,
        applied: false,
        visible: true
      })
    })
    setPriceTargetToggles(priceTargets)

  }, [analysisResult])

  // Auto-apply analysis results to chart
  useEffect(() => {
    if (!chartState.isReady || !analysisResult || !autoApplyEnabled) return

    const applyAnalysisToChart = async () => {
      setChartState(prev => ({ ...prev, isLoading: true }))

      try {
        // Set symbol and timeframe
        await setSymbol(analysisResult.symbol, '1D')

        // Apply key indicators
        const keyIndicators = analysisResult.technicalAnalysis.indicators
          .filter(ind => ['RSI', 'MACD', 'Moving Average'].includes(ind.name))
          .slice(0, 3)

        if (keyIndicators.length > 0) {
          await applyMultipleIndicators(keyIndicators.map(ind => ({
            name: ind.name,
            parameters: ind.parameters,
            visible: true
          })))

          // Update indicator toggles
          setIndicatorToggles(prev => prev.map(toggle => ({
            ...toggle,
            applied: keyIndicators.some(ind => ind.name === toggle.name)
          })))
        }

        // Draw high-confidence patterns
        const highConfidencePatterns = analysisResult.technicalAnalysis.patterns
          .filter(pattern => pattern.confidence > 0.7)
          .slice(0, 2)

        if (highConfidencePatterns.length > 0) {
          await drawMultiplePatterns(highConfidencePatterns)

          // Update pattern toggles
          setPatternToggles(prev => prev.map(toggle => ({
            ...toggle,
            applied: highConfidencePatterns.some(pattern => 
              toggle.id.startsWith(pattern.type)
            )
          })))
        }

        // Draw support/resistance levels
        const keyLevels = analysisResult.technicalAnalysis.supportResistance
          .filter(level => level.confidence > 0.6)
          .slice(0, 4)

        for (const level of keyLevels) {
          await drawSupportResistanceLevel(level)
        }

        // Draw price targets from top recommendation
        if (analysisResult.recommendations.length > 0) {
          const topRecommendation = analysisResult.recommendations[0]
          const targets = [
            ...topRecommendation.priceTargets,
            {
              level: topRecommendation.stopLoss,
              type: 'STOP_LOSS' as const,
              confidence: 0.9,
              reasoning: 'Stop loss level'
            }
          ]

          await drawMultiplePriceTargets(targets)

          // Update price target toggles
          setPriceTargetToggles(prev => prev.map(toggle => ({
            ...toggle,
            applied: targets.some(target => 
              Math.abs(target.level - toggle.level) < 0.01
            )
          })))
        }

        // Update chart state
        setChartState(prev => ({
          ...prev,
          appliedIndicators: getAppliedIndicators(),
          appliedPatterns: getAppliedPatterns(),
          appliedPriceTargets: getAppliedPriceTargets(),
          isLoading: false
        }))

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to apply analysis to chart'
        setChartState(prev => ({ 
          ...prev, 
          error: errorMessage, 
          isLoading: false 
        }))
        onError?.(errorMessage)
      }
    }

    applyAnalysisToChart()
  }, [chartState.isReady, analysisResult, autoApplyEnabled, onError])

  // Toggle indicator visibility
  const toggleIndicator = useCallback(async (indicatorName: string) => {
    if (!chartState.isReady) return

    const toggle = indicatorToggles.find(t => t.name === indicatorName)
    if (!toggle) return

    try {
      if (toggle.applied) {
        await removeIndicator(indicatorName)
        setIndicatorToggles(prev => prev.map(t => 
          t.name === indicatorName ? { ...t, applied: false } : t
        ))
      } else {
        await applyIndicator({
          name: indicatorName,
          parameters: toggle.config,
          visible: true
        })
        setIndicatorToggles(prev => prev.map(t => 
          t.name === indicatorName ? { ...t, applied: true } : t
        ))
      }

      setChartState(prev => ({
        ...prev,
        appliedIndicators: getAppliedIndicators()
      }))
    } catch (error) {
      console.error(`Failed to toggle indicator ${indicatorName}:`, error)
    }
  }, [chartState.isReady, indicatorToggles])

  // Toggle pattern visibility
  const togglePattern = useCallback(async (patternId: string) => {
    if (!chartState.isReady || !analysisResult) return

    const toggle = patternToggles.find(t => t.id === patternId)
    if (!toggle) return

    try {
      if (toggle.applied) {
        await removePattern(patternId)
        setPatternToggles(prev => prev.map(t => 
          t.id === patternId ? { ...t, applied: false } : t
        ))
      } else {
        const pattern = analysisResult.technicalAnalysis.patterns.find(p => 
          toggle.id.startsWith(p.type)
        )
        if (pattern) {
          await drawPattern(pattern)
          setPatternToggles(prev => prev.map(t => 
            t.id === patternId ? { ...t, applied: true } : t
          ))
        }
      }

      setChartState(prev => ({
        ...prev,
        appliedPatterns: getAppliedPatterns()
      }))
    } catch (error) {
      console.error(`Failed to toggle pattern ${patternId}:`, error)
    }
  }, [chartState.isReady, patternToggles, analysisResult])

  // Toggle price target visibility
  const togglePriceTarget = useCallback(async (targetId: string) => {
    if (!chartState.isReady || !analysisResult) return

    const toggle = priceTargetToggles.find(t => t.id === targetId)
    if (!toggle) return

    try {
      if (toggle.applied) {
        await removePriceTarget(targetId)
        setPriceTargetToggles(prev => prev.map(t => 
          t.id === targetId ? { ...t, applied: false } : t
        ))
      } else {
        const target: PriceTarget = {
          level: toggle.level,
          type: toggle.type as any,
          confidence: 0.8,
          reasoning: `${toggle.type} level from analysis`
        }
        await drawPriceTarget(target)
        setPriceTargetToggles(prev => prev.map(t => 
          t.id === targetId ? { ...t, applied: true } : t
        ))
      }

      setChartState(prev => ({
        ...prev,
        appliedPriceTargets: getAppliedPriceTargets()
      }))
    } catch (error) {
      console.error(`Failed to toggle price target ${targetId}:`, error)
    }
  }, [chartState.isReady, priceTargetToggles, analysisResult])

  // Clear all chart elements
  const clearAll = useCallback(async () => {
    if (!chartState.isReady) return

    try {
      setChartState(prev => ({ ...prev, isLoading: true }))

      await Promise.all([
        clearAllIndicators(),
        clearAllPatterns(),
        clearAllPriceTargets()
      ])

      setIndicatorToggles(prev => prev.map(t => ({ ...t, applied: false })))
      setPatternToggles(prev => prev.map(t => ({ ...t, applied: false })))
      setPriceTargetToggles(prev => prev.map(t => ({ ...t, applied: false })))

      setChartState(prev => ({
        ...prev,
        appliedIndicators: [],
        appliedPatterns: [],
        appliedPriceTargets: [],
        isLoading: false
      }))
    } catch (error) {
      console.error('Failed to clear chart:', error)
      setChartState(prev => ({ ...prev, isLoading: false }))
    }
  }, [chartState.isReady])

  // Refresh chart with current analysis
  const refreshChart = useCallback(async () => {
    if (!chartState.isReady || !analysisResult) return

    await clearAll()
    setAutoApplyEnabled(false)
    setTimeout(() => setAutoApplyEnabled(true), 100)
  }, [chartState.isReady, analysisResult, clearAll])

  if (!analysisResult) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No analysis results to display on chart</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Chart Controls Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Chart Analysis Controls</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={chartState.isReady ? 'default' : 'secondary'}>
                {chartState.isReady ? 'Ready' : 'Loading'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshChart}
                disabled={!chartState.isReady || chartState.isLoading}
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', chartState.isLoading && 'animate-spin')} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                disabled={!chartState.isReady || chartState.isLoading}
              >
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>

        {chartState.error && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-600 dark:text-red-400">{chartState.error}</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Technical Indicators */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Technical Indicators
            <Badge variant="outline" className="ml-auto">
              {indicatorToggles.filter(t => t.applied).length} applied
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {indicatorToggles.map((toggle) => (
            <div key={toggle.name} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{toggle.name}</span>
                {analysisResult && (
                  <Badge variant="outline" className={cn(
                    'text-xs',
                    analysisResult.technicalAnalysis.indicators
                      .find(ind => ind.name === toggle.name)?.signal === 'BULLISH' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : analysisResult.technicalAnalysis.indicators
                          .find(ind => ind.name === toggle.name)?.signal === 'BEARISH'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                  )}>
                    {analysisResult.technicalAnalysis.indicators
                      .find(ind => ind.name === toggle.name)?.signal || 'NEUTRAL'}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleIndicator(toggle.name)}
                disabled={!chartState.isReady || chartState.isLoading}
                className="h-8 w-8 p-0"
              >
                {toggle.applied ? (
                  <Eye className="h-4 w-4 text-green-600" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Chart Patterns */}
      {patternToggles.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Chart Patterns
              <Badge variant="outline" className="ml-auto">
                {patternToggles.filter(t => t.applied).length} applied
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {patternToggles.map((toggle) => (
              <div key={toggle.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {toggle.type.replace(/_/g, ' ')}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {(toggle.confidence * 100).toFixed(0)}% confidence
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePattern(toggle.id)}
                  disabled={!chartState.isReady || chartState.isLoading}
                  className="h-8 w-8 p-0"
                >
                  {toggle.applied ? (
                    <Eye className="h-4 w-4 text-green-600" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Price Targets */}
      {priceTargetToggles.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Price Targets
              <Badge variant="outline" className="ml-auto">
                {priceTargetToggles.filter(t => t.applied).length} applied
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {priceTargetToggles.map((toggle) => (
              <div key={toggle.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                <div className="flex items-center gap-2">
                  <Badge variant={
                    toggle.type === 'ENTRY' ? 'default' :
                    toggle.type === 'TARGET' ? 'secondary' : 'destructive'
                  } className="text-xs">
                    {toggle.type.replace('_', ' ')}
                  </Badge>
                  <span className="font-mono text-sm">${toggle.level.toFixed(2)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePriceTarget(toggle.id)}
                  disabled={!chartState.isReady || chartState.isLoading}
                  className="h-8 w-8 p-0"
                >
                  {toggle.applied ? (
                    <Eye className="h-4 w-4 text-green-600" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Chart Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Indicators: {chartState.appliedIndicators.length}</span>
              <Separator orientation="vertical" className="h-4" />
              <span>Patterns: {chartState.appliedPatterns.length}</span>
              <Separator orientation="vertical" className="h-4" />
              <span>Targets: {chartState.appliedPriceTargets.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Auto-apply:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAutoApplyEnabled(!autoApplyEnabled)}
                className="h-6 px-2 text-xs"
              >
                {autoApplyEnabled ? 'ON' : 'OFF'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}