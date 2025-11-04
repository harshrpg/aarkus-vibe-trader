import { z } from 'zod'

// Technical indicator configuration to drive TV chart overlays
export const technicalIndicatorSchema = z.object({
    name: z
        .string()
        .min(1)
        .describe(
            'Indicator name (e.g., sma, ema, rsi, macd, bb, ichimoku, vwma, stoch)'
        ),
    parameters: z
        .record(z.union([z.string(), z.number(), z.boolean()]))
        .default({})
        .describe('Indicator parameters (e.g., { length: 50 })')
})

// Support/Resistance levels for technical analysis
export const supportResistanceSchema = z.object({
    level: z.number().describe('Price level'),
    type: z.enum(['SUPPORT', 'RESISTANCE']).describe('Level type'),
    confidence: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .default(0.5)
        .describe('Model confidence 0-1')
})

export const technicalAnalysisSchema = z.object({
    text: z
        .string()
        .describe('User-facing technical analysis summary to display in UI'),
    supportResistance: z
        .array(supportResistanceSchema)
        .default([])
        .describe('Key support and resistance levels'),
    indicators: z
        .array(technicalIndicatorSchema)
        .default([])
        .describe('Indicators to render on the chart')
})

export const fundamentalAnalysisSchema = z.object({
    text: z
        .string()
        .describe('User-facing fundamental analysis summary to display in UI')
})

// High-level trading advice payload
export const tradingAdviceSchema = z.object({
    text: z
        .string()
        .describe('Top-level summary of the advice to show the user'),
    fundamental: fundamentalAnalysisSchema.describe('Fundamental analysis section'),
    technical: technicalAnalysisSchema.describe('Technical analysis section')
})

export type TechnicalIndicator = z.infer<typeof technicalIndicatorSchema>
export type SupportResistance = z.infer<typeof supportResistanceSchema>
export type TechnicalAnalysisAdvice = z.infer<typeof technicalAnalysisSchema>
export type FundamentalAnalysisAdvice = z.infer<typeof fundamentalAnalysisSchema>
export type TradingAdvice = z.infer<typeof tradingAdviceSchema>


