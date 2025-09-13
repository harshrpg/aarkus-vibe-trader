import { getRedisClient } from '@/lib/redis/config'

export async function POST(req: Request) {
    try {
        const { chatId, advancedChatEnabled, advancedChatSymbol } = await req.json()

        if (!chatId || typeof chatId !== 'string') {
            return new Response('chatId is required', { status: 400 })
        }

        const redis = await getRedisClient()
        // Ensure we only update preferences on existing chats to avoid creating partial hashes
        const existing = await redis.hgetall<Record<string, any>>(`chat:${chatId}`)
        if (!existing || Object.keys(existing).length === 0) {
            return new Response('Chat not found', { status: 404 })
        }

        const pipeline = redis.pipeline()
        pipeline.hmset(`chat:${chatId}`, {
            advancedChatEnabled: String(advancedChatEnabled),
            advancedChatSymbol: String(advancedChatSymbol)
        })
        await pipeline.exec()

        return new Response('OK')
    } catch (error) {
        console.error('Failed to persist chat preferences:', error)
        return new Response('Internal Server Error', { status: 500 })
    }
}


