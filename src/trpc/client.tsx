'use client';


import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCContext } from '@trpc/tanstack-react-query';
import { useState } from 'react';
import { makeQueryClient } from './query-client';
import type { AppRouter } from './routers/_app';
import SuperJSON from 'superjson';

/**
 *  Este archivo configura la infraestructura de red de tu frontend. Garantiza que:
 *     1º Tengas seguridad de tipos al llamar al backend.
 *     2º Las peticiones se agrupen (batching) para mayor eficiencia.
 *     3º La caché funcione correctamente tanto en el servidor como en el navegador
 */



export const {
  TRPCProvider,                                                             // Componente que envuelve la aplicación y proporciona el contexto de tRPC
  useTRPC                                                                   // Hook para usar el contexto de tRPC
} = createTRPCContext<AppRouter>();                                         // Genera el Provider y hook tipados con el AppRouter

let browserQueryClient: QueryClient;                                        // Cliente de tanstack query para el navegador


function getQueryClient() {                                                 // Cliente de tanstack query
  if (typeof window === 'undefined') {                                      // Si estamos en el servidor
    return makeQueryClient();                                               // Creamos un nuevo cliente
  }

  if (!browserQueryClient) browserQueryClient = makeQueryClient();          // En el navegador si no existe el cliente, lo creamos
  return browserQueryClient;                                                // Devolvemos el cliente
}

function getUrl() {                                                         // URL de tRPC
  const base = (() => {
    if (typeof window !== 'undefined') return '';                           // Si en el navegador windows existe -> retorna "". La url /api/trpc funciona porque el navegador ya sabe el dominio actual
    if (process.env.APP_URL) return process.env.APP_URL;                    // En el servidor si existe APP_URL -> retorna APP_URL
    return 'http://localhost:3000';                                         // En el servidor si no existe APP_URL -> retorna "http://localhost:3000"
  })();
  return `${base}/api/trpc`;
}

export function TRPCReactProvider(                                          // Envuelve la app con los contextos de tRPC y React Query — necesario para usar trpc y useQuery en cualquier componente hijo
  props: Readonly<{
    children: React.ReactNode;
  }>,
) {

  const queryClient = getQueryClient();                                     // Singleton del cliente de React Query — misma instancia en server y client para compartir cache

  const [trpcClient] = useState(() =>                                       // useState sin setter — se crea una sola vez y nunca se re-inicializa aunque el componente se re-renderice
    createTRPCClient<AppRouter>({                                           // AppRouter aporta tipado completo: procedimientos disponibles, argumentos que aceptan y lo que devuelven
      links: [                                                              // Pipeline por donde pasan todas las peticiones antes de llegar al servidor
        httpBatchLink({                                                     // Agrupa múltiples llamadas tRPC simultáneas en una sola petición HTTP — reduce latencia
          transformer: SuperJSON,                                           // Serializa/deserializa con SuperJSON — preserva tipos como Date, Set, Map en el viaje cliente ↔ servidor
          url: getUrl(),                                                    // URL del endpoint tRPC — varía entre server (/api/trpc) y client (URL absoluta con dominio)
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider                                                    // Inyecta el cliente de React Query en el árbol — habilita useQuery, useMutation, etc. en los hijos
      client={queryClient}
    >
      <TRPCProvider                                                         // Inyecta el cliente de tRPC y lo conecta con React Query — enruta las llamadas tRPC a través de la cache
        trpcClient={trpcClient}
        queryClient={queryClient}
      >
        {props.children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}