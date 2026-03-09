import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from '@tanstack/react-query';
import superjson from 'superjson';

export function makeQueryClient() {                   // Cliente de tanstack query
  return new QueryClient({                            // Opciones por defecto del cliente de tanstack query
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,                         // Tiempo en el que los datos se consideran frescos
      },
      dehydrate: {                                    // Serialización de datos (datos del servidor convertidos a un formato que el navegdor pueda leer)
        // serializeData: superjson.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
      },
      hydrate: {                                      // Deserialización de los datos (datos del server "deshidratados" rellenan la cache de react-query en el cliente)
        // deserializeData: superjson.deserialize,
      },
    },
  });
}