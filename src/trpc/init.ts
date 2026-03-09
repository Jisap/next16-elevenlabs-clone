import { initTRPC } from '@trpc/server';
import { cache } from 'react';

export const createTRPCContext = cache(async () => {                   // Contexto de tRPC
  /**
   * @see: https://trpc.io/docs/server/context
   */
  return { userId: 'user_123' };
});


const t = initTRPC.create({                                            // Instancia de tRPC
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  // transformer: superjson,
});

// Base router and procedure helpers
export const createTRPCRouter = t.router;                               // Router de tRPC
export const createCallerFactory = t.createCallerFactory;               // Factory de tRPC (server-side caller for a router)
export const baseProcedure = t.procedure;                               // Procedure de tRPC