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

      // Ejecuta ambas consultas en paralelo: voces personalizadas y del sistema
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

})




