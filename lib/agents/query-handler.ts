import { AnalysisContext } from '../types/trading'

export interface QueryResponse {
    answer: string
    followUpSuggestions: string[]
    requiresNewAnalysis: boolean
    suggestedSymbol?: string
}

export interface QueryClassification {
    type: 'symbol_request' | 'technical_question' | 'fundamental_question' | 'general_question'
    entities: string[]
    confidence: number
}

export class NaturalLanguageQueryHandler {
    /**
     * Process a natural language query with context
     */
    async processQuery(
        query: string,
        context: AnalysisContext,
        classification?: QueryClassification
    ): Promise<QueryResponse> {
        const queryClassification = classification || this.classifyQuery(query)

        switch (queryClassification.type) {
            case 'symbol_request':
                return this.handleSymbolRequest(query, queryClassification.entities)

            case 'technical_question':
                return this.handleTechnicalQuestion(query, context)

            case 'fundamental_question':
                return this.handleFundamentalQuestion(query, context)

            default:
                return this.handleGeneralQuestion(query, context)
        }
    }

    /**
     * Classify the type of query
     */
    classifyQuery(query: string): QueryClassification {
        const lowerQuery = query.toLowerCase()

        // Check for symbol patterns
        const symbolPattern = /\b[A-Z]{2,5}(USD|EUR|GBP|JPY)?\b/g
        const symbols = query.match(symbolPattern) || []

        if (symbols.length > 0) {
            return {
                type: 'symbol_request',
                entities: symbols,
                confidence: 0.9
            }
        }

        // Check for technical analysis keywords
        const technicalKeywords = [
            'rsi', 'macd', 'moving average', 'support', 'resistance', 'trend',
            'pattern', 'chart', 'indicator', 'bollinger', 'stochastic', 'fibonacci'
        ]

        if (technicalKeywords.some(keyword => lowerQuery.includes(keyword))) {
            return {
                type: 'technical_question',
                entities: [],
                confidence: 0.8
            }
        }

        // Check for fundamental analysis keywords
        const fundamentalKeywords = [
            'earnings', 'revenue', 'news', 'sentiment', 'pe ratio', 'eps',
            'market cap', 'fundamental', 'company', 'sector', 'events'
        ]

        if (fundamentalKeywords.some(keyword => lowerQuery.includes(keyword))) {
            return {
                type: 'fundamental_question',
                entities: [],
                confidence: 0.8
            }
        }

        return {
            type: 'general_question',
            entities: [],
            confidence: 0.5
        }
    }

    /**
     * Handle symbol analysis requests
     */
    private handleSymbolRequest(query: string, symbols: string[]): QueryResponse {
        const symbol = symbols[0]

        return {
            answer: `I'll analyze ${symbol} for you. This will include comprehensive technical analysis, fundamental research, and trading recommendations.`,
            followUpSuggestions: [
                `What are the key support and resistance levels for ${symbol}?`,
                `Show me the technical indicators for ${symbol}`,
                `What's the market sentiment for ${symbol}?`,
                `Are there any upcoming events affecting ${symbol}?`
            ],
            requiresNewAnalysis: true,
            suggestedSymbol: symbol
        }
    }

