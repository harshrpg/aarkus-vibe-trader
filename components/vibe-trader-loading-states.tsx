'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { 
  TrendingUp, 
  BarChart3, 
  Newspaper, 
  Target, 
  AlertCircle, 
  RefreshCw,
  Clock,
  Wifi,
  WifiOff,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react'

interface VibeTraderLoadingProps {
  stage?: 'initializing' | 'technical' | 'fundamental' | 'synthesis' | 'complete'
  progress?: number
  symbol?: string
  timeoutSeconds?: number
  onTimeout?: () => void
  onCancel?: () => void
  className?: string
}

interface VibeTraderErrorProps {
  error: {
    type: 'INVALID_SYMBOL' | 'DATA_UNAVAILABLE' | 'CHART_ERROR' | 'SEARCH_ERROR' | 'ANALYSIS_TIMEOUT' | 'NETWORK_ERROR' | 'UNKNOWN'
    message: string
    recoverable?: boolean
    suggestedAction?: string
    details?: string
  }
  symbol?: string
  onRetry?: () => void
  onGoBack?: () => void
  onReportIssue?: () => void
  className?: string
}

interface AnalysisStage {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  estimatedTime: number
}

const ANALYSIS_STAGES: AnalysisStage[] = [
  {
    id: 'initializing',
    name: 'Initializing',
    description: 'Setting up analysis environment',
    icon: Clock,
    estimatedTime: 2
  },
  {
    id: 'technical',
    name: 'Technical Analysis',
    description: 'Analyzing price patterns and indicators',
    icon: BarChart3,
    estimatedTime: 8
  },
  {
    id: 'fundamental',
    name: 'Fundamental Research',
    description: 'Gathering market news and company data',
    icon: Newspaper,
    estimatedTime: 12
  },
  {
    id: 'synthesis',
    name: 'Generating Recommendations',
    description: 'Combining analysis into trading signals',
    icon: Target,
    estimatedTime: 5
  },
  {
    id: 'complete',
    name: 'Complete',
    description: 'Analysis ready',
    icon: CheckCircle,
    estimatedTime: 0
  }
]

