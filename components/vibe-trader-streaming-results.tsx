'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { 
  TrendingUp, 
  BarChart3, 
  Target, 
  AlertCircle,
  Clock,
  Activity,
  CheckCircle,
  Loader2
} from 'lucide-react'
import type { 
  AnalysisResult,
  TechnicalPartialChunk,
  FundamentalPartialChunk,
  RecommendationsPartialChunk,
  IndicatorResult,
  PatternResult,
  TradingSignal
} from '@/lib/types/trading'

interface VibeTraderStreamingResultsProps {
  symbol: string
  isStreaming: boolean
  currentStage: string
  progress: number
  partialResults: {
    technical?: TechnicalPartialChunk
    fundamental?: FundamentalPartialChunk
    recommendations?: RecommendationsPartialChunk
  }
  finalResult?: AnalysisResult
  error?: string | null
  className?: string
}

interface StreamingSection {
  title: string
  icon: React.ReactNode
  status: 'pending' | 'loading' | 'partial' | 'complete'
  data?: any
}

export function VibeTraderStreamingResults({
  symbol,
  isStreaming,
  currentStage,
  progress,
  partialResults,
  finalResult,
  error,
  className
}: VibeTraderStreamingResultsProps) {
  const [sections, setSections] = useState<StreamingSection[]>([
    {
      title: 'Technical Analysis',
      icon: <BarChart3 className="h-4 w-4" />,
      status: 'pending'
    },
    {
      title: 'Fundamental Analysis',
      icon: <TrendingUp className="h-4 w-4" />,
      status: 'pending'
    },
    {
      title: 'Trading Recommendations',
      icon: <Target className="h-4 w-4" />,
      status: 'pending'
    }
  ])

  // Update section statuses based on streaming state
  useEffect(() => {
    setSections(prev => prev.map(section => {
      switch (section.title) {
        case 'Technical Analysis':
          if (finalResult?.technicalAnalysis) {
            return { ...section, status: 'complete', data: finalResult.technicalAnalysis }
          }
          if (partialResults.technical) {
            return { ...section, status: 'partial', data: partialResults.technical }
          }
          if (currentStage === 'technical_analysis') {
            return { ...section, status: 'loading' }
          }
          return { ...section, status: 'pending' }

        case 'Fundamental Analysis':
          if (finalResult?.fundamentalAnalysis) {
            return { ...section, status: 'complete', data: finalResult.fundamentalAnalysis }
          }
          if (partialResults.fundamental) {
            return { ...section, status: 'partial', data: partialResults.fundamental }
          }
          if (currentStage === 'fundamental_analysis') {
            return { ...section, status: 'loading' }
          }
          return { ...section, status: 'pending' }

        case 'Trading Recommendations':
          if (finalResult?.recommendations) {
            return { ...section, status: 'complete', data: finalResult.recommendations }
          }
          if (partialResults.recommendations) {
            return { ...section, status: 'partial', data: partialResults.recommendations }
          }
          if (currentStage === 'synthesis') {
            return { ...section, status: 'loading' }
          }
          return { ...section, status: 'pending' }

        default:
          return section
      }
    }))
  }, [currentStage, partialResults, finalResult])

  const getStatusIcon = (status: StreamingSection['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />
      case 'loading':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'partial':
        return <Activity className="h-4 w-4 text-orange-500" />
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />
    }
  }

  const getStatusBadge = (status: StreamingSection['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>
      case 'loading':
        return <Badge variant="default" className="bg-blue-500">Loading</Badge>
      case 'partial':
        return <Badge variant="default" className="bg-orange-500">Partial</Badge>
      case 'complete':
        return <Badge variant="default" className="bg-green-500">Complete</Badge>
    }
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Analysis Failed</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overall Progress */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Analysis Progress - {symbol}</CardTitle>
            <Badge variant={isStreaming ? 'default' : 'outline'}>
              {isStreaming ? 'Streaming' : 'Complete'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium capitalize">
                {currentStage.replace('_', ' ')}
              </span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Section Status Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Analysis Sections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sections.map((section, index) => (
            <div key={section.title} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {section.icon}
                <span className="font-medium">{section.title}</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(section.status)}
                {getStatusBadge(section.status)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Technical Analysis Results */}
      {(partialResults.technical || finalResult?.technicalAnalysis) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Technical Analysis
              </CardTitle>
              {getStatusBadge(sections[0].status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Indicators */}
            {(partialResults.technical?.indicators || finalResult?.technicalAnalysis.indicators) && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Technical Indicators</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {(partialResults.technical?.indicators || finalResult?.technicalAnalysis.indicators || [])
                    .slice(0, 6)
                    .map((indicator: IndicatorResult, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="text-sm font-medium">{indicator.name}</span>
                      <Badge variant="outline" className={cn(
                        'text-xs',
                        indicator.signal === 'BULLISH' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : indicator.signal === 'BEARISH'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      )}>
                        {indicator.signal}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Patterns */}
            {(partialResults.technical?.patterns || finalResult?.technicalAnalysis.patterns) && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Chart Patterns</h4>
                <div className="space-y-2">
                  {(partialResults.technical?.patterns || finalResult?.technicalAnalysis.patterns || [])
                    .slice(0, 3)
                    .map((pattern: PatternResult, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div>
                        <span className="text-sm font-medium">
                          {pattern.type.replace(/_/g, ' ')}
                        </span>
                        <p className="text-xs text-muted-foreground">{pattern.description}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {(pattern.confidence * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Support/Resistance */}
            {(partialResults.technical?.supportResistance || finalResult?.technicalAnalysis.supportResistance) && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Key Levels</h4>
                <div className="grid grid-cols-2 gap-2">
                  {(partialResults.technical?.supportResistance || finalResult?.technicalAnalysis.supportResistance || [])
                    .slice(0, 4)
                    .map((level, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="text-xs font-medium">{level.type}</span>
                      <span className="text-xs font-mono">${level.level.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fundamental Analysis Results */}
      {(partialResults.fundamental || finalResult?.fundamentalAnalysis) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Fundamental Analysis
              </CardTitle>
              {getStatusBadge(sections[1].status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Market Sentiment */}
            {(partialResults.fundamental?.marketSentiment || finalResult?.fundamentalAnalysis.marketSentiment) && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Market Sentiment</h4>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                  <span className="text-sm">Overall Sentiment</span>
                  <Badge variant="outline" className={cn(
                    'text-xs',
                    (partialResults.fundamental?.marketSentiment?.overall || finalResult?.fundamentalAnalysis.marketSentiment.overall || 0) > 0.1
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : (partialResults.fundamental?.marketSentiment?.overall || finalResult?.fundamentalAnalysis.marketSentiment.overall || 0) < -0.1
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                  )}>
                    {((partialResults.fundamental?.marketSentiment?.overall || finalResult?.fundamentalAnalysis.marketSentiment.overall || 0) * 100).toFixed(0)}%
                  </Badge>
                </div>
              </div>
            )}

            {/* News Analysis */}
            {(partialResults.fundamental?.newsAnalysis || finalResult?.fundamentalAnalysis.newsAnalysis) && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Recent News</h4>
                <div className="space-y-2">
                  {(partialResults.fundamental?.newsAnalysis?.relevantNews || finalResult?.fundamentalAnalysis.newsAnalysis.relevantNews || [])
                    .slice(0, 2)
                    .map((news, index) => (
                    <div key={index} className="p-2 bg-muted/50 rounded">
                      <p className="text-sm font-medium line-clamp-1">{news.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{news.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Trading Recommendations */}
      {(partialResults.recommendations || finalResult?.recommendations) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" />
                Trading Recommendations
              </CardTitle>
              {getStatusBadge(sections[2].status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(partialResults.recommendations?.recommendations || finalResult?.recommendations || [])
              .slice(0, 2)
              .map((rec: TradingSignal, index: number) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant={
                    rec.action === 'BUY' ? 'default' :
                    rec.action === 'SELL' ? 'destructive' : 'secondary'
                  } className="text-sm">
                    {rec.action} Signal
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {(rec.confidence * 100).toFixed(0)}% confidence
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Risk Level:</span>
                      <span className="ml-2 font-medium">{rec.riskLevel}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Time Horizon:</span>
                      <span className="ml-2 font-medium">{rec.timeHorizon}</span>
                    </div>
                  </div>
                  
                  {rec.priceTargets.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-sm font-medium">Price Targets:</span>
                      <div className="flex flex-wrap gap-2">
                        {rec.priceTargets.slice(0, 3).map((target, targetIndex) => (
                          <Badge key={targetIndex} variant="outline" className="text-xs">
                            {target.type}: ${target.level.toFixed(2)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Final Summary */}
      {finalResult && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Analysis Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap text-sm">{finalResult.summary}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}