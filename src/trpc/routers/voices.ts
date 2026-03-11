import { prisma } from "@/lib/db";
import { deleteAudio } from "@/lib/r2";
import { TRPCError } from "@trpc/server";
import z from "zod";
import { createTRPCRouter, orgProcedure } from "../init";


export const voicesRouter = createTRPCRouter({
  getAll: orgProcedure                                                    // Procedimiento que requiere autenticación de organización
    .input(
      z
        .object({
          query: z.string().trim().optional(),                            // Texto de búsqueda opcional
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const searchFilter = input?.query                                   // Si existe query, crea filtro de búsqueda insensible a mayúsculas
        ? {
          OR: [                                                           // Busca en nombre O descripción
            {
              name: {
                contains: input.query,
                mode: "insensitive" as const                              // Búsqueda sin importar mayúsculas/minúsculas
              }
            },
            {
              description: {
                contains: input.query,
                mode: "insensitive" as const,
              },
            },
          ],
        }
        : {};                                                             // Si no hay query, filtro vacío

      // Ejecuta ambas consultas en paralelo: 
      // voces personalizadas y del sistema
      const [custom, system] = await Promise.all([
        prisma.voice.findMany({
          where: {
            variant: "CUSTOM",                                            // Solo voces creadas por la organización
            orgId: ctx.orgId,                                             // Filtra por ID de la organización actual
            ...searchFilter,                                              // Aplica filtro de búsqueda si existe
          },
          orderBy: { createdAt: "desc" },                                 // Ordena por fecha de creación (más reciente primero)
          select: {                                                       // Selecciona solo estos campos para la respuesta
            id: true,
            name: true,
            description: true,
            category: true,
            language: true,
            variant: true,
          },
        }),
        prisma.voice.findMany({
          where: {
            variant: "SYSTEM",                                            // Solo voces del sistema (disponibles para todas las orgs)
            ...searchFilter,                                              // Aplica filtro de búsqueda si existe
          },
          orderBy: { name: "asc" },                                       // Ordena alfabéticamente por nombre
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            language: true,
            variant: true,
          },
        }),
      ]);

      return { custom, system };                                          // Retorna ambas listas separadas
    }),

  delete: orgProcedure                                                    // Procedimiento protegido que requiere autenticación de organización
    .input(z.object({ id: z.string() }))                                  // Valida que se reciba el ID de la voz a eliminar
    .mutation(async ({ ctx, input }) => {                                 // Mutación para eliminar una voz
      const voice = await prisma.voice.findUnique({                       // Busca la voz en la base de datos
        where: {
          id: input.id,                                                       // Identificador de la voz a eliminar
          variant: "CUSTOM",                                                  // Solo permite eliminar voces personalizadas (no del sistema)
          orgId: ctx.orgId,                                                   // Verifica que la voz pertenezca a la organización
        },
        select: { id: true, r2ObjectKey: true },                              // Selecciona solo los campos necesarios
      });

      if (!voice) {                                                       // Si no se encuentra la voz
        throw new TRPCError({                                             // Lanza error 404
          code: "NOT_FOUND",
          message: "Voice not found",
        });
      }

      await prisma.voice.delete({ where: { id: voice.id } });             // Elimina la voz de la base de datos

      if (voice.r2ObjectKey) {                                            // Si la voz tiene audio almacenado en R2
        await deleteAudio(voice.r2ObjectKey).catch(() => { });            // Elimina el archivo de audio (ignora errores)
      }

      return { success: true };                                           // Retorna confirmación de éxito
    }),

});





