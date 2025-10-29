'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Target,
  Shield,
  AlertTriangle,
  Info,
  DollarSign,
  BarChart3,
  Newspaper,
  Calendar
} from 'lucide-react'
import type { 
  AnalysisResult, 
  TradingSignal, 
  IndicatorResult, 
  PatternResult,
  NewsItem,
  MarketEvent
} from '@/lib/types/trading'

interface VibeTraderResultsProps {
  result: AnalysisResult
  className?: string
}

interface ConfidenceIndicatorProps {
  confidence: number
  size?: 'sm' | 'md' | 'lg'
}

interface RiskIndicatorProps {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
}

interface SignalBadgeProps {
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'BUY' | 'SELL' | 'HOLD'
}

function ConfidenceIndicator({ confidence, size = 'md' }: ConfidenceIndicatorProps) {
  const getColor = (conf: number) => {
    if (conf >= 80) return 'bg-green-500'
    if (conf >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const sizeClasses = {
    sm: 'h-2 w-16',
    md: 'h-3 w-20',
    lg: 'h-4 w-24'
  }

  return (
    <div className="flex items-center gap-2">
      <div className={cn('bg-muted rounded-full overflow-hidden', sizeClasses[size])}>
        <div 
          className={cn('h-full transition-all duration-300', getColor(confidence))}
          style={{ width: `${confidence}%` }}
        />
      </div>
      <span className="text-sm font-medium">{confidence}%</span>
    </div>
  )
}

function RiskIndicator({ riskLevel }: RiskIndicatorProps) {
  const config = {
    LOW: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: Shield },
    MEDIUM: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: AlertTriangle },
    HIGH: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: AlertTriangle }
  }

  const { color, icon: Icon } = config[riskLevel]

  return (
    <Badge variant="outline" className={cn('gap-1', color)}>
      <Icon className="h-3 w-3" />
      {riskLevel} Risk
    </Badge>
  )
}

function SignalBadge({ signal }: SignalBadgeProps) {
  const config = {
    BULLISH: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: TrendingUp },
    BUY: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: TrendingUp },
    BEARISH: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: TrendingDown },
    SELL: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: TrendingDown },
    NEUTRAL: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', icon: Minus },
    HOLD: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', icon: Minus }
  }

  const { color, icon: Icon } = config[signal]

  return (
    <Badge variant="outline" className={cn('gap-1', color)}>
      <Icon className="h-3 w-3" />
      {signal}
    </Badge>
  )
}

