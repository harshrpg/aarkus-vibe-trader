import { SearchResultItem } from '../types'

export interface MarketEvent {
    type: 'EARNINGS' | 'ECONOMIC_DATA' | 'FED_MEETING' | 'DIVIDEND' | 'MERGER' | 'IPO' | 'OTHER'
    date?: Date
    description: string
    expectedImpact: 'HIGH' | 'MEDIUM' | 'LOW'
    impactDirection: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
    confidence: number
    source?: string
}

export interface EconomicIndicator {
    name: string
    currentValue?: string
    trend: 'RISING' | 'FALLING' | 'STABLE'
    impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
    relevance: number
    description: string
}

export interface SectorAnalysis {
    sectorName: string
    performance: 'OUTPERFORMING' | 'UNDERPERFORMING' | 'NEUTRAL'
    relativeStrength: number
    keyDrivers: string[]
    competitivePosition: string
    marketShare?: string
}

export interface EconomicContext {
    overallMarketCondition: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
    economicIndicators: EconomicIndicator[]
    sectorAnalysis: SectorAnalysis
    marketEvents: MarketEvent[]
    riskFactors: string[]
    opportunities: string[]
    macroeconomicTrends: string[]
    geopoliticalFactors: string[]
}

export class EconomicAnalyzer {
    private readonly economicIndicatorKeywords = {
        'GDP': ['gdp', 'gross domestic product', 'economic growth'],
        'Inflation': ['inflation', 'cpi', 'consumer price index', 'pce'],
        'Interest Rates': ['interest rate', 'fed rate', 'federal funds rate', 'fomc'],
        'Unemployment': ['unemployment', 'jobless rate', 'employment', 'jobs report'],
        'Consumer Confidence': ['consumer confidence', 'consumer sentiment'],
        'Manufacturing': ['manufacturing', 'pmi', 'industrial production'],
        'Retail Sales': ['retail sales', 'consumer spending'],
        'Housing': ['housing starts', 'home sales', 'real estate']
    }

    private readonly sectorKeywords = {
        'Technology': ['tech', 'software', 'semiconductor', 'ai', 'cloud'],
        'Healthcare': ['healthcare', 'pharma', 'biotech', 'medical'],
        'Financial': ['bank', 'financial', 'insurance', 'fintech'],
        'Energy': ['energy', 'oil', 'gas', 'renewable', 'solar'],
        'Consumer': ['retail', 'consumer', 'e-commerce', 'brand'],
        'Industrial': ['industrial', 'manufacturing', 'aerospace', 'defense'],
        'Real Estate': ['real estate', 'reit', 'property', 'housing'],
        'Utilities': ['utility', 'electric', 'water', 'infrastructure']
    }

    private readonly eventKeywords = {
        EARNINGS: ['earnings', 'quarterly report', 'q1', 'q2', 'q3', 'q4', 'results'],
        ECONOMIC_DATA: ['gdp report', 'inflation data', 'jobs report', 'cpi', 'pce'],
        FED_MEETING: ['fed meeting', 'fomc', 'federal reserve', 'powell'],
        DIVIDEND: ['dividend', 'payout', 'yield', 'distribution'],
        MERGER: ['merger', 'acquisition', 'takeover', 'deal'],
        IPO: ['ipo', 'initial public offering', 'listing', 'debut'],
        OTHER: ['announcement', 'guidance', 'restructuring', 'spinoff']
    }

    /**
     * Analyze economic indicators from search results
     */
    analyzeEconomicIndicators(results: SearchResultItem[]): EconomicIndicator[] {
        const indicators: EconomicIndicator[] = []

        for (const [indicatorName, keywords] of Object.entries(this.economicIndicatorKeywords)) {
            const relevantResults = results.filter(result => {
                const content = (result.title + ' ' + result.content).toLowerCase()
                return keywords.some(keyword => content.includes(keyword))
            })

            if (relevantResults.length > 0) {
                const indicator = this.extractIndicatorData(indicatorName, relevantResults)
                if (indicator) {
                    indicators.push(indicator)
                }
            }
        }

        return indicators.sort((a, b) => b.relevance - a.relevance)
    }

