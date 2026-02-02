'use client';

import { useAppSelector } from "@/lib/store/hooks";
import Datafeed from "@/lib/tradingview/datafeed";
import { registerWidget, setSymbol as setChartSymbol, unregisterWidget } from "@/lib/tv/bridge";
import { loadScript, loadCSS } from "@/lib/tv/utils";
import { IChartingLibraryWidget, IChartWidgetApi } from "@/public/charting_library/charting_library";
import { useEffect, useRef, useState } from "react";
import { Spinner } from "../ui/spinner";
import LoadingComponents from "../complex-components/ui/loading-component";

// Global state to track script loading
let scriptsLoaded = false;
let loadingPromise: Promise<void> | null = null;

const TradingViewWrapper = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const symbol = useAppSelector((s) => s.advancedMode.symbol);

    useEffect(() => {
        let isMounted = true;
        let widget: IChartingLibraryWidget | null = null;

        const loadScripts = async () => {
            if (scriptsLoaded) {
                return;
            }

            if (loadingPromise) {
                return loadingPromise;
            }

            loadingPromise = (async () => {
                try {
                    console.log('[trading-view-wrapper] Loading Scripts');
                    console.log('[trading-view-wrapper] Loading charting-library');
                    await loadScript('/charting_library/charting_library/charting_library.js');

                    console.log('[trading-view-wrapper] Loading datafeeds');
                    await loadScript('/charting_library/datafeeds/udf/dist/bundle.js');

                    // Load CSS file
                    loadCSS('/charting_library/themed.css');

                    scriptsLoaded = true;
                    console.log('[trading-view-wrapper] Scripts loaded successfully');
                } catch (error) {
                    console.error('[trading-view-wrapper] Error loading scripts:', error);
                    throw error;
                }
            })();

            return loadingPromise;
        };

        const initWidget = async () => {
            try {
                if (!isMounted) return;
                console.log('[trading-view-wrapper] initializing widget');

                await loadScripts();
                console.log('[trading-view-wrapper] Checking if container reference exists: ', containerRef.current);

                if (!isMounted || !containerRef.current) return;

                // Wait a bit for scripts to be fully loaded
                await new Promise(resolve => setTimeout(resolve, 100));

                // Initialize the TradingView widget
                if (typeof window !== 'undefined' && (window as any).TradingView) {
                    widget = new (window as any).TradingView.widget({
                        container: containerRef.current,
                        symbol: symbol, // Default symbol
                        interval: '1D',
                        theme: 'light',
                        style: '1',
                        locale: 'en',
                        toolbar_bg: '#f1f3f6',
                        enable_publishing: false,
                        allow_symbol_change: true,
                        container_id: 'tradingview_widget',
                        width: '100%',
                        height: '100%',
                        fullscreen: false,
                        // Configure the correct bundle path
                        library_path: '/charting_library/charting_library/',
                        // Load custom CSS
                        custom_css_url: '/charting_library/themed.css',
                        datafeed: Datafeed
                    });
                    widget?.onChartReady(() => {
                        // alert('Chart Ready')
                        console.log('[trading-view-wrapper] On Chart Ready');
                        console.debug('[trading-view-wrapper] On Chart Ready::Registering widget with app');
                        registerWidget(widget as IChartingLibraryWidget);
                        // const chart: IChartWidgetApi | undefined = widget?.activeChart();
                        // chart?.createStudy('MACD', false, false, { in_0: 14, in_1: 30, in_3: 'close', in_2: 9 });
                    });

                    console.log('[trading-view-wrapper] Widget Initialized successfully');
                    if (isMounted) {
                        setIsLoading(false);
                    }
                } else {
                    throw new Error('TradingView library not available');
                }
            } catch (error) {
                console.error('Error occurred while initializing tv widget: ', error);
                if (isMounted) {
                    setError(error instanceof Error ? error.message : 'Failed to initialize widget');
                    setIsLoading(false);
                }
            }
        };

        initWidget();

        // Cleanup function
        return () => {
            isMounted = false;
            if (widget && typeof widget.remove === 'function') {
                widget.remove();
            }
            unregisterWidget();
        };
    }, []); // Empty dependency array to run only once

    // Update chart symbol when global store symbol changes
    useEffect(() => {
        if (!symbol) return;
        (async () => {
            try {
                await setChartSymbol(symbol);
            } catch (e) {
                console.error('[trading-view-wrapper] Failed to update symbol on chart: ', e);
            }
        })();
    }, [symbol]);

    if (error) {
        return (
            <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#000'
            }}>
                <div style={{ color: 'red', textAlign: 'center' }}>
                    <h3>Error loading TradingView widget</h3>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            backgroundColor: '#000'
        }}>
            <div ref={containerRef} id="tradingview_widget" style={{ width: '100%', height: '100%' }}></div>
            <div className="absolute bottom-3 left-3 z-10 rounded-md bg-black/60 px-3 py-1 text-xs text-white">
                This chart is powered by{' '}
                <a
                    href="https://www.tradingview.com"
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2 hover:text-white/90"
                >
                    TradingView
                </a>
                , the go-to charting library, embraced by millions of traders.
            </div>
            {isLoading && (
                <div className="w-full h-full absolute inset-0">
                    <LoadingComponents componentName={'Trading View Chart'} />
                </div>
            )}
        </div>
    );
};

export default TradingViewWrapper;