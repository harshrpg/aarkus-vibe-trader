import { SearchResultItem } from '../types'

export interface NewsItem {
    title: string
    summary: string
    url: string
    publishedAt?: Date
    sentiment?: number
    relevance?: number
    source?: string
}

export interface SentimentAnalysis {
    sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
    score: number
    confidence: number
    keyThemes: string[]
    marketCatalysts: string[]
    relevantNews: NewsItem[]
    aggregatedSentiment: {
        bullishSignals: number
        bearishSignals: number
        neutralSignals: number
    }
}

export interface MarketTheme {
    theme: string
    frequency: number
    sentiment: number
    relevance: number
}

export class SentimentAnalyzer {
    private readonly positiveKeywords = [
        // Strong positive
        'bullish', 'surge', 'rally', 'soar', 'skyrocket', 'breakout', 'boom',
        'outperform', 'beat expectations', 'exceed', 'strong growth', 'record high',

        // Moderate positive
        'positive', 'growth', 'increase', 'profit', 'beat', 'upgrade', 'buy',
        'strong', 'excellent', 'gain', 'rise', 'up', 'higher', 'improved',
        'optimistic', 'confident', 'favorable', 'promising', 'robust'
    ]

    private readonly negativeKeywords = [
        // Strong negative
        'bearish', 'crash', 'plummet', 'collapse', 'tank', 'dive', 'slump',
        'underperform', 'miss expectations', 'disappointing', 'weak results', 'record low',

        // Moderate negative
        'negative', 'decline', 'decrease', 'loss', 'miss', 'downgrade', 'sell',
        'weak', 'poor', 'drop', 'fall', 'down', 'lower', 'concern',
        'pessimistic', 'cautious', 'unfavorable', 'challenging', 'volatile'
    ]

    private readonly catalystKeywords = [
        'earnings beat', 'earnings miss', 'guidance raised', 'guidance lowered',
        'merger', 'acquisition', 'partnership', 'contract', 'deal',
        'fda approval', 'regulatory approval', 'patent', 'lawsuit',
        'dividend increase', 'stock split', 'buyback', 'ipo',
        'ceo change', 'management change', 'restructuring'
    ]

    private readonly intensifiers = [
        'very', 'extremely', 'significantly', 'substantially', 'dramatically',
        'sharply', 'strongly', 'heavily', 'major', 'massive', 'huge'
    ]

    /**
     * Analyze sentiment of individual news article
     */
    analyzeArticleSentiment(article: SearchResultItem): {
        sentiment: number
        confidence: number
        themes: string[]
        catalysts: string[]
    } {
        const content = (article.title + ' ' + article.content).toLowerCase()
        const words = content.split(/\s+/)

        let positiveScore = 0
        let negativeScore = 0
        let intensifierMultiplier = 1
        const themes: Set<string> = new Set()
        const catalysts: Set<string> = new Set()

        // Analyze word by word with context
        for (let i = 0; i < words.length; i++) {
            const word = words[i]
            const nextWord = words[i + 1] || ''
            const prevWord = words[i - 1] || ''

            // Check for intensifiers
            if (this.intensifiers.includes(word)) {
                intensifierMultiplier = 1.5
                continue
            }

            // Check for positive keywords
            const positiveMatch = this.positiveKeywords.find(keyword =>
                content.includes(keyword) && keyword.includes(word)
            )
            if (positiveMatch) {
                const weight = this.getKeywordWeight(positiveMatch)
                positiveScore += weight * intensifierMultiplier
                themes.add(this.extractTheme(positiveMatch, prevWord, nextWord))
            }

            // Check for negative keywords
            const negativeMatch = this.negativeKeywords.find(keyword =>
                content.includes(keyword) && keyword.includes(word)
            )
            if (negativeMatch) {
                const weight = this.getKeywordWeight(negativeMatch)
                negativeScore += weight * intensifierMultiplier
                themes.add(this.extractTheme(negativeMatch, prevWord, nextWord))
            }

            // Check for market catalysts
            const catalystMatch = this.catalystKeywords.find(keyword =>
                content.includes(keyword)
            )
            if (catalystMatch) {
                catalysts.add(catalystMatch)
            }

            // Reset intensifier after each word
            intensifierMultiplier = 1
        }

        // Calculate sentiment score (-1 to 1)
        const totalScore = positiveScore + negativeScore
        const sentiment = totalScore > 0 ? (positiveScore - negativeScore) / totalScore : 0

        // Calculate confidence based on number of sentiment indicators
        const confidence = Math.min(totalScore / 5, 1) // Max confidence at 5+ indicators

        return {
            sentiment,
            confidence,
            themes: Array.from(themes).filter(theme => theme.length > 0),
            catalysts: Array.from(catalysts)
        }
    }

    /**
     * Get weight for sentiment keywords (stronger words get higher weight)
     */
    private getKeywordWeight(keyword: string): number {
        const strongKeywords = [
            'surge', 'soar', 'skyrocket', 'crash', 'plummet', 'collapse',
            'breakout', 'boom', 'tank', 'dive', 'slump'
        ]

        return strongKeywords.includes(keyword) ? 2 : 1
    }

    /**
     * Extract theme from keyword context
     */
    private extractTheme(keyword: string, prevWord: string, nextWord: string): string {
        // Create meaningful themes from context
        if (keyword.includes('earnings')) return 'earnings performance'
        if (keyword.includes('growth')) return 'business growth'
        if (keyword.includes('profit')) return 'profitability'
        if (keyword.includes('revenue')) return 'revenue trends'
        if (keyword.includes('guidance')) return 'forward guidance'

        return keyword
    }

