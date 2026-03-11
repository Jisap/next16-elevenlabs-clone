import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from '@tanstack/react-query';
import superjson from 'superjson';

export function makeQueryClient() {                   // Crea una instancia del cliente de React Query con configuración por defecto
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,                         // Los datos se consideran frescos 30s — evita refetches innecesarios
      },
      dehydrate: {                                    // DESHIDRATAR: saca los datos de la cache del servidor y los aplana para enviarlos al cliente
        serializeData: superjson.serialize,           // Serializa con SuperJSON en lugar de JSON nativo — preserva tipos como Date, Set, Map...
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',           // Incluye también queries en vuelo — el cliente hereda el estado y no hace fetch duplicado (Suspense)
      },
      hydrate: {                                      // HIDRATAR: recibe los datos del servidor y rellena la cache del cliente con ellos
        deserializeData: superjson.deserialize,       // Deserializa con SuperJSON — reconstruye los tipos originales (Date, Set, Map...) antes de meter los datos en la cache
      },
    },
  });
}

// server -> Deshidrata -> serializa -> texto plano -> envía al cliente -> Hidrata -> deserializa
//         (saca de cache)                                               (pone en cache) 