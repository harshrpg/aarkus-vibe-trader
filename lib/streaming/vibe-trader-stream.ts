import {
    createDataStreamResponse,
    DataStreamWriter,
    JSONValue
} from 'ai'
import { VibeTraderController } from '../agents/vibe-trader'
import {
    AnalysisResult,
    TechnicalAnalysisResult,
    FundamentalAnalysisResult,
    AnalysisStreamChunk,
    AnalysisStreamChunkType,
    AnalysisError,
    AnalysisErrorType
} from '../types/trading'

interface VibeTraderStreamConfig {
    symbol: string
    timeframe?: string
    query?: string
    model: string
    userId?: string
    chatId?: string
}

/**
 * Creates a streaming response for Vibe Trader analysis
 * Streams results progressively as technical and fundamental analysis complete
 */
export function createVibeTraderStreamResponse(config: VibeTraderStreamConfig) {
    return createDataStreamResponse({
        execute: async (dataStream: DataStreamWriter) => {
            const { symbol, timeframe = '1D', query, model, userId, chatId } = config

            try {
                // Initialize the controller
                const controller = new VibeTraderController(model)

                // Send initial status
                await streamChunk(dataStream, {
                    type: 'status',
                    data: {
                        stage: 'initializing',
                        message: `Starting analysis for ${symbol}`,
                        progress: 0,
                        timestamp: new Date()
                    }
                })

                // Validate symbol
                if (!isValidSymbol(symbol)) {
                    throw new AnalysisError(
                        AnalysisErrorType.INVALID_SYMBOL,
                        `Invalid symbol: ${symbol}`,
                        true,
                        'Please provide a valid trading symbol'
                    )
                }

                // Stream technical analysis
                await streamChunk(dataStream, {
                    type: 'status',
                    data: {
                        stage: 'technical_analysis',
                        message: 'Running technical analysis...',
                        progress: 10,
                        timestamp: new Date()
                    }
                })

                // Start technical and fundamental analysis in parallel
                const analysisPromises = [
                    runTechnicalAnalysisWithStreaming(controller, symbol, timeframe, dataStream),
                    runFundamentalAnalysisWithStreaming(controller, symbol, dataStream)
                ]

                // Wait for both analyses to complete
                const [technicalResult, fundamentalResult] = await Promise.allSettled(analysisPromises)

                // Handle results
                const technical = handleAnalysisResult(technicalResult, 'Technical analysis failed')
                const fundamental = handleAnalysisResult(fundamentalResult, 'Fundamental analysis failed')

                // Stream synthesis stage
                await streamChunk(dataStream, {
                    type: 'status',
                    data: {
                        stage: 'synthesis',
                        message: 'Generating recommendations...',
                        progress: 80,
                        timestamp: new Date()
                    }
                })

                // Generate final recommendations
                const finalResult = await synthesizeAnalysisResults(
                    controller,
                    symbol,
                    technical,
                    fundamental,
                    dataStream
                )

                // Stream final result
                await streamChunk(dataStream, {
                    type: 'complete',
                    data: finalResult
                })

                // Stream completion status
                await streamChunk(dataStream, {
                    type: 'status',
                    data: {
                        stage: 'complete',
                        message: 'Analysis complete',
                        progress: 100,
                        timestamp: new Date()
                    }
                })

            } catch (error) {
                console.error('Vibe Trader streaming error:', error)

                // Stream error information
                await streamChunk(dataStream, {
                    type: 'error',
                    data: {
                        type: error instanceof AnalysisError ? error.type : AnalysisErrorType.ANALYSIS_TIMEOUT,
                        message: error instanceof Error ? error.message : 'Unknown error occurred',
                        recoverable: error instanceof AnalysisError ? error.recoverable : false,
                        suggestedAction: error instanceof AnalysisError ? error.suggestedAction : 'Please try again',
                        timestamp: new Date()
                    }
                })
            }
        },
        onError: (error) => {
            console.error('Stream error:', error)
            return error instanceof Error ? error.message : String(error)
        }
    })
}

/**
 * Run technical analysis with streaming updates
 */
async function runTechnicalAnalysisWithStreaming(
    controller: VibeTraderController,
    symbol: string,
    timeframe: string,
    dataStream: DataStreamWriter
): Promise<TechnicalAnalysisResult> {
    try {
        // Stream progress updates
        await streamChunk(dataStream, {
            type: 'status',
            data: {
                stage: 'technical_analysis',
                message: 'Fetching price data...',
                progress: 20,
                timestamp: new Date()
            }
        })

        // Get price data (this would be the actual implementation)
        const priceData = await (controller as any).getPriceData(symbol, timeframe)

        await streamChunk(dataStream, {
            type: 'status',
            data: {
                stage: 'technical_analysis',
                message: 'Calculating indicators...',
                progress: 35,
                timestamp: new Date()
            }
        })

        // Run technical analysis
        const technicalResult = await (controller as any).runTechnicalAnalysis(
            symbol,
            timeframe,
            priceData,
            {}
        )

        // Stream partial technical results
        await streamChunk(dataStream, {
            type: 'technical_partial',
            data: {
                indicators: technicalResult.indicators,
                patterns: technicalResult.patterns,
                supportResistance: technicalResult.supportResistance,
                timestamp: new Date()
            }
        })

        await streamChunk(dataStream, {
            type: 'status',
            data: {
                stage: 'technical_analysis',
                message: 'Technical analysis complete',
                progress: 50,
                timestamp: new Date()
            }
        })

        return technicalResult

    } catch (error) {
        console.error('Technical analysis streaming error:', error)
        throw error
    }
}

