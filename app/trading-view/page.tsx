// 'use client';

import { Chat } from '@/components/chat';
// import TradingViewWrapper from '@/components/trading-view-wrapper';
import { getModels } from '@/lib/config/models';
import { generateId } from 'ai';
import dynamic from 'next/dynamic';


const TradingViewWrapper = dynamic(() => import('@/components/tv/trading-view-wrapper'), {
    ssr: true,
});

export default async function TradingViewPage() {
    const id = generateId();
    const models = await getModels();
    return (
        <div className='p-0 flex gap-4 border border-red-600 h-screen min-h-0'>
            <div className='flex-[2] min-w-0 h-screen'>
                <TradingViewWrapper />
            </div>
            <div className='flex-1 min-w-0 h-screen overflow-auto'>
                <Chat id={id} models={models} />
            </div>
        </div>
    )

} 