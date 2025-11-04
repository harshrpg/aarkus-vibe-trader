import { cookies } from 'next/headers'
import { getModel } from '@/lib/utils/registry'
// no-op
import { streamObject } from 'ai'
import { tradingAdviceSchema } from '@/lib/schema/trading-advice'

export async function POST(req: Request) {
    try {
        const { symbol, timeframe = '1D', query } = await req.json()

        const cookieStore = await cookies()
        const modelJson = cookieStore.get('selectedModel')?.value

        let selectedModel = 'openai:gpt-4o-mini'
        if (modelJson) {
            try {
                const modelData = JSON.parse(modelJson)
                selectedModel = `${modelData.providerId}:${modelData.id}`
            } catch {
                // fallback remains default
            }
        }

        const system = `You are Vibe Trader. Generate structured trading advice matching the provided schema. Keep prose concise; ensure valid JSON.`

        const user = `Symbol: ${String(symbol || '').toUpperCase()}
Timeframe: ${timeframe}
Request: ${query || 'Provide trading advice'}`

        // Stream pure JSON text back to the client for useObject
        const result = streamObject({
            model: getModel(selectedModel),
            system,
            prompt: user,
            // Explicitly use schema-backed object output
            output: 'object',
            schema: tradingAdviceSchema
        })

        return result.toTextStreamResponse({
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        })
    } catch (error) {
        console.error('Trading advice API error:', error)
        return new Response('Error processing advice', { status: 500 })
    }
}


