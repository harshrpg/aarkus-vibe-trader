'use client'

import { useEffect, useState } from 'react'
import { SymbolSelect } from '@/components/symbol-select'
import { Input } from '@/components/ui/input'
import { VibeTraderStreamingChart } from '@/components/vibe-trader-streaming-chart'
import { VibeTraderResults } from '@/components/vibe-trader-results'
import { useVibeTraderStream } from '@/hooks/use-vibe-trader-stream'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import dynamic from 'next/dynamic'
import { useAppDispatch } from '@/lib/store/hooks'
import { set as setAdvancedMode } from '@/features/advanced-mode/advancedModeSlice'
import { setSymbol as tvSetSymbol, ready as chartReady } from '@/lib/tv/bridge'
import {
  Activity,
  BarChart3,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react'

const TradingViewWrapper = dynamic(() => import('@/components/tv/trading-view-wrapper'), {
  ssr: false,
})

export default function VibeTraderTestPage() {
  const [currentSymbol, setCurrentSymbol] = useState<string>('')
  const [selectedSymbol, setSelectedSymbol] = useState<string>('')
  const [requestText, setRequestText] = useState<string>('')
  const [currentRequest, setCurrentRequest] = useState<string>('')
  const dispatch = useAppDispatch()
  const [analysisHistory, setAnalysisHistory] = useState<Array<{
    symbol: string
    query: string
    timestamp: Date
    status: 'running' | 'completed' | 'error'
  }>>([])

  const {
    streamState,
    startStream,
    stopStream,
    restartStream,
    isStreaming,
    currentStage,
    progress,
    error,
    partialResults,
    finalResult,
    lastUpdate
  } = useVibeTraderStream({
    onComplete: (result) => {
      console.log('Analysis complete:', result)
      setAnalysisHistory(prev => prev.map(item =>
        item.symbol === result.symbol && item.status === 'running'
          ? { ...item, status: 'completed' }
          : item
      ))
    },
    onError: (error) => {
      console.error('Analysis error:', error)
      setAnalysisHistory(prev => prev.map(item =>
        item.status === 'running'
          ? { ...item, status: 'error' }
          : item
      ))
    },
    onStatusUpdate: (status) => {
      console.log('Status update:', status)
    },
    onChunkReceived: (chunk) => {
      console.log('Chunk received:', chunk.type, chunk.data)
    }
  })

  // Keep TradingView chart and global state in sync with symbol selection
  useEffect(() => {
    const syncChart = async () => {
      if (!selectedSymbol) return
      // Update global advancedMode symbol (used by main app chart)
      dispatch(setAdvancedMode({ value: true, symbol: selectedSymbol }))
      // Update current TradingView widget symbol immediately
      try {
        await chartReady
        await tvSetSymbol(selectedSymbol, '1D')
      } catch (e) {
        console.error('Failed to set chart symbol:', e)
      }
    }
    syncChart()
  }, [selectedSymbol, dispatch])

  const handleAnalysisRequest = async (symbol: string, query: string) => {
    const tvSymbol = symbol
    const apiSymbol = symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    console.log('Starting analysis for:', tvSymbol, query)
    setCurrentSymbol(tvSymbol)
    setCurrentRequest(query)

    // Add to history
    setAnalysisHistory(prev => [...prev, {
      symbol,
      query,
      timestamp: new Date(),
      status: 'running'
    }])

    // Chart component will trigger streaming; we keep history updates here
  }

  const handleStopAnalysis = () => {
    stopStream()
    setAnalysisHistory(prev => prev.map(item =>
      item.status === 'running'
        ? { ...item, status: 'error' }
        : item
    ))
  }

  const handleRestartAnalysis = async () => {
    if (currentSymbol) {
      await restartStream(currentSymbol, '1D', `Analyze ${currentSymbol} for trading opportunities`)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <div className="mx-auto p-4 max-w-7xl min-h-screen h-screen overflow-y-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <TrendingUp className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Vibe Trader Test Interface</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Test the AI-powered trading analysis system with real-time streaming
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column - Symbol + Request (reusing home SymbolSelect) */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vibe Trader Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Trading Symbol</label>
                <SymbolSelect
                  value={selectedSymbol}
                  onChange={setSelectedSymbol}
                  disabled={isStreaming}
                  placeholder="Select symbol"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="vibe-request" className="text-sm font-medium">Analysis Request</label>
                <Input
                  id="vibe-request"
                  placeholder="What would you like to analyze? (e.g., technical analysis, price targets, market sentiment)"
                  value={requestText}
                  onChange={(e) => setRequestText(e.target.value)}
                  disabled={isStreaming}
                />
              </div>

              <Button
                className="w-full"
                disabled={isStreaming || !selectedSymbol || !requestText.trim()}
                onClick={() => handleAnalysisRequest(selectedSymbol, requestText.trim())}
              >
                Analyze Symbol
              </Button>
            </CardContent>
          </Card>

          {/* Analysis History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Analysis History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysisHistory.length === 0 ? (
                <p className="text-muted-foreground text-sm">No analyses yet</p>
              ) : (
                <div className="space-y-2">
                  {analysisHistory.slice(-5).reverse().map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        <div>
                          <div className="font-medium text-sm">{item.symbol}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Middle Column - Chart and Controls */}
        <div className="lg:col-span-2 space-y-4">
          {/* TradingView Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Chart</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full" style={{ height: 480 }}>
                <TradingViewWrapper />
              </div>
            </CardContent>
          </Card>
          {/* Control Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Analysis Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={handleStopAnalysis}
                  disabled={!isStreaming}
                  variant="outline"
                  size="sm"
                >
                  Stop Analysis
                </Button>
                <Button
                  onClick={handleRestartAnalysis}
                  disabled={!currentSymbol || isStreaming}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Restart
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Current Symbol:</span>
                  <Badge variant="outline">{currentSymbol || 'None'}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Status:</span>
                  <Badge variant={isStreaming ? 'default' : 'secondary'}>
                    {isStreaming ? 'Streaming' : 'Idle'}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Stage:</span>
                  <span className="font-medium capitalize">{currentStage.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Progress:</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                {lastUpdate && (
                  <div className="flex justify-between text-sm">
                    <span>Last Update:</span>
                    <span className="font-medium">{lastUpdate.toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Streaming Chart Status & Live Updates */}
          {currentSymbol && (
            <VibeTraderStreamingChart
              symbol={currentSymbol}
              query={currentRequest}
              onChartReady={() => console.log('Chart ready for', currentSymbol)}
              onError={(error) => console.error('Chart error:', error)}
              onComplete={() => {
                setAnalysisHistory(prev => prev.map(item =>
                  item.symbol === currentSymbol && item.status === 'running'
                    ? { ...item, status: 'completed' }
                    : item
                ))
              }}
            />
          )}
        </div>

        {/* Right Column - Debug Info and Partial Results */}
        {/* <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Debug Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm space-y-1">
                <div><strong>Stream State:</strong> {JSON.stringify({
                  isStreaming,
                  currentStage,
                  progress,
                  hasError: !!error
                }, null, 2)}</div>

                {error && (
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                    <strong className="text-red-600 dark:text-red-400">Error:</strong>
                    <div className="text-red-600 dark:text-red-400 text-xs mt-1">{error}</div>
                  </div>
                )}

                {partialResults.technical && (
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                    <strong className="text-blue-600 dark:text-blue-400">Technical Analysis:</strong>
                    <div className="text-xs mt-1">
                      Indicators: {partialResults.technical.indicators?.length || 0}<br />
                      Patterns: {partialResults.technical.patterns?.length || 0}<br />
                      S/R Levels: {partialResults.technical.supportResistance?.length || 0}
                    </div>
                  </div>
                )}

                {partialResults.fundamental && (
                  <div className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                    <strong className="text-green-600 dark:text-green-400">Fundamental Analysis:</strong>
                    <div className="text-xs mt-1">
                      News: {partialResults.fundamental.newsAnalysis?.relevantNews?.length || 0}<br />
                      Events: {partialResults.fundamental.upcomingEvents?.length || 0}
                    </div>
                  </div>
                )}

                {partialResults.recommendations && (
                  <div className="p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded">
                    <strong className="text-orange-600 dark:text-orange-400">Recommendations:</strong>
                    <div className="text-xs mt-1">
                      Signals: {partialResults.recommendations.recommendations?.length || 0}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Console Output</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs bg-gray-900 text-green-400 p-3 rounded font-mono h-32 overflow-y-auto">
                <div>Vibe Trader Test Interface Ready</div>
                <div>Open browser console (F12) for detailed logs</div>
                <div>API Endpoint: /api/vibe-trader</div>
                <div>Streaming: {isStreaming ? 'Active' : 'Inactive'}</div>
                {currentSymbol && <div>Current Symbol: {currentSymbol}</div>}
                {error && <div className="text-red-400">ERROR: {error}</div>}
              </div>
            </CardContent>
          </Card>
        </div> */}
      </div>

      {/* Results Section (Full Width) */}
      {finalResult && (
        <div className="w-full">
          <Separator className="my-6" />
          <VibeTraderResults result={finalResult} />
        </div>
      )}
    </div>
  )
}