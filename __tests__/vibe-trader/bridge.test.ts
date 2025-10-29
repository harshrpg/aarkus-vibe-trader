/**
 * Unit tests for TradingView bridge chart controller extensions
 * Tests indicator management, pattern drawing, and price target visualization
 */

import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import {
    IndicatorConfig,
    PatternResult,
    PriceTarget,
    SupportResistanceLevel,
    ChartCoordinate,
    PatternType,
    applyIndicator,
    applyMultipleIndicators,
    removeIndicator,
    getAppliedIndicators,
    clearAllIndicators,
    addMovingAverage,
    addBollingerBands,
    addStochastic,
    interpretIndicatorSignals,
    drawTrendLine,
    drawSupportResistanceLevel,
    drawPattern,
    drawMultiplePatterns,
    removePattern,
    clearAllPatterns,
    getAppliedPatterns,
    drawPriceTarget,
    drawMultiplePriceTargets,
    updatePriceTarget,
    removePriceTarget,
    clearAllPriceTargets,
    getAppliedPriceTargets,
    drawTradingLevels,
    createDynamicPriceTargets,
    registerWidget,
    unregisterWidget
} from '../../lib/tv/bridge';

// Mock TradingView widget and chart
const mockChart = {
    createStudy: jest.fn(),
    removeEntity: jest.fn(),
    createShape: jest.fn(),
    resetData: jest.fn(),
    setSymbol: jest.fn()
};

const mockWidget = {
    activeChart: jest.fn(() => mockChart)
};

// Mock global TradingView
(global as any).window = {
    TradingView: {
        widget: jest.fn(() => mockWidget)
    }
};

describe('TradingView Bridge - Indicator Management', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        registerWidget(mockWidget as any);
    });

    afterEach(() => {
        unregisterWidget();
    });

    describe('applyIndicator', () => {
        it('should apply a single indicator with optimized parameters', async () => {
            const config: IndicatorConfig = {
                name: 'RSI',
                parameters: { length: 14 },
                visible: true
            };

            mockChart.createStudy.mockReturnValue('study-id-1');

            const result = await applyIndicator(config);

            expect(mockChart.createStudy).toHaveBeenCalledWith(
                'RSI',
                false,
                true,
                { length: 14 }
            );
            expect(result).toBe('study-id-1');
        });

        it('should optimize indicator parameters based on defaults', async () => {
            const config: IndicatorConfig = {
                name: 'MACD',
                parameters: {},
                visible: true
            };

            mockChart.createStudy.mockReturnValue('study-id-2');

            await applyIndicator(config);

            expect(mockChart.createStudy).toHaveBeenCalledWith(
                'MACD',
                false,
                true,
                { in_0: 12, in_1: 26, in_2: 9, in_3: 'close' }
            );
        });

        it('should throw error when chart is not available', async () => {
            unregisterWidget();

            const config: IndicatorConfig = {
                name: 'RSI',
                parameters: { length: 14 },
                visible: true
            };

            await expect(applyIndicator(config)).rejects.toThrow('Chart not available');
        });
    });

    describe('applyMultipleIndicators', () => {
        it('should apply multiple indicators successfully', async () => {
            const configs: IndicatorConfig[] = [
                { name: 'RSI', parameters: { length: 14 }, visible: true },
                { name: 'MACD', parameters: {}, visible: true }
            ];

            mockChart.createStudy
                .mockReturnValueOnce('rsi-study')
                .mockReturnValueOnce('macd-study');

            const results = await applyMultipleIndicators(configs);

            expect(results).toEqual(['rsi-study', 'macd-study']);
            expect(mockChart.createStudy).toHaveBeenCalledTimes(2);
        });

        it('should handle errors gracefully and continue with other indicators', async () => {
            const configs: IndicatorConfig[] = [
                { name: 'RSI', parameters: { length: 14 }, visible: true },
                { name: 'INVALID', parameters: {}, visible: true }
            ];

            mockChart.createStudy
                .mockReturnValueOnce('rsi-study')
                .mockImplementationOnce(() => {
                    throw new Error('Invalid indicator');
                });

            const results = await applyMultipleIndicators(configs);

            expect(results).toEqual(['rsi-study', null]);
        });
    });

    describe('removeIndicator', () => {
        it('should remove an applied indicator', async () => {
            const config: IndicatorConfig = {
                name: 'RSI',
                parameters: { length: 14 },
                visible: true
            };

            mockChart.createStudy.mockReturnValue('study-id');
            await applyIndicator(config);

            await removeIndicator('RSI');

            expect(mockChart.removeEntity).toHaveBeenCalledWith('study-id');
        });
    });

    describe('specialized indicator functions', () => {
        it('should add moving average with correct parameters', async () => {
            mockChart.createStudy.mockReturnValue('ma-study');

            const result = await addMovingAverage(20, 'SMA');

            expect(mockChart.createStudy).toHaveBeenCalledWith(
                'Moving Average',
                false,
                true,
                { length: 20 }
            );
            expect(result).toBe('ma-study');
        });

        it('should add Bollinger Bands with correct parameters', async () => {
            mockChart.createStudy.mockReturnValue('bb-study');

            const result = await addBollingerBands(20, 2);

            expect(mockChart.createStudy).toHaveBeenCalledWith(
                'Bollinger Bands',
                false,
                true,
                { length: 20, mult: 2 }
            );
            expect(result).toBe('bb-study');
        });

        it('should add Stochastic with correct parameters', async () => {
            mockChart.createStudy.mockReturnValue('stoch-study');

            const result = await addStochastic(14, 3);

            expect(mockChart.createStudy).toHaveBeenCalledWith(
                'Stochastic',
                false,
                true,
                { k: 14, d: 3 }
            );
            expect(result).toBe('stoch-study');
        });
    });

    describe('interpretIndicatorSignals', () => {
        it('should return indicator interpretations for applied indicators', async () => {
            const config: IndicatorConfig = {
                name: 'RSI',
                parameters: { length: 14 },
                visible: true
            };

            mockChart.createStudy.mockReturnValue('rsi-study');
            await applyIndicator(config);

            const results = await interpretIndicatorSignals();

            expect(results).toHaveLength(1);
            expect(results[0]).toMatchObject({
                name: 'RSI',
                interpretation: expect.stringContaining('momentum'),
                signal: 'NEUTRAL'
            });
        });
    });
});

