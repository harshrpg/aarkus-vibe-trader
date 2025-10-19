/**
 * This bridge exposes an API for the Trading View chart
 * Using this bridge we can control the chart with a controller
 * 
 * Author: Harsh Gupta
 */

// lib/tradingview/bridge.ts
"use client";
import type { IChartingLibraryWidget, IChartWidgetApi } from "@/public/charting_library/charting_library";

let widgetRef: IChartingLibraryWidget | null = null;
let chartRef: IChartWidgetApi | null = null;

// A promise that resolves when the widget is ready
let _resolve!: () => void;
export const ready = new Promise<void>((res) => (_resolve = res));

export function registerWidget(widget: IChartingLibraryWidget) {
    widgetRef = widget;
    chartRef = widget.activeChart();
    _resolve?.();
}

export function unregisterWidget() {
    widgetRef = null;
    chartRef = null;
}

// ---- public, awaitable actions ----
export async function addMACD(params?: Record<string, any>) {
    await ready;
    chartRef?.createStudy("MACD", false, false, params ?? { in_0: 12, in_1: 26, in_2: 9, in_3: "close" });
}

export async function setSymbol(symbol: string, interval: string = "1D") {
    await ready;
    await chartRef?.setSymbol(symbol, interval);
}

export async function addRSI(length = 14) {
    await ready;
    chartRef?.createStudy("Relative Strength Index", false, false, { length });
}

export async function resetChart() {
    await ready;
    chartRef?.resetData();
}