    /**
     * Handle technical analysis questions
     */
    private handleTechnicalQuestion(query: string, context: AnalysisContext): QueryResponse {
        const lowerQuery = query.toLowerCase()

        if (!context.lastAnalysis) {
            return {
                answer: "I need to perform a technical analysis first. Please specify a symbol to analyze.",
                followUpSuggestions: [
                    "Analyze AAPL for technical signals",
                    "Show me Bitcoin technical analysis",
                    "What are the trending stocks today?"
                ],
                requiresNewAnalysis: true
            }
        }

        const technical = context.lastAnalysis.technicalAnalysis

        // Handle specific technical questions
        if (lowerQuery.includes('rsi')) {
            const rsi = technical.momentum.rsi
            return {
                answer: `The RSI for ${context.symbol} is currently ${rsi.toFixed(1)}. ${this.interpretRSI(rsi)}`,
                followUpSuggestions: [
                    "What about the MACD indicator?",
                    "Show me the support and resistance levels",
                    "What's the overall trend direction?"
                ],
                requiresNewAnalysis: false
            }
        }

        if (lowerQuery.includes('macd')) {
            const macd = technical.momentum.macd
            return {
                answer: `The MACD for ${context.symbol} shows: MACD line at ${macd.macd.toFixed(3)}, Signal line at ${macd.signal.toFixed(3)}, and Histogram at ${macd.histogram.toFixed(3)}. ${technical.momentum.interpretation}`,
                followUpSuggestions: [
                    "What does this mean for trading?",
                    "Show me other momentum indicators",
                    "What are the price targets?"
                ],
                requiresNewAnalysis: false
            }
        }

        if (lowerQuery.includes('support') || lowerQuery.includes('resistance')) {
            const levels = technical.supportResistance
            const supportLevels = levels.filter(l => l.type === 'SUPPORT').slice(0, 2)
            const resistanceLevels = levels.filter(l => l.type === 'RESISTANCE').slice(0, 2)

            let answer = `Key levels for ${context.symbol}:\n\n`

            if (supportLevels.length > 0) {
                answer += `**Support Levels:**\n`
                supportLevels.forEach(level => {
                    answer += `- $${level.level.toFixed(2)} (Strength: ${(level.confidence * 100).toFixed(0)}%)\n`
                })
            }

            if (resistanceLevels.length > 0) {
                answer += `\n**Resistance Levels:**\n`
                resistanceLevels.forEach(level => {
                    answer += `- $${level.level.toFixed(2)} (Strength: ${(level.confidence * 100).toFixed(0)}%)\n`
                })
            }

            return {
                answer,
                followUpSuggestions: [
                    "How strong are these levels?",
                    "What happens if price breaks these levels?",
                    "Show me the trend analysis"
                ],
                requiresNewAnalysis: false
            }
        }

        if (lowerQuery.includes('trend')) {
            const trend = technical.trend
            return {
                answer: `${context.symbol} is currently in a ${trend.direction.toLowerCase()} with ${(trend.strength * 100).toFixed(0)}% strength. The trend has been in place for ${trend.duration} periods with a slope of ${trend.slope.toFixed(4)}.`,
                followUpSuggestions: [
                    "How reliable is this trend?",
                    "What are the trend reversal signals?",
                    "Show me momentum indicators"
                ],
                requiresNewAnalysis: false
            }
        }

        // General technical analysis response
        return {
            answer: `Based on the technical analysis for ${context.symbol}:\n\n` +
                `**Trend:** ${technical.trend.direction} (${(technical.trend.strength * 100).toFixed(0)}% strength)\n` +
                `**RSI:** ${technical.momentum.rsi.toFixed(1)} (${this.interpretRSI(technical.momentum.rsi)})\n` +
                `**MACD:** ${technical.momentum.macd.histogram > 0 ? 'Bullish' : 'Bearish'} momentum\n` +
                `**Key Levels:** ${technical.supportResistance.length} support/resistance levels identified`,
            followUpSuggestions: [
                "Show me detailed indicator analysis",
                "What are the trading signals?",
                "Explain the chart patterns"
            ],
            requiresNewAnalysis: false
        }
    }

