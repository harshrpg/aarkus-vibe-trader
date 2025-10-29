import { useState, useCallback, useRef, useEffect } from 'react'
import type {
    AnalysisResult,
    AnalysisStreamChunk,
    TechnicalPartialChunk,
    FundamentalPartialChunk,
    RecommendationsPartialChunk,
    AnalysisStatusChunk,
    AnalysisErrorChunk
} from '@/lib/types/trading'

interface StreamState {
    isStreaming: boolean
    currentStage: string
    progress: number
    error: string | null
    partialResults: {
        technical?: TechnicalPartialChunk
        fundamental?: FundamentalPartialChunk
        recommendations?: RecommendationsPartialChunk
    }
    finalResult?: AnalysisResult
    lastUpdate: Date | null
}

interface UseVibeTraderStreamOptions {
    onChunkReceived?: (chunk: AnalysisStreamChunk) => void
    onComplete?: (result: AnalysisResult) => void
    onError?: (error: string) => void
    onStatusUpdate?: (status: AnalysisStatusChunk) => void
}

export function useVibeTraderStream(options: UseVibeTraderStreamOptions = {}) {
    const [streamState, setStreamState] = useState<StreamState>({
        isStreaming: false,
        currentStage: 'idle',
        progress: 0,
        error: null,
        partialResults: {},
        lastUpdate: null
    })

    const abortControllerRef = useRef<AbortController | null>(null)
    const streamReaderRef = useRef<ReadableStreamDefaultReader | null>(null)

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopStream()
        }
    }, [])

    const startStream = useCallback(async (symbol: string, timeframe: string = '1D', query?: string) => {
        try {
            // Stop any existing stream
            stopStream()

            // Create new abort controller
            abortControllerRef.current = new AbortController()

            // Reset state
            setStreamState({
                isStreaming: true,
                currentStage: 'initializing',
                progress: 0,
                error: null,
                partialResults: {},
                lastUpdate: new Date()
            })

            // Start streaming request
            const response = await fetch('/api/vibe-trader', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    symbol: symbol.toUpperCase().trim(),
                    timeframe,
                    query: query || `Analyze ${symbol} for trading opportunities`
                }),
                signal: abortControllerRef.current.signal
            })

            if (!response.ok) {
                throw new Error(`Analysis request failed: ${response.statusText}`)
            }

            if (!response.body) {
                throw new Error('No response body received')
            }

            // Process streaming response
            const reader = response.body.getReader()
            streamReaderRef.current = reader

            await processStream(reader)

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.log('Stream aborted by user')
                return
            }

            const errorMessage = error instanceof Error ? error.message : 'Stream failed'
            setStreamState(prev => ({
                ...prev,
                error: errorMessage,
                isStreaming: false
            }))
            options.onError?.(errorMessage)
        }
    }, [options])

    const processStream = async (reader: ReadableStreamDefaultReader) => {
        const decoder = new TextDecoder()
        let buffer = ''

        try {
            while (true) {
                const { done, value } = await reader.read()

                if (done) {
                    setStreamState(prev => ({
                        ...prev,
                        isStreaming: false,
                        currentStage: 'complete',
                        progress: 100,
                        lastUpdate: new Date()
                    }))
                    break
                }

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            await processStreamLine(line)
                        } catch (error) {
                            console.error('Error processing stream line:', error)
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Stream processing error:', error)
            throw error
        }
    }

    const processStreamLine = async (line: string) => {
        try {
            // Handle AI SDK streaming format
            if (line.startsWith('0:')) {
                // Text chunk - can be ignored for analysis streaming
                return
            }

            if (line.startsWith('8:')) {
                // Message annotation
                const jsonStr = line.substring(2)
                const annotation = JSON.parse(jsonStr)

                if (annotation.type === 'vibe_trader_chunk') {
                    await handleStreamChunk(annotation.data)
                }
            }

            if (line.startsWith('d:')) {
                // Data chunk
                const jsonStr = line.substring(2)
                const data = JSON.parse(jsonStr)

                if (data.type === 'vibe_trader_chunk') {
                    await handleStreamChunk(data.data)
                }
            }
        } catch (error) {
            console.error('Error parsing stream line:', error)
        }
    }

    const handleStreamChunk = async (chunk: AnalysisStreamChunk) => {
        // Notify listeners
        options.onChunkReceived?.(chunk)

        switch (chunk.type) {
            case 'status':
                handleStatusChunk(chunk.data as AnalysisStatusChunk)
                break

            case 'technical_partial':
                handleTechnicalChunk(chunk.data as TechnicalPartialChunk)
                break

            case 'fundamental_partial':
                handleFundamentalChunk(chunk.data as FundamentalPartialChunk)
                break

            case 'recommendations_partial':
                handleRecommendationsChunk(chunk.data as RecommendationsPartialChunk)
                break

            case 'complete':
                handleCompleteChunk(chunk.data as AnalysisResult)
                break

            case 'error':
                handleErrorChunk(chunk.data as AnalysisErrorChunk)
                break
        }
    }

    const handleStatusChunk = (status: AnalysisStatusChunk) => {
        setStreamState(prev => ({
            ...prev,
            currentStage: status.stage,
            progress: status.progress,
            lastUpdate: new Date()
        }))
        options.onStatusUpdate?.(status)
    }

    const handleTechnicalChunk = (technical: TechnicalPartialChunk) => {
        setStreamState(prev => ({
            ...prev,
            partialResults: {
                ...prev.partialResults,
                technical
            },
            lastUpdate: new Date()
        }))
    }

    const handleFundamentalChunk = (fundamental: FundamentalPartialChunk) => {
        setStreamState(prev => ({
            ...prev,
            partialResults: {
                ...prev.partialResults,
                fundamental
            },
            lastUpdate: new Date()
        }))
    }

    const handleRecommendationsChunk = (recommendations: RecommendationsPartialChunk) => {
        setStreamState(prev => ({
            ...prev,
            partialResults: {
                ...prev.partialResults,
                recommendations
            },
            lastUpdate: new Date()
        }))
    }

    const handleCompleteChunk = (result: AnalysisResult) => {
        setStreamState(prev => ({
            ...prev,
            finalResult: result,
            isStreaming: false,
            currentStage: 'complete',
            progress: 100,
            lastUpdate: new Date()
        }))
        options.onComplete?.(result)
    }

    const handleErrorChunk = (error: AnalysisErrorChunk) => {
        const errorMessage = error.message || 'Analysis failed'
        setStreamState(prev => ({
            ...prev,
            error: errorMessage,
            isStreaming: false,
            lastUpdate: new Date()
        }))
        options.onError?.(errorMessage)
    }

    const stopStream = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }

        if (streamReaderRef.current) {
            streamReaderRef.current.cancel()
            streamReaderRef.current = null
        }

        setStreamState(prev => ({
            ...prev,
            isStreaming: false
        }))
    }, [])

    const restartStream = useCallback(async (symbol: string, timeframe?: string, query?: string) => {
        stopStream()
        // Small delay to ensure cleanup
        await new Promise(resolve => setTimeout(resolve, 100))
        await startStream(symbol, timeframe, query)
    }, [stopStream, startStream])

    return {
        streamState,
        startStream,
        stopStream,
        restartStream,
        isStreaming: streamState.isStreaming,
        currentStage: streamState.currentStage,
        progress: streamState.progress,
        error: streamState.error,
        partialResults: streamState.partialResults,
        finalResult: streamState.finalResult,
        lastUpdate: streamState.lastUpdate
    }
}