    /**
     * Extract specific indicator data from search results
     */
    private extractIndicatorData(name: string, results: SearchResultItem[]): EconomicIndicator | null {
        if (results.length === 0) return null

        const content = results.map(r => r.title + ' ' + r.content).join(' ').toLowerCase()

        // Determine trend
        let trend: 'RISING' | 'FALLING' | 'STABLE' = 'STABLE'
        if (content.includes('rise') || content.includes('increase') || content.includes('up')) {
            trend = 'RISING'
        } else if (content.includes('fall') || content.includes('decrease') || content.includes('down')) {
            trend = 'FALLING'
        }

        // Determine impact
        let impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' = 'NEUTRAL'
        if (name === 'GDP' || name === 'Employment') {
            impact = trend === 'RISING' ? 'POSITIVE' : trend === 'FALLING' ? 'NEGATIVE' : 'NEUTRAL'
        } else if (name === 'Inflation' || name === 'Unemployment') {
            impact = trend === 'RISING' ? 'NEGATIVE' : trend === 'FALLING' ? 'POSITIVE' : 'NEUTRAL'
        }

        // Extract current value if available
        const valueMatch = content.match(/(\d+\.?\d*)\s*%?/)
        const currentValue = valueMatch ? valueMatch[1] + (content.includes('%') ? '%' : '') : undefined

        return {
            name,
            currentValue,
            trend,
            impact,
            relevance: results.length / 10, // Normalize relevance
            description: results[0].content.slice(0, 200) + '...'
        }
    }

    /**
     * Analyze sector performance and competitive position
     */
    analyzeSectorPerformance(results: SearchResultItem[], symbol: string): SectorAnalysis {
        // Identify sector
        const sectorName = this.identifySector(results)

        // Analyze performance indicators
        const content = results.map(r => r.title + ' ' + r.content).join(' ').toLowerCase()

        let performance: 'OUTPERFORMING' | 'UNDERPERFORMING' | 'NEUTRAL' = 'NEUTRAL'
        let relativeStrength = 0

        // Performance indicators
        const positiveIndicators = ['outperform', 'leader', 'strong', 'growth', 'market share gain']
        const negativeIndicators = ['underperform', 'lagging', 'weak', 'decline', 'market share loss']

        const positiveCount = positiveIndicators.reduce((count, indicator) =>
            count + (content.match(new RegExp(indicator, 'g')) || []).length, 0
        )

        const negativeCount = negativeIndicators.reduce((count, indicator) =>
            count + (content.match(new RegExp(indicator, 'g')) || []).length, 0
        )

        if (positiveCount > negativeCount) {
            performance = 'OUTPERFORMING'
            relativeStrength = (positiveCount - negativeCount) / (positiveCount + negativeCount)
        } else if (negativeCount > positiveCount) {
            performance = 'UNDERPERFORMING'
            relativeStrength = (negativeCount - positiveCount) / (positiveCount + negativeCount) * -1
        }

        // Extract key drivers
        const keyDrivers = this.extractKeyDrivers(content, sectorName)

        // Extract competitive position
        const competitivePosition = this.extractCompetitivePosition(results, symbol)

        return {
            sectorName,
            performance,
            relativeStrength,
            keyDrivers,
            competitivePosition
        }
    }

    /**
     * Identify sector from search results
     */
    private identifySector(results: SearchResultItem[]): string {
        const content = results.map(r => r.title + ' ' + r.content).join(' ').toLowerCase()

        for (const [sector, keywords] of Object.entries(this.sectorKeywords)) {
            if (keywords.some(keyword => content.includes(keyword))) {
                return sector
            }
        }

        return 'General Market'
    }

