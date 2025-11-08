'use client'

import { CHAT_ID } from '@/lib/constants'
import { Model } from '@/lib/types/models'
import { cn } from '@/lib/utils'
import { useChat } from '@ai-sdk/react'
import { ChatRequestOptions, JSONValue } from 'ai'
import { Message } from 'ai/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ChatMessages } from './chat-messages'
import { ChatPanel } from './chat-panel'
import { useAppSelector } from '@/lib/store/hooks'
import dynamic from 'next/dynamic'
import { AdvancedModeState } from '@/types/chatInput'
import { useVibeTraderStream } from '@/hooks/use-vibe-trader-stream'
import { experimental_useObject as useObject } from '@ai-sdk/react'
import { tradingAdviceSchema } from '@/lib/schema/trading-advice'
import { setSymbol as tvSetSymbol, ready as chartReady, applyMultipleIndicators, clearAllIndicators, removeAllStudies } from '@/lib/tv/bridge'


// Define section structure
interface ChatSection {
  id: string // User message ID
  userMessage: Message
  assistantMessages: Message[]
}

export function Chat({
  id,
  savedMessages = [],
  query,
  models,
  advancedModeValues
}: {
  id: string
  savedMessages?: Message[]
  query?: string
  models?: Model[]
  advancedModeValues?: AdvancedModeState
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [adviceIndicatorsSet, setAdviceIndicatorsSet] = useState<Set<string>>(new Set())

  // Structured trading advice (Zod schema)
  const { submit: submitAdvice, object: adviceObject, isLoading: isAdviceLoading, error: adviceError } = useObject({
    api: '/api/trading-advice',
    id: 'vibe-trader-advice',
    schema: tradingAdviceSchema
  })

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    setMessages,
    stop,
    append,
    data,
    setData,
    addToolResult,
    reload
  } = useChat({
    initialMessages: savedMessages,
    id: CHAT_ID,
    body: {
      id,
      // Include latest unique advice indicators in the chat request body context
      adviceIndicators: useMemo(() => {
        const indicators = adviceObject?.technical?.indicators
        if (!Array.isArray(indicators)) return []
        const seen = new Set<string>()
        const unique = []
        for (const ind of indicators) {
          const name = String(ind?.name || '').toLowerCase()
          if (seen.has(name)) continue
          seen.add(name)
          unique.push({ name, parameters: ind?.parameters ?? {} })
        }
        return unique
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [adviceObject])
    },
    onFinish: () => {
      window.history.replaceState({}, '', `/search/${id}`)
      window.dispatchEvent(new CustomEvent('chat-history-updated'))
    },
    onError: error => {
      toast.error(`Error in chat: ${error.message}`)
    },
    sendExtraMessageFields: false, // Disable extra message fields,
    experimental_throttle: 100
  })

  const isLoading = status === 'submitted' || status === 'streaming'
  const advancedModeStoreValue = useAppSelector((s) => s.advancedMode.value);
  const advancedModeSymbol = useAppSelector((s) => s.advancedMode.symbol);

  // Vibe Trader streaming integration (reused from test interface)
  const {
    startStream,
    partialResults,
    isStreaming,
    currentStage,
    progress
  } = useVibeTraderStream({
    onChunkReceived: (chunk) => {
      if (chunk.type === 'technical_partial' && chunk.data?.indicators?.length) {
        console.log('[chat] Stream indicators (chunk):', chunk.data.indicators)
      }
    },
    onStatusUpdate: (status) => {
      console.log('[chat] Stream status:', status.stage, status.progress)
    },
    onError: (err) => {
      console.error('[chat] Stream error:', err)
    }
  })

  // Log indicators list from streaming partials
  useEffect(() => {
    const indicators = partialResults?.technical?.indicators
    if (Array.isArray(indicators) && indicators.length > 0) {
      console.log('[chat] Stream indicators:', indicators)
    }
  }, [partialResults?.technical?.indicators])

  // Basic visibility into stream lifecycle
  useEffect(() => {
    if (isStreaming) {
      console.log('[chat] Stream started. Stage:', currentStage, 'Progress:', progress)
    }
  }, [isStreaming])

  // Structured trading advice (already initialized above)

  // Log technical indicators from structured advice
  useEffect(() => {
    // console.log(adviceObject)
    // console.log(isAdviceLoading)
    // console.log(adviceError)
    const indicators = adviceObject?.technical?.indicators
    if (Array.isArray(indicators) && indicators.length > 0) {
      console.log('Structured advice indicators:', indicators)
      // alert('advice loaded')
    }
  }, [adviceObject])
  // Normalize indicator names/params from advice for TradingView studies
  const normalizeIndicator = (ind: any) => {
    const nameRaw = String(ind?.name || '').toLowerCase()
    const params = (ind?.parameters || {}) as Record<string, any>
    switch (nameRaw) {
      case 'sma':
        return { name: 'Moving Average', parameters: { length: params.length ?? 20 }, visible: true }
      case 'ema':
        return { name: 'Moving Average Exponential', parameters: { length: params.length ?? 20 }, visible: true }
      case 'rsi':
        return { name: 'Relative Strength Index', parameters: { length: params.length ?? 14 }, visible: true }
      case 'macd':
        return {
          name: 'MACD',
          parameters: {
            in_0: params.fast ?? params.in_0 ?? 12,
            in_1: params.slow ?? params.in_1 ?? 26,
            in_2: params.signal ?? params.in_2 ?? 9,
            in_3: params.source ?? params.in_3 ?? 'close'
          },
          visible: true
        }
      case 'bb':
      case 'bollinger':
      case 'bollinger_bands':
        return { name: 'Bollinger Bands', parameters: { length: params.length ?? 20, mult: params.stdDev ?? params.mult ?? 2 }, visible: true }
      case 'stoch':
      case 'stochastic':
        return { name: 'Stochastic', parameters: { k: params.k ?? 14, d: params.d ?? 3 }, visible: true }
      case 'vwma':
        return { name: 'VWMA', parameters: { length: params.length ?? 20 }, visible: true }
      case 'ichimoku':
      case 'ichimoku_cloud':
        return { name: 'Ichimoku Cloud', parameters: params, visible: true }
      default:
        return { name: ind?.name ?? 'Moving Average', parameters: params, visible: true }
    }
  }

  // Apply indicators to TradingView when structured advice arrives
  useEffect(() => {
    const indicators = adviceObject?.technical?.indicators
    if (!Array.isArray(indicators) || indicators.length === 0) return

      ; (async () => {
        try {
          await chartReady
          // Clear any existing indicators/studies (bridge + any others)
          await removeAllStudies()
          await clearAllIndicators()
          // Normalize and deduplicate by study name using a Set for uniqueness
          const uniqueNames = new Set<string>()
          const configByName = new Map<string, { name: string; parameters: Record<string, any>; visible: boolean }>()
          for (const ind of indicators) {
            const cfg = normalizeIndicator(ind)
            if (!uniqueNames.has(cfg.name)) {
              uniqueNames.add(cfg.name)
              configByName.set(cfg.name, cfg)
            }
          }
          console.log('[chat] unique indicators')
          // Expose the unique indicator names set for any other consumers
          setAdviceIndicatorsSet(uniqueNames)
          const configs = Array.from(configByName.values())
          await applyMultipleIndicators(configs)
        } catch (e) {
          console.error('Failed to apply indicators from advice:', e)
        }
      })()
  }, [adviceObject])

  // Convert messages array to sections array
  const sections = useMemo<ChatSection[]>(() => {
    const result: ChatSection[] = []
    let currentSection: ChatSection | null = null

    for (const message of messages) {
      if (message.role === 'user') {
        // Start a new section when a user message is found
        if (currentSection) {
          result.push(currentSection)
        }
        currentSection = {
          id: message.id,
          userMessage: message,
          assistantMessages: []
        }
      } else if (currentSection && message.role === 'assistant') {
        // Add assistant message to the current section
        currentSection.assistantMessages.push(message)
      }
      // Ignore other role types like 'system' for now
    }

    // Add the last section if exists
    if (currentSection) {
      result.push(currentSection)
    }

    return result
  }, [messages])

  // Detect if scroll container is at the bottom
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const threshold = 50 // threshold in pixels
      if (scrollHeight - scrollTop - clientHeight < threshold) {
        setIsAtBottom(true)
      } else {
        setIsAtBottom(false)
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Set initial state

    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // Scroll to the section when a new user message is sent
  useEffect(() => {
    if (sections.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage && lastMessage.role === 'user') {
        // If the last message is from user, find the corresponding section
        const sectionId = lastMessage.id
        requestAnimationFrame(() => {
          const sectionElement = document.getElementById(`section-${sectionId}`)
          sectionElement?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      }
    }
  }, [sections, messages])

  useEffect(() => {
    setMessages(savedMessages)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const onQuerySelect = (query: string) => {
    append({
      role: 'user',
      content: query
    })
  }

  const handleUpdateAndReloadMessage = async (
    messageId: string,
    newContent: string
  ) => {
    setMessages(currentMessages =>
      currentMessages.map(msg =>
        msg.id === messageId ? { ...msg, content: newContent } : msg
      )
    )

    try {
      const messageIndex = messages.findIndex(msg => msg.id === messageId)
      if (messageIndex === -1) return

      const messagesUpToEdited = messages.slice(0, messageIndex + 1)

      setMessages(messagesUpToEdited)

      setData(undefined)

      await reload({
        body: {
          chatId: id,
          regenerate: true
        }
      })
    } catch (error) {
      console.error('Failed to reload after message update:', error)
      toast.error(`Failed to reload conversation: ${(error as Error).message}`)
    }
  }

  const handleReloadFrom = async (
    messageId: string,
    options?: ChatRequestOptions
  ) => {
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex !== -1) {
      const userMessageIndex = messages
        .slice(0, messageIndex)
        .findLastIndex(m => m.role === 'user')
      if (userMessageIndex !== -1) {
        const trimmedMessages = messages.slice(0, userMessageIndex + 1)
        setMessages(trimmedMessages)
        return await reload(options)
      }
    }
    return await reload(options)
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setData(undefined)
    // Snapshot current input before it changes
    const currentInput = input?.trim()
    // Prepare unique advice indicators to include with this request
    const adviceIndicatorsData: JSONValue = (() => {
      const indicators = adviceObject?.technical?.indicators
      if (!Array.isArray(indicators)) return []
      const seen = new Set<string>()
      const unique: Array<{ name: string; parameters: Record<string, string | number | boolean> }> = []
      for (const ind of indicators) {
        const name = String(ind?.name || '').toLowerCase()
        if (seen.has(name)) continue
        seen.add(name)
        const rawParams = (ind as any)?.parameters ?? {}
        const pruned: Record<string, string | number | boolean> = {}
        for (const [k, v] of Object.entries(rawParams)) {
          if (['string', 'number', 'boolean'].includes(typeof v)) {
            pruned[k] = v as string | number | boolean
          }
        }
        unique.push({ name, parameters: pruned })
      }
      return unique
    })()
    handleSubmit(e, {
      data: {
        adviceIndicators: adviceIndicatorsData
      }
    })
    // If advanced mode is enabled and we have a symbol & prompt, start streaming + structured advice
    if (advancedModeStoreValue && advancedModeSymbol && currentInput) {
      try {
        // Fire-and-forget streaming analysis
        // startStream(advancedModeSymbol, '1D', currentInput)
        // Request structured advice object
        submitAdvice({ symbol: advancedModeSymbol, timeframe: '1D', query: currentInput })
      } catch (err) {
        console.error('Failed to start vibe trader stream or advice:', err)
      }
    }
  }

  useEffect(() => {
    console.log('######## ==> Advanced Mode Store Value: ', advancedModeStoreValue)
  }, [advancedModeStoreValue])

  return (
    <div
      className={cn(
        'relative flex h-full min-w-0 flex-1 flex-col',
        messages.length === 0 ? 'items-center justify-center' : ''
      )}
      data-testid="full-chat"
    >
      <ChatMessages
        sections={sections}
        data={data}
        onQuerySelect={onQuerySelect}
        isLoading={isLoading}
        chatId={id}
        addToolResult={addToolResult}
        scrollContainerRef={scrollContainerRef}
        onUpdateMessage={handleUpdateAndReloadMessage}
        reload={handleReloadFrom}
      />
      <ChatPanel
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={onSubmit}
        isLoading={isLoading}
        messages={messages}
        setMessages={setMessages}
        stop={stop}
        query={query}
        append={append}
        models={models}
        showScrollToBottomButton={!isAtBottom}
        scrollContainerRef={scrollContainerRef}
        advancedModeValues={advancedModeValues}
        chatId={id}
      />
    </div>
  )
}
