import 'server-only'; // <-- ensure this file cannot be imported from the client

import { createTRPCOptionsProxy, TRPCQueryOptions } from '@trpc/tanstack-react-query';
import { createTRPCClient, httpLink } from '@trpc/client';
import { cache } from 'react';
import { createTRPCContext } from './init';
import { makeQueryClient } from './query-client';
import { appRouter } from './routers/_app';
import type { AppRouter } from './routers/_app';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';


export const getQueryClient = cache(makeQueryClient); // QueryClient memoizado en cache. Siempre se devuelve la misma instancia en cada request

export const trpc = createTRPCOptionsProxy({          // Crea un proxy que permite llamar a tus procedimientos directamente en Server Components con total seguridad de tipos, sin pasar por HTTP.
  ctx: createTRPCContext,
  router: appRouter,
  queryClient: getQueryClient,
});

// HydrateClient: El puente entre servidor y cliente. 
//
// dehydrate(queryClient)  →  serializa el estado a JSON plano
//         │
//         ▼
// HydrationBoundary  →  envía ese JSON en el HTML al navegador
//         │
//         ▼
// Navegador  →  TanStack rehidrata ese JSON en el QueryClient del cliente

export function HydrateClient(props: { children: React.ReactNode }) {

  const queryClient = getQueryClient();

  return (
    <HydrationBoundary
      state={dehydrate(queryClient)}
    >
      {props.children}
    </HydrationBoundary>
  );
}

// Precarga de datos en el QueryClient para que el cliente no tenga que hacer peticiones al servidor.
export function prefetch<T extends ReturnType<TRPCQueryOptions<any>>>(
  queryOptions: T,
) {
  const queryClient = getQueryClient();
  if (queryOptions.queryKey[1]?.type === 'infinite') {
    void queryClient.prefetchInfiniteQuery(queryOptions as any);
  } else {
    void queryClient.prefetchQuery(queryOptions);
  }
}


// Server Component
//      │
//      ├─ prefetch(trpc.procedure.queryOptions())
//      │        │
//      │        └─ getQueryClient()  ─────────────────┐
//      │             │                                │
//      │             └─ queryClient.prefetchQuery()   │  misma instancia
//      │                  │                           │  (gracias a cache)
//      │                  └─ datos guardados en caché │
//      │                                              │
//      ├─ <HydrateClient>                             │
//      │        │                                     │
//      │        └─ getQueryClient()  ─────────────────┘
//      │             │
//      │             └─ dehydrate(queryClient)
//      │                  │
//      │                  └─ JSON serializado en el HTML
//      │                            │
//      │                            ▼
//      │                       Navegador
//      │                            │
//      │                            └─ QueryClient del cliente
//      │                                 rehidratado con los datos
//      │
//      └─ <ClientComponent />
//      │
//      └─ useQuery() → datos ya en caché ✅ (sin petición extra) 