    /**
     * Extract key sector drivers
     */
    private extractKeyDrivers(content: string, sector: string): string[] {
        const drivers: string[] = []

        // Sector-specific drivers
        const sectorDrivers = {
            'Technology': ['innovation', 'ai adoption', 'cloud migration', 'digital transformation'],
            'Healthcare': ['drug approval', 'clinical trials', 'aging population', 'healthcare reform'],
            'Financial': ['interest rates', 'loan growth', 'credit quality', 'regulatory changes'],
            'Energy': ['oil prices', 'renewable transition', 'demand growth', 'supply constraints'],
            'Consumer': ['consumer spending', 'brand strength', 'e-commerce growth', 'supply chain'],
            'Industrial': ['infrastructure spending', 'manufacturing demand', 'automation', 'trade policy']
        }

        const relevantDrivers = sectorDrivers[sector as keyof typeof sectorDrivers] || []

        for (const driver of relevantDrivers) {
            if (content.includes(driver.toLowerCase())) {
                drivers.push(driver)
            }
        }

        return drivers.slice(0, 5)
    }

    /**
     * Extract competitive position information
     */
    private extractCompetitivePosition(results: SearchResultItem[], symbol: string): string {
        const relevantResult = results.find(result =>
            result.content.toLowerCase().includes('market share') ||
            result.content.toLowerCase().includes('competitive') ||
            result.content.toLowerCase().includes('position')
        )

        if (relevantResult) {
            return relevantResult.content.slice(0, 300) + '...'
        }

        return `${symbol} competitive position analysis not available in current data`
    }

    /**
     * Extract and analyze market events
     */
    analyzeMarketEvents(results: SearchResultItem[]): MarketEvent[] {
        const events: MarketEvent[] = []

        for (const result of results) {
            const content = (result.title + ' ' + result.content).toLowerCase()

            for (const [eventType, keywords] of Object.entries(this.eventKeywords)) {
                if (keywords.some(keyword => content.includes(keyword))) {
                    const event = this.createMarketEvent(
                        eventType as MarketEvent['type'],
                        result,
                        content
                    )
                    if (event) {
                        events.push(event)
                    }
                    break // Only assign one event type per result
                }
            }
        }

        return events
            .sort((a, b) => this.getEventPriority(b.type) - this.getEventPriority(a.type))
            .slice(0, 8)
    }

