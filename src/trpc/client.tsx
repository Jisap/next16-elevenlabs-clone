'use client';


import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCContext } from '@trpc/tanstack-react-query';
import { useState } from 'react';
import { makeQueryClient } from './query-client';
import type { AppRouter } from './routers/_app';

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

export function TRPCReactProvider(                                          // Componente que envuelve la aplicación y proporciona el contexto de tRPC
  props: Readonly<{
    children: React.ReactNode;
  }>,
) {

  const queryClient = getQueryClient();                                     // Cliente de tanstack query (singleton)

  const [trpcClient] = useState(() =>                                       // Cliente de tRPC
    createTRPCClient<AppRouter>({                                           // Solo se crea una vez cuando se renderiza el componente, con tipado AppRouter -> procedimientos, argumentos que necesitas y que devuelven
      links: [                                                              // Agrupa las peticiones en una sola para mayor eficiencia
        httpBatchLink({
          // transformer: superjson, <-- if you use a data transformer
          url: getUrl(),                                                    // le dice al httpBatchLink a qué dirección URL debe enviar las peticiones 
        }),
      ],
    }),
  );

  return (
    // Habilita react Query
    <QueryClientProvider
      client={queryClient}
    >
      { }
      <TRPCProvider
        trpcClient={trpcClient}
        queryClient={queryClient}
      >
        {props.children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}