    /**
     * Extract market themes and their frequency
     */
    extractMarketThemes(articles: SearchResultItem[]): MarketTheme[] {
        const themeMap = new Map<string, { count: number, totalSentiment: number }>()

        for (const article of articles) {
            const analysis = this.analyzeArticleSentiment(article)

            for (const theme of analysis.themes) {
                const existing = themeMap.get(theme) || { count: 0, totalSentiment: 0 }
                themeMap.set(theme, {
                    count: existing.count + 1,
                    totalSentiment: existing.totalSentiment + analysis.sentiment
                })
            }
        }

        return Array.from(themeMap.entries())
            .map(([theme, data]) => ({
                theme,
                frequency: data.count,
                sentiment: data.totalSentiment / data.count,
                relevance: data.count / articles.length
            }))
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, 10)
    }

    /**
     * Aggregate sentiment across multiple news sources
     */
    aggregateSentiment(articles: SearchResultItem[]): {
        bullishSignals: number
        bearishSignals: number
        neutralSignals: number
    } {
        let bullishSignals = 0
        let bearishSignals = 0
        let neutralSignals = 0

        for (const article of articles) {
            const analysis = this.analyzeArticleSentiment(article)

            if (analysis.sentiment > 0.1) {
                bullishSignals++
            } else if (analysis.sentiment < -0.1) {
                bearishSignals++
            } else {
                neutralSignals++
            }
        }

        return { bullishSignals, bearishSignals, neutralSignals }
    }

    /**
     * Perform comprehensive sentiment analysis on news articles
     */
    analyzeSentiment(articles: SearchResultItem[], symbol: string): SentimentAnalysis {
        if (articles.length === 0) {
            return {
                sentiment: 'NEUTRAL',
                score: 0,
                confidence: 0,
                keyThemes: [],
                marketCatalysts: [],
                relevantNews: [],
                aggregatedSentiment: { bullishSignals: 0, bearishSignals: 0, neutralSignals: 0 }
            }
        }

        const analyzedArticles: NewsItem[] = []
        let totalSentiment = 0
        let totalConfidence = 0
        const allCatalysts: Set<string> = new Set()

        // Analyze each article
        for (const article of articles) {
            const analysis = this.analyzeArticleSentiment(article)

            totalSentiment += analysis.sentiment * analysis.confidence
            totalConfidence += analysis.confidence

            analysis.catalysts.forEach(catalyst => allCatalysts.add(catalyst))

            analyzedArticles.push({
                title: article.title,
                summary: article.content.slice(0, 200) + '...',
                url: article.url,
                sentiment: analysis.sentiment,
                relevance: analysis.confidence,
                source: this.extractSource(article.url)
            })
        }

        // Calculate overall sentiment
        const averageSentiment = totalConfidence > 0 ? totalSentiment / totalConfidence : 0
        const overallConfidence = Math.min(totalConfidence / articles.length, 1)

        let sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' = 'NEUTRAL'
        if (averageSentiment > 0.15) sentiment = 'POSITIVE'
        else if (averageSentiment < -0.15) sentiment = 'NEGATIVE'

        // Extract themes and aggregate sentiment
        const themes = this.extractMarketThemes(articles)
        const aggregatedSentiment = this.aggregateSentiment(articles)

        // Sort articles by relevance
        const sortedNews = analyzedArticles
            .sort((a, b) => (b.relevance || 0) - (a.relevance || 0))
            .slice(0, 8)

        return {
            sentiment,
            score: averageSentiment,
            confidence: overallConfidence,
            keyThemes: themes.map(t => t.theme),
            marketCatalysts: Array.from(allCatalysts),
            relevantNews: sortedNews,
            aggregatedSentiment
        }
    }

    /**
     * Extract source domain from URL
     */
    private extractSource(url: string): string {
        try {
            const domain = new URL(url).hostname
            return domain.replace('www.', '')
        } catch {
            return 'unknown'
        }
    }

    /**
     * Analyze sentiment trends over time (if timestamps available)
     */
    analyzeSentimentTrends(articles: NewsItem[]): {
        trend: 'IMPROVING' | 'DECLINING' | 'STABLE'
        recentSentiment: number
        historicalSentiment: number
    } {
        if (articles.length < 4) {
            return {
                trend: 'STABLE',
                recentSentiment: 0,
                historicalSentiment: 0
            }
        }

        // Sort by date if available, otherwise by relevance
        const sortedArticles = articles.sort((a, b) => {
            if (a.publishedAt && b.publishedAt) {
                return b.publishedAt.getTime() - a.publishedAt.getTime()
            }
            return (b.relevance || 0) - (a.relevance || 0)
        })

        const recentArticles = sortedArticles.slice(0, Math.floor(articles.length / 2))
        const olderArticles = sortedArticles.slice(Math.floor(articles.length / 2))

        const recentSentiment = recentArticles.reduce((sum, article) =>
            sum + (article.sentiment || 0), 0) / recentArticles.length

        const historicalSentiment = olderArticles.reduce((sum, article) =>
            sum + (article.sentiment || 0), 0) / olderArticles.length

        let trend: 'IMPROVING' | 'DECLINING' | 'STABLE' = 'STABLE'
        const difference = recentSentiment - historicalSentiment

        if (difference > 0.1) trend = 'IMPROVING'
        else if (difference < -0.1) trend = 'DECLINING'

        return {
            trend,
            recentSentiment,
            historicalSentiment
        }
    }
}