    /**
     * Handle fundamental analysis questions
     */
    private handleFundamentalQuestion(query: string, context: AnalysisContext): QueryResponse {
        const lowerQuery = query.toLowerCase()

        if (!context.lastAnalysis) {
            return {
                answer: "I need to perform a fundamental analysis first. Please specify a symbol to analyze.",
                followUpSuggestions: [
                    "Analyze AAPL fundamentals",
                    "Show me Tesla company information",
                    "What's the market sentiment for Bitcoin?"
                ],
                requiresNewAnalysis: true
            }
        }

        const fundamental = context.lastAnalysis.fundamentalAnalysis

        if (lowerQuery.includes('news') || lowerQuery.includes('sentiment')) {
            const news = fundamental.newsAnalysis
            return {
                answer: `Market sentiment for ${context.symbol} is ${news.sentiment} with a sentiment score of ${news.sentimentScore.toFixed(2)}. Key themes include: ${news.keyThemes.slice(0, 3).join(', ')}. I found ${news.relevantNews.length} relevant news articles.`,
                followUpSuggestions: [
                    "Show me the latest news articles",
                    "What are the upcoming events?",
                    "How does this affect the stock price?"
                ],
                requiresNewAnalysis: false
            }
        }

        if (lowerQuery.includes('earnings') || lowerQuery.includes('financial')) {
            const metrics = fundamental.financialMetrics
            return {
                answer: `Financial metrics for ${context.symbol}:\n\n` +
                    `**P/E Ratio:** ${metrics.pe.toFixed(1)}\n` +
                    `**EPS:** $${metrics.eps.toFixed(2)}\n` +
                    `**Revenue Growth:** ${(metrics.revenueGrowth * 100).toFixed(1)}%\n` +
                    `**Profit Margin:** ${(metrics.profitMargin * 100).toFixed(1)}%`,
                followUpSuggestions: [
                    "How do these compare to industry averages?",
                    "What's the company's growth outlook?",
                    "Show me sector analysis"
                ],
                requiresNewAnalysis: false
            }
        }

        if (lowerQuery.includes('events') || lowerQuery.includes('upcoming')) {
            const events = fundamental.upcomingEvents
            if (events.length === 0) {
                return {
                    answer: `No major upcoming events identified for ${context.symbol} in the near term.`,
                    followUpSuggestions: [
                        "Check the earnings calendar",
                        "What about sector-wide events?",
                        "Show me the technical analysis instead"
                    ],
                    requiresNewAnalysis: false
                }
            }

            let answer = `Upcoming events for ${context.symbol}:\n\n`
            events.forEach(event => {
                answer += `**${event.type}** - ${event.description}\n`
                answer += `Date: ${event.date.toLocaleDateString()}\n`
                answer += `Expected Impact: ${event.expectedImpact}\n\n`
            })

            return {
                answer,
                followUpSuggestions: [
                    "How might these events affect the price?",
                    "What's the historical impact of similar events?",
                    "Show me the technical setup before these events"
                ],
                requiresNewAnalysis: false
            }
        }

        // General fundamental response
        return {
            answer: `Fundamental analysis for ${context.symbol}:\n\n` +
                `**Company:** ${fundamental.companyInfo.name} (${fundamental.companyInfo.sector})\n` +
                `**Market Sentiment:** ${fundamental.newsAnalysis.sentiment}\n` +
                `**P/E Ratio:** ${fundamental.financialMetrics.pe.toFixed(1)}\n` +
                `**Upcoming Events:** ${fundamental.upcomingEvents.length} identified`,
            followUpSuggestions: [
                "Show me detailed financial metrics",
                "What's the latest news?",
                "How does the sector look?"
            ],
            requiresNewAnalysis: false
        }
    }

    /**
     * Handle general questions
     */
    private handleGeneralQuestion(query: string, context: AnalysisContext): QueryResponse {
        const lowerQuery = query.toLowerCase()

        if (lowerQuery.includes('recommend') || lowerQuery.includes('buy') || lowerQuery.includes('sell')) {
            if (!context.lastAnalysis) {
                return {
                    answer: "I need to analyze a specific symbol first to provide trading recommendations.",
                    followUpSuggestions: [
                        "Analyze AAPL for trading opportunities",
                        "Show me Bitcoin analysis",
                        "What are the trending stocks?"
                    ],
                    requiresNewAnalysis: true
                }
            }

            const recommendations = context.lastAnalysis.recommendations
            if (recommendations.length === 0) {
                return {
                    answer: `Based on current analysis, I don't have a strong directional bias for ${context.symbol}. The market conditions suggest a HOLD strategy.`,
                    followUpSuggestions: [
                        "What are the key levels to watch?",
                        "Show me the risk factors",
                        "When should I reassess?"
                    ],
                    requiresNewAnalysis: false
                }
            }

            const primaryRec = recommendations[0]
            return {
                answer: `My recommendation for ${context.symbol} is **${primaryRec.action}** with ${(primaryRec.confidence * 100).toFixed(0)}% confidence.\n\n` +
                    `**Reasoning:**\n${primaryRec.reasoning.join('\n')}\n\n` +
                    `**Price Targets:** ${primaryRec.priceTargets.map(t => `$${t.level.toFixed(2)} (${t.type})`).join(', ')}\n` +
                    `**Stop Loss:** $${primaryRec.stopLoss.toFixed(2)}\n` +
                    `**Time Horizon:** ${primaryRec.timeHorizon}\n` +
                    `**Risk Level:** ${primaryRec.riskLevel}`,
                followUpSuggestions: [
                    "What's the risk/reward ratio?",
                    "How should I position size?",
                    "What could invalidate this setup?"
                ],
                requiresNewAnalysis: false
            }
        }

        // Default response
        return {
            answer: "I can help you with trading analysis, technical indicators, fundamental research, and market insights. What would you like to know?",
            followUpSuggestions: [
                "Analyze a specific stock or crypto",
                "Explain technical indicators",
                "Show me market trends",
                "Help me with risk management"
            ],
            requiresNewAnalysis: false
        }
    }

    /**
     * Interpret RSI values
     */
    private interpretRSI(rsi: number): string {
        if (rsi > 70) return "Overbought - potential selling pressure"
        if (rsi < 30) return "Oversold - potential buying opportunity"
        if (rsi > 50) return "Bullish momentum"
        return "Bearish momentum"
    }
}