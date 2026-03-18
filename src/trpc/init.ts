import * as Sentry from "@sentry/node";
import { auth } from '@clerk/nextjs/server';
import { initTRPC, TRPCError } from '@trpc/server';
import { cache } from 'react';
import SuperJSON from 'superjson';

export const createTRPCContext = cache(async () => {                   // Contexto de tRPC
  /**
   * @see: https://trpc.io/docs/server/context
   */
  return {};
});


const t = initTRPC.create({                                             // Instancia de tRPC
  transformer: SuperJSON,                                               // SuperJSON intercepta TODAS las respuestas de tRPC
});

const sentryMiddleware = t.middleware(                                  // Captura errores de tRPC
  Sentry.trpcMiddleware({
    attachRpcInput: true,                                               // Adjunta el input de tRPC a Sentry cuando se produce un error
  }),
);


// Base router and procedure helpers
export const createTRPCRouter = t.router;                               // Router de tRPC
export const createCallerFactory = t.createCallerFactory;               // Factory de tRPC (server-side caller for a router)
export const baseProcedure = t.procedure.use(sentryMiddleware);         // Public Procedure de tRPC con captura de errores

// Authenticated procedure - calls auth() only when needed
export const authProcedure = baseProcedure.use(async ({ next }) => {
  const { userId } = await auth();

  if (!userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: { userId },
  });
});

// Organization procedure - requires userId and orgId
export const orgProcedure = baseProcedure.use(async ({ next }) => {
  const { userId, orgId } = await auth();

  if (!userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  if (!orgId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Organization required",
    });
  }

  return next({ ctx: { userId, orgId } });
});