export function VibeTraderLoading({ 
  stage = 'initializing',
  progress = 0,
  symbol,
  timeoutSeconds = 30,
  onTimeout,
  onCancel,
  className 
}: VibeTraderLoadingProps) {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isTimedOut, setIsTimedOut] = useState(false)

  const currentStageIndex = ANALYSIS_STAGES.findIndex(s => s.id === stage)
  const currentStage = ANALYSIS_STAGES[currentStageIndex] || ANALYSIS_STAGES[0]

  // Timer for elapsed time and timeout
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(prev => {
        const newTime = prev + 1
        if (newTime >= timeoutSeconds && !isTimedOut) {
          setIsTimedOut(true)
          onTimeout?.()
        }
        return newTime
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [timeoutSeconds, isTimedOut, onTimeout])

  // Calculate overall progress
  const overallProgress = currentStageIndex >= 0 
    ? ((currentStageIndex / (ANALYSIS_STAGES.length - 1)) * 100) + (progress / ANALYSIS_STAGES.length)
    : progress

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  const getEstimatedTimeRemaining = () => {
    const remainingStages = ANALYSIS_STAGES.slice(currentStageIndex + 1)
    const remainingTime = remainingStages.reduce((total, stage) => total + stage.estimatedTime, 0)
    const currentStageRemaining = currentStage.estimatedTime * (1 - progress / 100)
    return Math.max(0, Math.ceil(remainingTime + currentStageRemaining))
  }

  return (
    <div className={cn('w-full max-w-4xl mx-auto space-y-6', className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary animate-pulse" />
          <h2 className="text-2xl font-bold">
            Analyzing {symbol || 'Symbol'}
          </h2>
        </div>
        <p className="text-muted-foreground">
          AI-powered technical and fundamental analysis in progress
        </p>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Analysis Progress</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{formatTime(elapsedTime)}</span>
              {!isTimedOut && (
                <>
                  <span>•</span>
                  <span>~{getEstimatedTimeRemaining()}s remaining</span>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Overall Progress</span>
              <span>{Math.round(overallProgress)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>

          {/* Current Stage */}
          <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <currentStage.icon className="h-5 w-5 text-primary animate-pulse" />
            <div className="flex-1">
              <div className="font-medium">{currentStage.name}</div>
              <div className="text-sm text-muted-foreground">{currentStage.description}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">{Math.round(progress)}%</div>
              <div className="text-xs text-muted-foreground">
                {currentStage.estimatedTime > 0 && `~${currentStage.estimatedTime}s`}
              </div>
            </div>
          </div>

          {/* Stage List */}
          <div className="space-y-2">
            {ANALYSIS_STAGES.map((stageItem, index) => {
              const isCompleted = index < currentStageIndex
              const isCurrent = index === currentStageIndex
              const isPending = index > currentStageIndex

              return (
                <div 
                  key={stageItem.id}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded transition-colors',
                    isCurrent && 'bg-muted/50',
                    isCompleted && 'opacity-60'
                  )}
                >
                  <div className={cn(
                    'flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium',
                    isCompleted && 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                    isCurrent && 'bg-primary text-primary-foreground',
                    isPending && 'bg-muted text-muted-foreground'
                  )}>
                    {isCompleted ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={cn(
                      'text-sm font-medium',
                      isCompleted && 'line-through',
                      isPending && 'text-muted-foreground'
                    )}>
                      {stageItem.name}
                    </div>
                  </div>
                  {isCurrent && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Timeout Warning */}
          {isTimedOut && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <div className="flex-1 text-sm">
                <div className="font-medium text-yellow-800 dark:text-yellow-200">
                  Analysis is taking longer than expected
                </div>
                <div className="text-yellow-600 dark:text-yellow-400">
                  This may be due to high market volatility or data availability issues
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {onCancel && (
              <Button variant="outline" onClick={onCancel} size="sm">
                Cancel Analysis
              </Button>
            )}
            {isTimedOut && onTimeout && (
              <Button variant="default" onClick={onTimeout} size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Analysis
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading Skeletons */}
      <div className="grid gap-4 md:grid-cols-2">
        <AnalysisLoadingSkeleton title="Technical Analysis" icon={BarChart3} />
        <AnalysisLoadingSkeleton title="Fundamental Research" icon={Newspaper} />
      </div>
    </div>
  )
}

function AnalysisLoadingSkeleton({ 
  title, 
  icon: Icon 
}: { 
  title: string
  icon: React.ComponentType<{ className?: string }> 
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Separator />
        <div className="space-y-2">
          <Skeleton className="h-6 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-14" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function VibeTraderError({ 
  error,
  symbol,
  onRetry,
  onGoBack,
  onReportIssue,
  className 
}: VibeTraderErrorProps) {
  const getErrorIcon = () => {
    switch (error.type) {
      case 'INVALID_SYMBOL':
        return AlertCircle
      case 'DATA_UNAVAILABLE':
        return WifiOff
      case 'CHART_ERROR':
        return BarChart3
      case 'SEARCH_ERROR':
        return Newspaper
      case 'ANALYSIS_TIMEOUT':
        return Clock
      case 'NETWORK_ERROR':
        return Wifi
      default:
        return XCircle
    }
  }

  const getErrorColor = () => {
    if (error.recoverable) {
      return 'text-yellow-600 dark:text-yellow-400'
    }
    return 'text-red-600 dark:text-red-400'
  }

  const getErrorBgColor = () => {
    if (error.recoverable) {
      return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
    }
    return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
  }

  const getErrorTitle = () => {
    switch (error.type) {
      case 'INVALID_SYMBOL':
        return 'Invalid Trading Symbol'
      case 'DATA_UNAVAILABLE':
        return 'Market Data Unavailable'
      case 'CHART_ERROR':
        return 'Chart Loading Error'
      case 'SEARCH_ERROR':
        return 'Market Research Error'
      case 'ANALYSIS_TIMEOUT':
        return 'Analysis Timeout'
      case 'NETWORK_ERROR':
        return 'Network Connection Error'
      default:
        return 'Analysis Error'
    }
  }

  const getSuggestedActions = () => {
    const actions = []
    
    if (error.suggestedAction) {
      actions.push(error.suggestedAction)
    }

    switch (error.type) {
      case 'INVALID_SYMBOL':
        actions.push('Check the symbol spelling and try again')
        actions.push('Use popular symbols like AAPL, TSLA, or BTCUSD')
        break
      case 'DATA_UNAVAILABLE':
        actions.push('Try a different symbol or timeframe')
        actions.push('Check if markets are currently open')
        break
      case 'CHART_ERROR':
        actions.push('Refresh the page and try again')
        actions.push('Check your internet connection')
        break
      case 'SEARCH_ERROR':
        actions.push('Analysis may continue with technical data only')
        actions.push('Try again in a few minutes')
        break
      case 'ANALYSIS_TIMEOUT':
        actions.push('Try again with a simpler analysis request')
        actions.push('Check your internet connection')
        break
      case 'NETWORK_ERROR':
        actions.push('Check your internet connection')
        actions.push('Try again in a few moments')
        break
    }

    return actions
  }

  const ErrorIcon = getErrorIcon()

  return (
    <div className={cn('w-full max-w-4xl mx-auto space-y-6', className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <ErrorIcon className={cn('h-6 w-6', getErrorColor())} />
          <h2 className="text-2xl font-bold">
            {getErrorTitle()}
          </h2>
        </div>
        {symbol && (
          <p className="text-muted-foreground">
            Failed to analyze {symbol}
          </p>
        )}
      </div>

      {/* Error Details */}
      <Card>
        <CardContent className="p-6">
          <div className={cn('p-4 rounded-lg border', getErrorBgColor())}>
            <div className="flex items-start gap-3">
              <ErrorIcon className={cn('h-5 w-5 mt-0.5', getErrorColor())} />
              <div className="flex-1 space-y-2">
                <div className={cn('font-medium', getErrorColor())}>
                  {error.message}
                </div>
                {error.details && (
                  <div className="text-sm text-muted-foreground">
                    {error.details}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suggested Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5" />
            What you can do
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {getSuggestedActions().map((action, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className="text-muted-foreground mt-1">•</span>
              <span className="text-sm">{action}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-3">
        {onGoBack && (
          <Button variant="outline" onClick={onGoBack}>
            Go Back
          </Button>
        )}
        {onRetry && error.recoverable && (
          <Button onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
        {onReportIssue && (
          <Button variant="outline" onClick={onReportIssue}>
            Report Issue
          </Button>
        )}
      </div>

      {/* Error Code */}
      <div className="text-center">
        <Badge variant="outline" className="text-xs">
          Error Code: {error.type}
        </Badge>
      </div>
    </div>
  )
}

// Partial Results Component for when analysis partially completes
export function VibeTraderPartialResults({ 
  completedStages,
  failedStages,
  partialData,
  onContinue,
  onRetry,
  className 
}: {
  completedStages: string[]
  failedStages: string[]
  partialData?: any
  onContinue?: () => void
  onRetry?: () => void
  className?: string
}) {
  return (
    <div className={cn('w-full max-w-4xl mx-auto space-y-6', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            Partial Analysis Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="text-sm">
              <div className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                Analysis partially completed
              </div>
              <div className="text-yellow-600 dark:text-yellow-400">
                Some components failed, but we have partial results available.
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium text-green-600 dark:text-green-400 mb-2">
                Completed ({completedStages.length})
              </h4>
              <ul className="space-y-1">
                {completedStages.map((stage, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    {stage}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-red-600 dark:text-red-400 mb-2">
                Failed ({failedStages.length})
              </h4>
              <ul className="space-y-1">
                {failedStages.map((stage, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <XCircle className="h-3 w-3 text-red-600" />
                    {stage}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-4">
            {onContinue && (
              <Button onClick={onContinue}>
                View Partial Results
              </Button>
            )}
            {onRetry && (
              <Button variant="outline" onClick={onRetry}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Failed Components
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}