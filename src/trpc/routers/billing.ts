import { TRPCError } from "@trpc/server";
import { polar } from "@/lib/polar";
import { env } from "@/lib/env";
import { createTRPCRouter, orgProcedure } from "../init";

export const billingRouter = createTRPCRouter({

  createCheckout: orgProcedure.mutation(async ({ ctx }) => {        // Mutación: crea sesión de pago
    const result = await polar.checkouts.create({
      products: [env.POLAR_PRODUCT_ID],                             // Producto a contratar
      externalCustomerId: ctx.orgId,                                // Vincula el pago a la organización
      successUrl: process.env.APP_URL,                              // Redirige tras pago exitoso
    });

    if (!result.url) {                                              // Valida que se generó la URL
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create checkout session",
      });
    }

    return { checkoutUrl: result.url };                             // Devuelve la URL de pago
  }),

  createPortalSession: orgProcedure.mutation(async ({ ctx }) => {   // Mutación: abre portal del cliente
    const result = await polar.customerSessions.create({
      externalCustomerId: ctx.orgId,                                // Identifica al cliente por org
    });

    if (!result.customerPortalUrl) {                                // Valida que se generó la URL
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create customer portal session",
      });
    }

    return { portalUrl: result.customerPortalUrl };                 // Devuelve la URL del portal
  }),

  getStatus: orgProcedure.query(async ({ ctx }) => {                // Query: estado de suscripción
    try {
      const customerState = await polar.customers.getStateExternal({
        externalId: ctx.orgId,                                      // Busca el cliente por ID externo
      });

      const hasActiveSubscription =
        (customerState.activeSubscriptions ?? []).length > 0;       // True si tiene alguna suscripción activa

      let estimatedCostCents = 0;                                   // Acumulador del coste estimado en céntimos
      for (const sub of customerState.activeSubscriptions ?? []) {  // Itera suscripciones activas
        for (const meter of sub.meters ?? []) {                     // Itera medidores de uso de cada suscripción
          estimatedCostCents += meter.amount ?? 0;                  // Suma el coste de cada medidor
        }
      }

      return {
        hasActiveSubscription,                                      // Estado de suscripción
        customerId: customerState.id,                               // ID interno del cliente en Polar
        estimatedCostCents,                                         // Coste total estimado acumulado
      };

    } catch {
      // El cliente aún no existe en Polar
      return {
        hasActiveSubscription: false,                               // Sin suscripción por defecto
        customerId: null,                                           // Sin ID asignado
        estimatedCostCents: 0,                                      // Sin coste
      };
    }
  }),
});