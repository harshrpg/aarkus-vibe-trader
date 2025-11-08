// import { Chat } from '@/components/chat'
// import { getModels } from '@/lib/config/models'
// import { generateId } from 'ai'

// export const dynamic = 'force-dynamic'

// export default async function Page() {
//   const id = generateId()
//   const models = await getModels()
//   return <Chat id={id} models={models} />
// }

import { Chat } from '@/components/chat';
import { getModels } from '@/lib/config/models';
import { generateId } from 'ai';
import dynamic from 'next/dynamic';

const TradingViewWrapper = dynamic(() => import('@/components/tv/trading-view-wrapper'), {
  ssr: true,
});

export default async function Agent() {
  const id = generateId()
  const models = await getModels()
  return (
    <>
      <div id="agent-container" className='grid grid-cols-3 gap-4 h-screen overflow-hidden'>
        <div className="col-span-2 w-full h-screen overflow-hidden border-r border-slate-800">
          <TradingViewWrapper />
        </div>
        <div className="h-screen overflow-y-auto min-h-0">
          <Chat id={id} models={models} />
        </div>
      </div>
    </>
  )
}