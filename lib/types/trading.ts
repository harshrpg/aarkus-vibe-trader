// Trading Analysis Types

export interface PriceData {
    symbol: string
    timeframe: string
    data: OHLCV[]
    volume: number[]
    timestamp: Date[]
}

export interface OHLCV {
    open: number
    high: number
    low: number
    close: number
    volume: number
    timestamp: Date
}

export interface IndicatorResult {
    name: string
    values: number[]
    parameters: Record<string, any>
    interpretation: string
    signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
}

export interface PatternResult {
    type: PatternType
    confidence: number
    coordinates: ChartCoordinate[]
    description: string
    implications: string[]
    priceTargets: PriceTarget[]
}

export interface SupportResistanceLevel {
    level: number
    type: 'SUPPORT' | 'RESISTANCE'
    strength: number
    touches: number
    volume: number
    confidence: number
}

export interface TrendAnalysis {
    direction: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS'
    strength: number
    duration: number
    slope: number
}

export interface MomentumAnalysis {
    rsi: number
    macd: {
        macd: number
        signal: number
        histogram: number
    }
    stochastic: {
        k: number
        d: number
    }
    interpretation: string
}

export interface VolatilityAnalysis {
    atr: number
    bollingerBands: {
        upper: number
        middle: number
        lower: number
        squeeze: boolean
    }
    volatilityRank: number
}

export interface TechnicalAnalysisResult {
    indicators: IndicatorResult[]
    patterns: PatternResult[]
    supportResistance: SupportResistanceLevel[]
    trend: TrendAnalysis
    momentum: MomentumAnalysis
    volatility: VolatilityAnalysis
}

export interface PriceTarget {
    level: number
    type: 'ENTRY' | 'TARGET' | 'STOP_LOSS'
    confidence: number
    reasoning: string
}

export interface ChartCoordinate {
    x: number
    y: number
    timestamp?: Date
}

export interface ChartAnnotation {
    type: 'LINE' | 'SHAPE' | 'TEXT' | 'INDICATOR'
    coordinates: ChartCoordinate[]
    style: StyleConfig
    label?: string
    description?: string
}

export interface StyleConfig {
    color: string
    lineWidth?: number
    lineStyle?: 'solid' | 'dashed' | 'dotted'
    fillColor?: string
    opacity?: number
}

export type PatternType =
    | 'ASCENDING_TRIANGLE'
    | 'DESCENDING_TRIANGLE'
    | 'SYMMETRICAL_TRIANGLE'
    | 'HEAD_AND_SHOULDERS'
    | 'INVERSE_HEAD_AND_SHOULDERS'
    | 'DOUBLE_TOP'
    | 'DOUBLE_BOTTOM'
    | 'CHANNEL_UP'
    | 'CHANNEL_DOWN'
    | 'WEDGE_RISING'
    | 'WEDGE_FALLING'
    | 'FLAG'
    | 'PENNANT'

export interface TradingSignal {
    action: 'BUY' | 'SELL' | 'HOLD'
    confidence: number
    reasoning: string[]
    priceTargets: PriceTarget[]
    stopLoss: number
    timeHorizon: string
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
}

export interface IndicatorConfig {
    name: string
    parameters: Record<string, any>
    visible: boolean
    style?: StyleConfig
}

export interface TrendLine {
    startPoint: ChartCoordinate
    endPoint: ChartCoordinate
    slope: number
    strength: number
    type: 'SUPPORT' | 'RESISTANCE' | 'TREND'
}

export interface Formation {
    type: PatternType
    points: ChartCoordinate[]
    confidence: number
    breakoutTarget: number
    invalidationLevel: number
}

// Fundamental Analysis Types
export interface FundamentalAnalysisResult {
    companyInfo: CompanyInfo
    financialMetrics: FinancialMetrics
    newsAnalysis: NewsAnalysis
    sectorAnalysis: SectorAnalysis
    marketSentiment: SentimentScore
    upcomingEvents: MarketEvent[]
}

export interface CompanyInfo {
    name: string
    sector: string
    industry: string
    marketCap: number
    description: string
}

export interface FinancialMetrics {
    pe: number
    eps: number
    revenue: number
    revenueGrowth: number
    profitMargin: number
    debtToEquity: number
}

export interface NewsAnalysis {
    sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
    relevantNews: NewsItem[]
    sentimentScore: number
    keyThemes: string[]
}

export interface NewsItem {
    title: string
    summary: string
    url: string
    publishedAt: Date
    sentiment: number
    relevance: number
}

export interface SectorAnalysis {
    sectorPerformance: number
    relativeStrength: number
    peerComparison: string[]
    sectorTrends: string[]
}