    /**
     * Create market event from search result
     */
    private createMarketEvent(
        type: MarketEvent['type'],
        result: SearchResultItem,
        content: string
    ): MarketEvent | null {
        // Determine impact level
        let expectedImpact: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM'
        if (content.includes('major') || content.includes('significant') || content.includes('breaking')) {
            expectedImpact = 'HIGH'
        } else if (content.includes('minor') || content.includes('small')) {
            expectedImpact = 'LOW'
        }

        // Determine impact direction
        let impactDirection: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' = 'NEUTRAL'
        const positiveWords = ['beat', 'exceed', 'strong', 'positive', 'growth', 'approval']
        const negativeWords = ['miss', 'weak', 'decline', 'negative', 'concern', 'delay']

        if (positiveWords.some(word => content.includes(word))) {
            impactDirection = 'POSITIVE'
        } else if (negativeWords.some(word => content.includes(word))) {
            impactDirection = 'NEGATIVE'
        }

        // Extract date if available
        const dateMatch = content.match(/(\w+\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/)
        let date: Date | undefined
        if (dateMatch) {
            try {
                date = new Date(dateMatch[1])
            } catch {
                // Invalid date format
            }
        }

        return {
            type,
            date,
            description: result.title,
            expectedImpact,
            impactDirection,
            confidence: content.includes('confirmed') || content.includes('official') ? 0.9 : 0.6,
            source: this.extractSource(result.url)
        }
    }

    /**
     * Get event priority for sorting
     */
    private getEventPriority(type: MarketEvent['type']): number {
        const priorities = {
            EARNINGS: 5,
            FED_MEETING: 4,
            ECONOMIC_DATA: 4,
            MERGER: 3,
            IPO: 3,
            DIVIDEND: 2,
            OTHER: 1
        }
        return priorities[type] || 1
    }

    /**
     * Extract source from URL
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
     * Analyze risk factors and opportunities
     */
    analyzeRisksAndOpportunities(results: SearchResultItem[]): {
        riskFactors: string[]
        opportunities: string[]
    } {
        const content = results.map(r => r.title + ' ' + r.content).join(' ').toLowerCase()

        const riskKeywords = [
            'risk', 'concern', 'challenge', 'threat', 'volatility', 'uncertainty',
            'regulation', 'competition', 'supply chain', 'inflation', 'recession'
        ]

        const opportunityKeywords = [
            'opportunity', 'growth', 'expansion', 'innovation', 'market share',
            'new product', 'partnership', 'acquisition', 'efficiency', 'cost savings'
        ]

        const riskFactors: string[] = []
        const opportunities: string[] = []

        // Extract sentences containing risk keywords
        const sentences = content.split(/[.!?]+/)

        for (const sentence of sentences) {
            if (riskKeywords.some(keyword => sentence.includes(keyword))) {
                const cleanSentence = sentence.trim().slice(0, 100)
                if (cleanSentence.length > 20) {
                    riskFactors.push(cleanSentence + '...')
                }
            }

            if (opportunityKeywords.some(keyword => sentence.includes(keyword))) {
                const cleanSentence = sentence.trim().slice(0, 100)
                if (cleanSentence.length > 20) {
                    opportunities.push(cleanSentence + '...')
                }
            }
        }

        return {
            riskFactors: riskFactors.slice(0, 5),
            opportunities: opportunities.slice(0, 5)
        }
    }

    /**
     * Analyze macroeconomic trends
     */
    analyzeMacroeconomicTrends(results: SearchResultItem[]): string[] {
        const content = results.map(r => r.title + ' ' + r.content).join(' ').toLowerCase()

        const trendKeywords = [
            'digital transformation', 'remote work', 'sustainability', 'esg',
            'supply chain reshoring', 'deglobalization', 'energy transition',
            'demographic shift', 'urbanization', 'automation', 'ai adoption'
        ]

        const trends: string[] = []

        for (const trend of trendKeywords) {
            if (content.includes(trend)) {
                trends.push(trend)
            }
        }

        return trends.slice(0, 6)
    }

    /**
     * Perform comprehensive economic context analysis
     */
    analyzeEconomicContext(
        economicResults: SearchResultItem[],
        sectorResults: SearchResultItem[],
        newsResults: SearchResultItem[],
        symbol: string
    ): EconomicContext {
        const allResults = [...economicResults, ...sectorResults, ...newsResults]

        // Analyze components
        const economicIndicators = this.analyzeEconomicIndicators(economicResults)
        const sectorAnalysis = this.analyzeSectorPerformance(sectorResults, symbol)
        const marketEvents = this.analyzeMarketEvents(allResults)
        const { riskFactors, opportunities } = this.analyzeRisksAndOpportunities(allResults)
        const macroeconomicTrends = this.analyzeMacroeconomicTrends(allResults)

        // Determine overall market condition
        let overallMarketCondition: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL'

        const positiveIndicators = economicIndicators.filter(i => i.impact === 'POSITIVE').length
        const negativeIndicators = economicIndicators.filter(i => i.impact === 'NEGATIVE').length
        const sectorPerformance = sectorAnalysis.performance

        if (positiveIndicators > negativeIndicators && sectorPerformance === 'OUTPERFORMING') {
            overallMarketCondition = 'BULLISH'
        } else if (negativeIndicators > positiveIndicators && sectorPerformance === 'UNDERPERFORMING') {
            overallMarketCondition = 'BEARISH'
        }

        // Extract geopolitical factors
        const geopoliticalFactors = this.extractGeopoliticalFactors(allResults)

        return {
            overallMarketCondition,
            economicIndicators,
            sectorAnalysis,
            marketEvents,
            riskFactors,
            opportunities,
            macroeconomicTrends,
            geopoliticalFactors
        }
    }

    /**
     * Extract geopolitical factors
     */
    private extractGeopoliticalFactors(results: SearchResultItem[]): string[] {
        const content = results.map(r => r.title + ' ' + r.content).join(' ').toLowerCase()

        const geopoliticalKeywords = [
            'trade war', 'sanctions', 'tariffs', 'brexit', 'china relations',
            'russia ukraine', 'middle east', 'election', 'policy change',
            'regulatory', 'government', 'political'
        ]

        const factors: string[] = []

        for (const keyword of geopoliticalKeywords) {
            if (content.includes(keyword)) {
                factors.push(keyword)
            }
        }

        return factors.slice(0, 4)
    }
}