describe('TradingView Bridge - Pattern Drawing', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        registerWidget(mockWidget as any);
    });

    afterEach(() => {
        unregisterWidget();
    });

    describe('drawTrendLine', () => {
        it('should draw a trend line with correct parameters', async () => {
            const startPoint: ChartCoordinate = { time: 1000, price: 100 };
            const endPoint: ChartCoordinate = { time: 2000, price: 110 };

            mockChart.createShape.mockReturnValue('trendline-shape');

            const result = await drawTrendLine(startPoint, endPoint);

            expect(mockChart.createShape).toHaveBeenCalledWith(
                { time: 1000, price: 100 },
                {
                    shape: 'trend_line',
                    overrides: {
                        color: '#2196F3',
                        lineWidth: 2
                    },
                    text: ''
                }
            );
            expect(result).toMatchObject({
                id: expect.stringContaining('trendline_'),
                shape: 'trendline-shape'
            });
        });

        it('should apply custom styling to trend line', async () => {
            const startPoint: ChartCoordinate = { time: 1000, price: 100 };
            const endPoint: ChartCoordinate = { time: 2000, price: 110 };
            const style = { color: '#FF0000', lineWidth: 3 };

            mockChart.createShape.mockReturnValue('trendline-shape');

            await drawTrendLine(startPoint, endPoint, style, 'Custom Line');

            expect(mockChart.createShape).toHaveBeenCalledWith(
                { time: 1000, price: 100 },
                {
                    shape: 'trend_line',
                    overrides: {
                        color: '#FF0000',
                        lineWidth: 3
                    },
                    text: 'Custom Line'
                }
            );
        });
    });

    describe('drawSupportResistanceLevel', () => {
        it('should draw support level with correct styling', async () => {
            const level: SupportResistanceLevel = {
                level: 100,
                strength: 3,
                type: 'SUPPORT',
                touches: 5,
                description: 'Strong support'
            };

            mockChart.createShape.mockReturnValue('support-shape');

            const result = await drawSupportResistanceLevel(level);

            expect(mockChart.createShape).toHaveBeenCalledWith(
                { time: expect.any(Number), price: 100 },
                {
                    shape: 'horizontal_line',
                    overrides: {
                        color: '#4CAF50',
                        lineWidth: 3,
                        lineStyle: 1 // Strong levels use dashed lines when strength <= 3
                    },
                    text: 'SUPPORT 100.00 (5 touches)'
                }
            );
            expect(result).toMatchObject({
                id: 'support_100',
                shape: 'support-shape'
            });
        });

        it('should draw resistance level with correct styling', async () => {
            const level: SupportResistanceLevel = {
                level: 120,
                strength: 2,
                type: 'RESISTANCE',
                touches: 3,
                description: 'Weak resistance'
            };

            mockChart.createShape.mockReturnValue('resistance-shape');

            await drawSupportResistanceLevel(level);

            expect(mockChart.createShape).toHaveBeenCalledWith(
                { time: expect.any(Number), price: 120 },
                {
                    shape: 'horizontal_line',
                    overrides: {
                        color: '#F44336',
                        lineWidth: 2,
                        lineStyle: 1
                    },
                    text: 'RESISTANCE 120.00 (3 touches)'
                }
            );
        });
    });

    describe('drawPattern', () => {
        it('should draw triangle pattern correctly', async () => {
            const pattern: PatternResult = {
                type: 'TRIANGLE_ASCENDING',
                confidence: 0.8,
                coordinates: [
                    { time: 1000, price: 100 },
                    { time: 1500, price: 105 },
                    { time: 2000, price: 110 },
                    { time: 2500, price: 108 }
                ],
                description: 'Ascending triangle',
                implications: ['Bullish breakout expected'],
                priceTargets: []
            };

            mockChart.createShape.mockReturnValue('pattern-shape');

            const result = await drawPattern(pattern);

            expect(mockChart.createShape).toHaveBeenCalled();
            expect(result).toBeInstanceOf(Array);
        });
    });

    describe('drawMultiplePatterns', () => {
        it('should draw multiple patterns successfully', async () => {
            const patterns: PatternResult[] = [
                {
                    type: 'TRIANGLE_ASCENDING',
                    confidence: 0.8,
                    coordinates: [
                        { time: 1000, price: 100 },
                        { time: 2000, price: 110 }
                    ],
                    description: 'Pattern 1',
                    implications: [],
                    priceTargets: []
                },
                {
                    type: 'SUPPORT_LEVEL',
                    confidence: 0.7,
                    coordinates: [
                        { time: 1000, price: 95 },
                        { time: 2000, price: 95 }
                    ],
                    description: 'Pattern 2',
                    implications: [],
                    priceTargets: []
                }
            ];

            mockChart.createShape.mockReturnValue('pattern-shape');

            const results = await drawMultiplePatterns(patterns);

            expect(results).toHaveLength(2);
            expect(mockChart.createShape).toHaveBeenCalled();
        });
    });
});