export interface SentimentScore {
    overall: number
    news: number
    social: number
    analyst: number
}

export interface MarketEvent {
    type: 'EARNINGS' | 'ECONOMIC_DATA' | 'FED_MEETING' | 'DIVIDEND' | 'OTHER'
    date: Date
    description: string
    expectedImpact: 'HIGH' | 'MEDIUM' | 'LOW'
}

// Analysis Controller Types
export interface AnalysisResult {
    symbol: string
    timestamp: Date
    technicalAnalysis: TechnicalAnalysisResult
    fundamentalAnalysis: FundamentalAnalysisResult
    recommendations: TradingSignal[]
    confidence: number
    chartAnnotations: ChartAnnotation[]
    summary: string
}

export interface AnalysisContext {
    symbol: string
    timeframe: string
    lastAnalysis?: AnalysisResult
    conversationHistory: any[]
}

export interface AnalysisParameters {
    timeframe?: string
    includePatterns?: boolean
    includeFundamentals?: boolean
    riskTolerance?: 'LOW' | 'MEDIUM' | 'HIGH'
}

export enum AnalysisErrorType {
    INVALID_SYMBOL = 'INVALID_SYMBOL',
    DATA_UNAVAILABLE = 'DATA_UNAVAILABLE',
    CHART_ERROR = 'CHART_ERROR',
    SEARCH_ERROR = 'SEARCH_ERROR',
    ANALYSIS_TIMEOUT = 'ANALYSIS_TIMEOUT'
}

export class AnalysisError extends Error {
    constructor(
        public type: AnalysisErrorType,
        message: string,
        public recoverable: boolean = false,
        public suggestedAction?: string
    ) {
        super(message)
        this.name = 'AnalysisError'
    }
}

// Economic Context Types
export interface EconomicContext {
    sectorPerformance: string
    economicIndicators: string[]
    marketEvents: MarketEvent[]
    overallContext: string
}

// Streaming Types
export type AnalysisStreamChunkType =
    | 'status'
    | 'technical_partial'
    | 'fundamental_partial'
    | 'recommendations_partial'
    | 'chart_update'
    | 'complete'
    | 'error'

export interface AnalysisStreamChunk {
    type: AnalysisStreamChunkType
    data: any
    timestamp?: Date
}

export interface AnalysisStatusChunk {
    stage: 'initializing' | 'technical_analysis' | 'fundamental_analysis' | 'synthesis' | 'complete'
    message: string
    progress: number
    timestamp: Date
}

export interface TechnicalPartialChunk {
    indicators?: IndicatorResult[]
    patterns?: PatternResult[]
    supportResistance?: SupportResistanceLevel[]
    timestamp: Date
}

export interface FundamentalPartialChunk {
    newsAnalysis?: NewsAnalysis
    marketSentiment?: SentimentScore
    upcomingEvents?: MarketEvent[]
    timestamp: Date
}

export interface RecommendationsPartialChunk {
    recommendations: TradingSignal[]
    confidence: number
    chartAnnotations: ChartAnnotation[]
    timestamp: Date
}

export interface ChartUpdateChunk {
    annotations: ChartAnnotation[]
    indicators: IndicatorConfig[]
    priceTargets: PriceTarget[]
    timestamp: Date
}

export interface AnalysisErrorChunk {
    type: AnalysisErrorType
    message: string
    recoverable: boolean
    suggestedAction?: string
    context?: any
    timestamp: Date
}

// Multi-Timeframe Analysis Types
export interface TimeframeAnalysis {
    timeframe: string
    analysis: TechnicalAnalysisResult
    signals: TradingSignal[]
    weight: number
    confidence: number
}

export interface MultiTimeframeResult {
    symbol: string
    primaryTimeframe: string
    timeframeAnalyses: TimeframeAnalysis[]
    confluenceSignals: TradingSignal[]
    overallConfidence: number
    timeframeCorrelation: TimeframeCorrelation
    riskAssessment: MultiTimeframeRiskAssessment
}

export interface TimeframeCorrelation {
    trendAlignment: number // 0-1, how aligned trends are across timeframes
    momentumAlignment: number // 0-1, how aligned momentum is across timeframes
    supportResistanceAlignment: number // 0-1, how aligned key levels are
    conflictingSignals: string[] // List of conflicting signals between timeframes
}

export interface MultiTimeframeRiskAssessment {
    overallRisk: 'LOW' | 'MEDIUM' | 'HIGH'
    timeframeRisks: Record<string, 'LOW' | 'MEDIUM' | 'HIGH'>
    riskFactors: string[]
    recommendedPosition: 'LONG' | 'SHORT' | 'NEUTRAL'
    positionSize: number // 0-1, recommended position size based on confluence
}