/**
 * Run fundamental analysis with streaming updates
 */
async function runFundamentalAnalysisWithStreaming(
    controller: VibeTraderController,
    symbol: string,
    dataStream: DataStreamWriter
): Promise<FundamentalAnalysisResult> {
    try {
        await streamChunk(dataStream, {
            type: 'status',
            data: {
                stage: 'fundamental_analysis',
                message: 'Researching market data...',
                progress: 25,
                timestamp: new Date()
            }
        })

        // Run fundamental analysis
        const fundamentalResult = await (controller as any).runFundamentalAnalysis(symbol)

        // Stream partial fundamental results
        await streamChunk(dataStream, {
            type: 'fundamental_partial',
            data: {
                newsAnalysis: fundamentalResult.newsAnalysis,
                marketSentiment: fundamentalResult.marketSentiment,
                upcomingEvents: fundamentalResult.upcomingEvents,
                timestamp: new Date()
            }
        })

        await streamChunk(dataStream, {
            type: 'status',
            data: {
                stage: 'fundamental_analysis',
                message: 'Fundamental analysis complete',
                progress: 65,
                timestamp: new Date()
            }
        })

        return fundamentalResult

    } catch (error) {
        console.error('Fundamental analysis streaming error:', error)
        throw error
    }
}

/**
 * Synthesize final analysis results
 */
async function synthesizeAnalysisResults(
    controller: VibeTraderController,
    symbol: string,
    technical: TechnicalAnalysisResult,
    fundamental: FundamentalAnalysisResult,
    dataStream: DataStreamWriter
): Promise<AnalysisResult> {

    // Generate recommendations
    const recommendations = (controller as any).synthesizeRecommendations(
        technical,
        fundamental,
        {}
    )

    // Calculate confidence
    const confidence = (controller as any).calculateOverallConfidence(
        technical,
        fundamental,
        recommendations
    )

    // Generate chart annotations
    const chartAnnotations = (controller as any).generateChartAnnotations(
        technical,
        recommendations
    )

    // Generate summary
    const summary = (controller as any).generateAnalysisSummary(
        symbol,
        technical,
        fundamental,
        recommendations,
        confidence
    )

    // Stream recommendations as they're generated
    await streamChunk(dataStream, {
        type: 'recommendations_partial',
        data: {
            recommendations,
            confidence,
            chartAnnotations: chartAnnotations.slice(0, 5), // Stream first 5 annotations
            timestamp: new Date()
        }
    })

    return {
        symbol,
        timestamp: new Date(),
        technicalAnalysis: technical,
        fundamentalAnalysis: fundamental,
        recommendations,
        confidence,
        chartAnnotations,
        summary
    }
}

/**
 * Stream a chunk of data
 */
async function streamChunk(
    dataStream: DataStreamWriter,
    chunk: AnalysisStreamChunk
): Promise<void> {
    try {
        dataStream.writeMessageAnnotation({
            type: 'vibe_trader_chunk',
            data: chunk
        } as JSONValue)
    } catch (error) {
        console.error('Error streaming chunk:', error)
    }
}

/**
 * Handle analysis result from Promise.allSettled
 */
function handleAnalysisResult<T>(
    result: PromiseSettledResult<T>,
    errorMessage: string
): T {
    if (result.status === 'fulfilled') {
        return result.value
    } else {
        console.warn(`${errorMessage}:`, result.reason)
        throw new Error(`${errorMessage}: ${result.reason}`)
    }
}

/**
 * Basic symbol validation
 */
function isValidSymbol(symbol: string): boolean {
    return /^[A-Z0-9]{1,10}(USD|EUR|GBP|JPY)?$/i.test(symbol.toUpperCase())
}

/**
 * Stream error recovery helper
 */
export async function handleStreamError(
    dataStream: DataStreamWriter,
    error: Error | AnalysisError,
    context: { symbol?: string; stage?: string }
): Promise<void> {
    const errorData = {
        type: error instanceof AnalysisError ? error.type : AnalysisErrorType.ANALYSIS_TIMEOUT,
        message: error.message,
        recoverable: error instanceof AnalysisError ? error.recoverable : false,
        suggestedAction: error instanceof AnalysisError ? error.suggestedAction : 'Please try again',
        context,
        timestamp: new Date()
    }

    await streamChunk(dataStream, {
        type: 'error',
        data: errorData
    })
}