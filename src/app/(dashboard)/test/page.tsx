
import { Suspense } from 'react'
import HealthCheck from './health-check'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'

const page = () => {

  prefetch(trpc.health.queryOptions())

  return (
    <HydrateClient>
      <div className='flex flex-col items-center justify-center gap-4 p-8'>
        <h1 className='text-2xl font-bold'>TRPC Text Page</h1>
        <Suspense fallback={<p>Loading...</p>}>
          <HealthCheck />
        </Suspense>
      </div>
    </HydrateClient>
  )
}

export default page