function TechnicalAnalysisSection({ result }: { result: AnalysisResult }) {
  const [isOpen, setIsOpen] = useState(true)
  const { technicalAnalysis } = result

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Technical Analysis</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <SignalBadge signal={technicalAnalysis.trend.direction === 'UPTREND' ? 'BULLISH' : 
                                   technicalAnalysis.trend.direction === 'DOWNTREND' ? 'BEARISH' : 'NEUTRAL'} />
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Trend Analysis */}
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Trend Analysis
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Direction:</span>
                  <div className="font-medium">{technicalAnalysis.trend.direction}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Strength:</span>
                  <ConfidenceIndicator confidence={technicalAnalysis.trend.strength} size="sm" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Key Indicators */}
            <div className="space-y-2">
              <h4 className="font-semibold">Key Indicators</h4>
              <div className="grid gap-2">
                {technicalAnalysis.indicators.slice(0, 3).map((indicator, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div>
                      <div className="font-medium">{indicator.name}</div>
                      <div className="text-sm text-muted-foreground">{indicator.interpretation}</div>
                    </div>
                    <SignalBadge signal={indicator.signal} />
                  </div>
                ))}
              </div>
            </div>

            {/* Patterns */}
            {technicalAnalysis.patterns.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-semibold">Chart Patterns</h4>
                  <div className="space-y-2">
                    {technicalAnalysis.patterns.slice(0, 2).map((pattern, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">{pattern.type.replace(/_/g, ' ')}</div>
                          <ConfidenceIndicator confidence={pattern.confidence} size="sm" />
                        </div>
                        <p className="text-sm text-muted-foreground">{pattern.description}</p>
                        {pattern.implications.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs font-medium text-muted-foreground mb-1">Implications:</div>
                            <ul className="text-xs space-y-1">
                              {pattern.implications.slice(0, 2).map((implication, i) => (
                                <li key={i} className="flex items-start gap-1">
                                  <span className="text-muted-foreground">•</span>
                                  {implication}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Support & Resistance */}
            {technicalAnalysis.supportResistance.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-semibold">Key Levels</h4>
                  <div className="grid gap-2">
                    {technicalAnalysis.supportResistance.slice(0, 4).map((level, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant={level.type === 'SUPPORT' ? 'default' : 'secondary'} className="text-xs">
                            {level.type}
                          </Badge>
                          <span className="font-mono">${level.level.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Strength:</span>
                          <ConfidenceIndicator confidence={level.confidence} size="sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

function FundamentalAnalysisSection({ result }: { result: AnalysisResult }) {
  const [isOpen, setIsOpen] = useState(true)
  const { fundamentalAnalysis } = result

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Fundamental Analysis</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn(
                  'gap-1',
                  fundamentalAnalysis.marketSentiment.overall >= 0.6 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  fundamentalAnalysis.marketSentiment.overall <= 0.4 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                )}>
                  {fundamentalAnalysis.newsAnalysis.sentiment}
                </Badge>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Company Info */}
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Info className="h-4 w-4" />
                Company Overview
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Sector:</span>
                  <div className="font-medium">{fundamentalAnalysis.companyInfo.sector}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Market Cap:</span>
                  <div className="font-medium">${(fundamentalAnalysis.companyInfo.marketCap / 1e9).toFixed(1)}B</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{fundamentalAnalysis.companyInfo.description}</p>
            </div>

            <Separator />

            {/* Financial Metrics */}
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Key Metrics
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="text-muted-foreground">P/E Ratio</div>
                  <div className="font-bold text-lg">{fundamentalAnalysis.financialMetrics.pe.toFixed(1)}</div>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="text-muted-foreground">EPS</div>
                  <div className="font-bold text-lg">${fundamentalAnalysis.financialMetrics.eps.toFixed(2)}</div>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="text-muted-foreground">Revenue Growth</div>
                  <div className="font-bold text-lg">{(fundamentalAnalysis.financialMetrics.revenueGrowth * 100).toFixed(1)}%</div>
                </div>
              </div>
            </div>

            <Separator />

            {/* News Analysis */}
            <div className="space-y-2">
              <h4 className="font-semibold">Recent News</h4>
              <div className="space-y-2">
                {fundamentalAnalysis.newsAnalysis.relevantNews.slice(0, 3).map((news, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h5 className="font-medium text-sm line-clamp-2">{news.title}</h5>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{news.summary}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(news.publishedAt).toLocaleDateString()}
                          </span>
                          <Badge variant="outline" className={cn(
                            'text-xs',
                            news.sentiment > 0.6 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            news.sentiment < 0.4 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                          )}>
                            {news.sentiment > 0.6 ? 'Positive' : news.sentiment < 0.4 ? 'Negative' : 'Neutral'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Events */}
            {fundamentalAnalysis.upcomingEvents.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Upcoming Events
                  </h4>
                  <div className="space-y-2">
                    {fundamentalAnalysis.upcomingEvents.slice(0, 3).map((event, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div>
                          <div className="font-medium text-sm">{event.description}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(event.date).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge variant="outline" className={cn(
                          'text-xs',
                          event.expectedImpact === 'HIGH' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          event.expectedImpact === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        )}>
                          {event.expectedImpact}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

function RecommendationsSection({ result }: { result: AnalysisResult }) {
  const [isOpen, setIsOpen] = useState(true)
  const { recommendations } = result

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Trading Recommendations</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <ConfidenceIndicator confidence={result.confidence} size="sm" />
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {recommendations.map((rec, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SignalBadge signal={rec.action} />
                    <span className="font-semibold">{rec.action} Signal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RiskIndicator riskLevel={rec.riskLevel} />
                    <ConfidenceIndicator confidence={rec.confidence} size="sm" />
                  </div>
                </div>

                {/* Price Targets */}
                <div className="space-y-2">
                  <h5 className="font-medium text-sm">Price Targets</h5>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    {rec.priceTargets.map((target, i) => (
                      <div key={i} className="text-center p-2 bg-muted/50 rounded">
                        <div className="text-muted-foreground text-xs">{target.type.replace('_', ' ')}</div>
                        <div className="font-bold">${target.level.toFixed(2)}</div>
                      </div>
                    ))}
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <div className="text-muted-foreground text-xs">STOP LOSS</div>
                      <div className="font-bold">${rec.stopLoss.toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                {/* Reasoning */}
                <div className="space-y-2">
                  <h5 className="font-medium text-sm">Analysis</h5>
                  <ul className="text-sm space-y-1">
                    {rec.reasoning.slice(0, 3).map((reason, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-muted-foreground mt-1">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Time Horizon: {rec.timeHorizon}</span>
                  <span>Risk Level: {rec.riskLevel}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

export function VibeTraderResults({ result, className }: VibeTraderResultsProps) {
  return (
    <div className={cn('w-full max-w-4xl mx-auto space-y-6', className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Analysis Results for {result.symbol}</h2>
        </div>
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <span>Generated: {new Date(result.timestamp).toLocaleString()}</span>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-2">
            <span>Overall Confidence:</span>
            <ConfidenceIndicator confidence={result.confidence} size="sm" />
          </div>
        </div>
      </div>

      {/* Summary */}
      {result.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{result.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Analysis Sections */}
      <div className="space-y-4">
        <TechnicalAnalysisSection result={result} />
        <FundamentalAnalysisSection result={result} />
        <RecommendationsSection result={result} />
      </div>
    </div>
  )
}