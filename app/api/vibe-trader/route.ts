import { getCurrentUserId } from '@/lib/auth/get-current-user'
import { createVibeTraderStreamResponse } from '@/lib/streaming/vibe-trader-stream'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
    try {
        const { symbol, timeframe, query } = await req.json()

        // Validate required parameters
        if (!symbol) {
            return new Response('Symbol is required', { status: 400 })
        }

        // Get user context
        const userId = await getCurrentUserId()
        const cookieStore = await cookies()
        const modelJson = cookieStore.get('selectedModel')?.value

        // Default model configuration
        let selectedModel = 'openai:gpt-4o-mini'
        if (modelJson) {
            try {
                const modelData = JSON.parse(modelJson)
                selectedModel = `${modelData.providerId}:${modelData.id}`
            } catch (error) {
                console.warn('Failed to parse model cookie:', error)
            }
        }

        // Create streaming response
        return createVibeTraderStreamResponse({
            symbol: symbol.toUpperCase().trim(),
            timeframe: timeframe || '1D',
            query: query || `Analyze ${symbol} for trading opportunities`,
            model: selectedModel,
            userId,
            chatId: `vibe-trader-${Date.now()}`
        })

    } catch (error) {
        console.error('Vibe Trader API route error:', error)
        return new Response('Error processing analysis request', {
            status: 500,
        })
    }
}