describe('TradingView Bridge - Price Target Visualization', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        registerWidget(mockWidget as any);
    });

    afterEach(() => {
        unregisterWidget();
    });

    describe('drawPriceTarget', () => {
        it('should draw entry price target with correct styling', async () => {
            const target: PriceTarget = {
                level: 105,
                type: 'ENTRY',
                confidence: 0.8,
                reasoning: 'Technical breakout level'
            };

            mockChart.createShape.mockReturnValue('entry-target');

            const result = await drawPriceTarget(target);

            expect(mockChart.createShape).toHaveBeenCalledWith(
                { time: expect.any(Number), price: 105 },
                {
                    shape: 'horizontal_line',
                    overrides: {
                        color: '#2196F3',
                        lineWidth: 2,
                        lineStyle: 0
                    },
                    text: 'Entry: 105.00 (80%)'
                }
            );
            expect(result).toMatchObject({
                id: 'entry_105',
                line: 'entry-target'
            });
        });

        it('should draw stop loss target with correct styling', async () => {
            const target: PriceTarget = {
                level: 95,
                type: 'STOP_LOSS',
                confidence: 0.9,
                reasoning: 'Risk management level'
            };

            mockChart.createShape.mockReturnValue('stop-loss-target');

            const result = await drawPriceTarget(target);

            expect(mockChart.createShape).toHaveBeenCalledWith(
                { time: expect.any(Number), price: 95 },
                {
                    shape: 'horizontal_line',
                    overrides: {
                        color: '#F44336',
                        lineWidth: 3,
                        lineStyle: 0
                    },
                    text: 'Stop Loss: 95.00 (90%)'
                }
            );
        });

        it('should use dashed line for low confidence targets', async () => {
            const target: PriceTarget = {
                level: 110,
                type: 'TARGET',
                confidence: 0.5,
                reasoning: 'Speculative target'
            };

            mockChart.createShape.mockReturnValue('target-shape');

            await drawPriceTarget(target);

            expect(mockChart.createShape).toHaveBeenNthCalledWith(1,
                { time: expect.any(Number), price: 110 },
                {
                    shape: 'horizontal_line',
                    overrides: {
                        color: '#4CAF50',
                        lineWidth: 2, // TARGET type has lineWidth: 2 in styleMap
                        lineStyle: 1
                    },
                    text: 'Target: 110.00 (50%)'
                }
            );
        });
    });

    describe('drawMultiplePriceTargets', () => {
        it('should draw multiple price targets successfully', async () => {
            const targets: PriceTarget[] = [
                {
                    level: 105,
                    type: 'ENTRY',
                    confidence: 0.8,
                    reasoning: 'Entry point'
                },
                {
                    level: 115,
                    type: 'TARGET',
                    confidence: 0.7,
                    reasoning: 'Price target'
                }
            ];

            mockChart.createShape.mockReturnValue('target-shape');

            const results = await drawMultiplePriceTargets(targets);

            expect(results).toHaveLength(2);
            expect(mockChart.createShape).toHaveBeenCalledTimes(4); // 2 targets + 2 labels
        });
    });

    describe('drawTradingLevels', () => {
        it('should draw complete trading setup with entry, target, and stop loss', async () => {
            mockChart.createShape.mockReturnValue('level-shape');

            const results = await drawTradingLevels(100, 110, 95, 'Breakout trade');

            expect(results).toHaveLength(3);
            expect(mockChart.createShape).toHaveBeenCalledTimes(6); // 3 levels + 3 labels
        });
    });

    describe('updatePriceTarget', () => {
        it('should update existing price target', async () => {
            const originalTarget: PriceTarget = {
                level: 105,
                type: 'ENTRY',
                confidence: 0.8,
                reasoning: 'Original entry'
            };

            const updatedTarget: PriceTarget = {
                level: 107,
                type: 'ENTRY',
                confidence: 0.9,
                reasoning: 'Updated entry'
            };

            mockChart.createShape.mockReturnValue('target-shape');

            // Draw original target
            await drawPriceTarget(originalTarget);

            // Update target
            const result = await updatePriceTarget('entry_105', updatedTarget);

            expect(mockChart.removeEntity).toHaveBeenCalled();
            expect(result).toMatchObject({
                id: 'entry_107'
            });
        });
    });

    describe('createDynamicPriceTargets', () => {
        it('should create dynamic price targets with update callback', async () => {
            const baseTargets: PriceTarget[] = [
                {
                    level: 100,
                    type: 'ENTRY',
                    confidence: 0.8,
                    reasoning: 'Dynamic entry'
                }
            ];

            const updateCallback = jest.fn();
            mockChart.createShape.mockReturnValue('dynamic-target');

            const results = await createDynamicPriceTargets(baseTargets, updateCallback);

            expect(results).toHaveLength(1);
            expect(mockChart.createShape).toHaveBeenCalled();

            // Wait for dynamic update with shorter timeout for testing
            await new Promise(resolve => setTimeout(resolve, 100));
            // Note: In real implementation, this would be triggered by market data
            // For testing, we just verify the initial setup works
        }, 10000);
    });

    describe('management functions', () => {
        it('should track applied price targets', async () => {
            const target: PriceTarget = {
                level: 105,
                type: 'ENTRY',
                confidence: 0.8,
                reasoning: 'Test target'
            };

            mockChart.createShape.mockReturnValue('target-shape');
            await drawPriceTarget(target);

            const appliedTargets = getAppliedPriceTargets();
            expect(appliedTargets).toContain('entry_105');
        });

        it('should remove price target by ID', async () => {
            const target: PriceTarget = {
                level: 105,
                type: 'ENTRY',
                confidence: 0.8,
                reasoning: 'Test target'
            };

            mockChart.createShape.mockReturnValue('target-shape');
            await drawPriceTarget(target);

            await removePriceTarget('entry_105');

            expect(mockChart.removeEntity).toHaveBeenCalledWith('target-shape');
        });

        it('should clear all price targets', async () => {
            const targets: PriceTarget[] = [
                { level: 105, type: 'ENTRY', confidence: 0.8, reasoning: 'Entry' },
                { level: 115, type: 'TARGET', confidence: 0.7, reasoning: 'Target' }
            ];

            mockChart.createShape.mockReturnValue('target-shape');
            await drawMultiplePriceTargets(targets);

            await clearAllPriceTargets();

            expect(mockChart.removeEntity).toHaveBeenCalledTimes(2);
        });
    });
});