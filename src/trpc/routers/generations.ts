import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
//import { polar } from "@/lib/polar";
import { env } from "@/lib/env";
import { TRPCError } from "@trpc/server";
import { chatterbox } from "@/lib/chatterbox-client";
import { prisma } from "@/lib/db";
import { uploadAudio } from "@/lib/r2";
import { TEXT_MAX_LENGTH } from "@/features/text-to-speech/data/constants";
import { createTRPCRouter, orgProcedure } from "../init";

export const generationsRouter = createTRPCRouter({
  getById: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const generation = await prisma.generation.findUnique({
        where: { id: input.id, orgId: ctx.orgId },
        omit: {
          orgId: true,
          r2ObjectKey: true,
        },
      });

      if (!generation) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return {
        ...generation,
        audioUrl: `/api/audio/${generation.id}`,
      };
    }),

  getAll: orgProcedure.query(async ({ ctx }) => {
    const generations = await prisma.generation.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { createdAt: "desc" },
      omit: {
        orgId: true,
        r2ObjectKey: true,
      },
    });

    return generations;
  }),

  create: orgProcedure
    .input(
      z.object({
        text: z.string().min(1).max(TEXT_MAX_LENGTH),
        voiceId: z.string().min(1),
        temperature: z.number().min(0).max(2).default(0.8),
        topP: z.number().min(0).max(1).default(0.95),
        topK: z.number().min(1).max(10000).default(1000),
        repetitionPenalty: z.number().min(1).max(2).default(1.2),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check for active subscription before generation
      // try {
      //   const customerState = await polar.customers.getStateExternal({
      //     externalId: ctx.orgId,
      //   });
      //   const hasActiveSubscription =
      //     (customerState.activeSubscriptions ?? []).length > 0;
      //   if (!hasActiveSubscription) {
      //     throw new TRPCError({
      //       code: "FORBIDDEN",
      //       message: "SUBSCRIPTION_REQUIRED",
      //     });
      //   }
      // } catch (err) {
      //   if (err instanceof TRPCError) throw err;
      //   // Customer doesn't exist in Polar yet -> no subscription
      //   throw new TRPCError({
      //     code: "FORBIDDEN",
      //     message: "SUBSCRIPTION_REQUIRED",
      //   });
      // }

      const voice = await prisma.voice.findUnique({                   // Busca en la base de datos la voz solicitada. 
        where: {
          id: input.voiceId,
          OR: [
            { variant: "SYSTEM" },
            { variant: "CUSTOM", orgId: ctx.orgId, }
          ],
        },
        select: {
          id: true,
          name: true,
          r2ObjectKey: true,
        },
      });

      if (!voice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Voice not found",
        });
      }

      if (!voice.r2ObjectKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Voice audio not available",
        });
      }

      const { data, error } = await chatterbox.POST("/generate", {     // Llama al endpoint /generate de tu API Modal mandando el texto y los parámetros
        body: {
          prompt: input.text,
          voice_key: voice.r2ObjectKey,
          temperature: input.temperature,
          top_p: input.topP,
          top_k: input.topK,
          repetition_penalty: input.repetitionPenalty,
          norm_loudness: true,
        },
        parseAs: "arrayBuffer",                                         //  La respuesta llega como ArrayBuffer (bytes de audio crudo)
      });

      Sentry.logger.info("Generation started", {                        // Logger de Sentry,info "Generation started"
        orgId: ctx.orgId,
        voiceId: input.voiceId,
        textLength: input.text.length,
      });

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate audio",
        });
      }

      if (!(data instanceof ArrayBuffer)) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Invalid audio response",
        });
      }

      const buffer = Buffer.from(data);
      let generationId: string | null = null;
      let r2ObjectKey: string | null = null;

      try {
        const generation = await prisma.generation.create({                  // Crea el registro en BD primero, sin el audio todavía.
          data: {                                                            // Solo guarda los metadatos: texto, voz, parámetros del modelo, etc.
            orgId: ctx.orgId,
            text: input.text,
            voiceName: voice.name,
            voiceId: voice.id,
            temperature: input.temperature,
            topP: input.topP,
            topK: input.topK,
            repetitionPenalty: input.repetitionPenalty,
          },
          select: {
            id: true,
          },
        });

        generationId = generation.id;                                        // Guarda el ID fuera del try para poder usarlo en el catch si algo falla
        r2ObjectKey = `generations/orgs/${ctx.orgId}/${generation.id}`;      // Construye la ruta donde se guardará el audio en R2 

        await uploadAudio({ buffer, key: r2ObjectKey });                     // Sube el audio (bytes crudos) a R2, el almacenamiento de Cloudflare                   

        await prisma.generation.update({                                     // Ahora que el audio está subido, actualiza el registro en BD con la clave R2 para que luego se pueda recuperar el archivo
          where: {
            id: generation.id,
          },
          data: {
            r2ObjectKey,
          },
        });

        Sentry.logger.info("Audio generated", {                               // Logger de Sentry.info "Audio generated"
          orgId: ctx.orgId,
          generationId: generation.id,
        });
      } catch {
        // Si cualquiera de los 3 pasos anteriores falla, limpia el registro
        // de BD para no dejar datos huérfanos (un registro sin audio asociado)
        if (generationId) {
          await prisma.generation
            .delete({
              where: {
                id: generationId,
              },
            })
            .catch(() => { });
        }

        Sentry.logger.error("Generation failed", {                        // Logger de Sentry.error "Generation failed"
          orgId: ctx.orgId,
          voiceId: input.voiceId,
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to store generated audio",
        });
      }

      if (!generationId || !r2ObjectKey) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to store generated audio",
        });
      }

      // Ingest usage event to Polar (fire-and-forget, don't block response)
      // polar.events
      //   .ingest({
      //     events: [
      //       {
      //         name: env.POLAR_METER_TTS_GENERATION,
      //         externalCustomerId: ctx.orgId,
      //         metadata: { [env.POLAR_METER_TTS_PROPERTY]: input.text.length },
      //         timestamp: new Date(),
      //       },
      //     ],
      //   })
      //  .catch(() => {
      //    // Silently fail - don't break the user experience for metering errors
      //  });

      return {
        id: generationId,
      };
    }),
});