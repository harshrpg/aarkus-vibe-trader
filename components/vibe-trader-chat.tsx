'use client'

import { useState, useCallback, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Search, TrendingUp, AlertCircle } from 'lucide-react'

interface VibeTraderChatProps {
  onAnalysisRequest: (symbol: string, query: string) => void
  isLoading?: boolean
  className?: string
}

interface SymbolSuggestion {
  symbol: string
  name: string
  type: 'stock' | 'crypto' | 'forex' | 'commodity'
}

// Popular trading symbols for suggestions
const POPULAR_SYMBOLS: SymbolSuggestion[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'stock' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'stock' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock' },
  { symbol: 'BTCUSD', name: 'Bitcoin', type: 'crypto' },
  { symbol: 'ETHUSD', name: 'Ethereum', type: 'crypto' },
  { symbol: 'EURUSD', name: 'Euro/USD', type: 'forex' },
  { symbol: 'GBPUSD', name: 'GBP/USD', type: 'forex' },
  { symbol: 'XAUUSD', name: 'Gold', type: 'commodity' }
]

const ANALYSIS_TEMPLATES = [
  'Analyze {symbol} for swing trading opportunities',
  'What are the key support and resistance levels for {symbol}?',
  'Provide technical and fundamental analysis for {symbol}',
  'Is {symbol} a good buy right now?',
  'What are the price targets for {symbol}?'
]

export function VibeTraderChat({ 
  onAnalysisRequest, 
  isLoading = false, 
  className 
}: VibeTraderChatProps) {
  const [input, setInput] = useState('')
  const [symbolInput, setSymbolInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Filter symbols based on input
  const filteredSuggestions = useMemo(() => {
    if (!symbolInput.trim()) return POPULAR_SYMBOLS.slice(0, 6)
    
    const query = symbolInput.toUpperCase()
    return POPULAR_SYMBOLS.filter(
      suggestion => 
        suggestion.symbol.includes(query) || 
        suggestion.name.toUpperCase().includes(query)
    ).slice(0, 6)
  }, [symbolInput])

  // Validate symbol format
  const validateSymbol = useCallback((symbol: string): boolean => {
    if (!symbol.trim()) {
      setValidationError('Please enter a trading symbol')
      return false
    }
    
    // Basic symbol validation - alphanumeric, 1-10 characters
    const symbolRegex = /^[A-Z0-9]{1,10}$/
    if (!symbolRegex.test(symbol.toUpperCase())) {
      setValidationError('Symbol should be 1-10 alphanumeric characters (e.g., AAPL, BTCUSD)')
      return false
    }
    
    setValidationError(null)
    return true
  }, [])

  const handleSymbolSelect = useCallback((suggestion: SymbolSuggestion) => {
    setSymbolInput(suggestion.symbol)
    setShowSuggestions(false)
    setValidationError(null)
    
    // Auto-populate with a template if input is empty
    if (!input.trim()) {
      setInput(ANALYSIS_TEMPLATES[0].replace('{symbol}', suggestion.symbol))
    }
  }, [input])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    
    const symbol = symbolInput.toUpperCase().trim()
    const query = input.trim()
    
    if (!validateSymbol(symbol)) return
    
    if (!query) {
      setValidationError('Please enter your analysis request')
      return
    }
    
    onAnalysisRequest(symbol, query)
    setInput('')
    setSymbolInput('')
    setShowSuggestions(false)
  }, [symbolInput, input, validateSymbol, onAnalysisRequest])

  const handleTemplateSelect = useCallback((template: string) => {
    const symbol = symbolInput.toUpperCase().trim()
    if (symbol) {
      setInput(template.replace('{symbol}', symbol))
    } else {
      setInput(template)
    }
  }, [symbolInput])

  const getSymbolTypeColor = (type: SymbolSuggestion['type']) => {
    switch (type) {
      case 'stock': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'crypto': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'forex': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'commodity': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <div className={cn('w-full max-w-4xl mx-auto space-y-4', className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Vibe Trader Analysis</h2>
        </div>
        <p className="text-muted-foreground">
          Get AI-powered technical and fundamental analysis for any trading symbol
        </p>
      </div>

      {/* Main Input Form */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Symbol Input */}
            <div className="space-y-2">
              <label htmlFor="symbol" className="text-sm font-medium">
                Trading Symbol
              </label>
              <div className="relative">
                <Input
                  id="symbol"
                  placeholder="Enter symbol (e.g., AAPL, BTCUSD)"
                  value={symbolInput}
                  onChange={(e) => {
                    setSymbolInput(e.target.value.toUpperCase())
                    setShowSuggestions(true)
                    setValidationError(null)
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className={cn(
                    validationError && 'border-red-500 focus-visible:ring-red-500'
                  )}
                  disabled={isLoading}
                />
                
                {/* Symbol Suggestions */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.symbol}
                        type="button"
                        onClick={() => handleSymbolSelect(suggestion)}
                        className="w-full px-3 py-2 text-left hover:bg-muted flex items-center justify-between group"
                      >
                        <div>
                          <div className="font-medium">{suggestion.symbol}</div>
                          <div className="text-sm text-muted-foreground">
                            {suggestion.name}
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={cn('text-xs', getSymbolTypeColor(suggestion.type))}
                        >
                          {suggestion.type}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Analysis Query Input */}
            <div className="space-y-2">
              <label htmlFor="query" className="text-sm font-medium">
                Analysis Request
              </label>
              <Input
                id="query"
                placeholder="What would you like to analyze? (e.g., technical analysis, price targets, market sentiment)"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  setValidationError(null)
                }}
                className={cn(
                  validationError && 'border-red-500 focus-visible:ring-red-500'
                )}
                disabled={isLoading}
              />
            </div>

            {/* Validation Error */}
            {validationError && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                {validationError}
              </div>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Analyze Symbol
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Quick Templates */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Quick Analysis Templates
        </h3>
        <div className="flex flex-wrap gap-2">
          {ANALYSIS_TEMPLATES.map((template, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => handleTemplateSelect(template)}
              disabled={isLoading}
              className="text-xs"
            >
              {template.replace('{symbol}', symbolInput || 'SYMBOL')}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}