import { auth } from "@clerk/nextjs/server";
import { parseBuffer } from "music-metadata";
import { z } from "zod";
//import { polar } from "@/lib/polar";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { uploadAudio } from "@/lib/r2";
import { VOICE_CATEGORIES } from "@/features/voices/data/voice-categories";
import type { VoiceCategory } from "@/generated/prisma/client";

const createVoiceSchema = z.object({
  name: z.string().min(1, "Voice name is required"),
  category: z.enum(VOICE_CATEGORIES as [VoiceCategory, ...VoiceCategory[]]),
  language: z.string().min(1, "Language is required"),
  description: z.string().nullish(),
});

const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const MIN_AUDIO_DURATION_SECONDS = 10;

/**
 * 
 * @param request 
 * @returns 
 * 
 *  Recibe un archivo de audio junto con sus metadatos, 
 *  lo valida exhaustivamente y lo persiste en base de datos (Prisma) 
 *  y en almacenamiento de objetos (R2).
 */


export async function POST(request: Request) {
  // Autenticación y autorización
  const { userId, orgId } = await auth();                                 // Requiere ambos identificadores. La presencia de orgId implica que las voces pertenecen a organizaciones, no a usuarios individuales

  if (!userId || !orgId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check for active subscription before voice creation
  // try {
  //   const customerState = await polar.customers.getStateExternal({
  //     externalId: orgId,
  //   });
  //   const hasActiveSubscription =
  //     (customerState.activeSubscriptions ?? []).length > 0;
  //   if (!hasActiveSubscription) {
  //     return Response.json({ error: "SUBSCRIPTION_REQUIRED" }, { status: 403 });
  //   }
  // } catch {
  //   // Customer doesn't exist in Polar yet -> no subscription
  //   return Response.json({ error: "SUBSCRIPTION_REQUIRED" }, { status: 403 });
  // }

  // Validación de parámetros de consulta
  const url = new URL(request.url);                                                // Se crea una instancia de URL para poder acceder a los query parameters

  const validation = createVoiceSchema.safeParse({                                 // Los metadatos llegan como query params en la URL, no en el body (que está reservado para el binario del audio):
    name: url.searchParams.get("name"),
    category: url.searchParams.get("category"),
    language: url.searchParams.get("language"),
    description: url.searchParams.get("description"),
  });

  if (!validation.success) {                                                       // Si la validación falla, se devuelve un error
    return Response.json(
      {
        error: "Invalid input",
        issues: validation.error.issues,
      },
      { status: 400 },
    );
  }

  const { name, category, language, description } = validation.data;               // Se extraen los datos validados

  const fileBuffer = await request.arrayBuffer();                                  // Se lee el body de la petición como un ArrayBuffer

  if (!fileBuffer.byteLength) {                                                    // Si el body está vacío, se devuelve un error
    return Response.json(
      { error: "Please upload an audio file" },
      { status: 400 },
    );
  }

  if (fileBuffer.byteLength > MAX_UPLOAD_SIZE_BYTES) {                             // Si el archivo excede el tamaño máximo, se devuelve un error
    return Response.json(
      { error: "Audio file exceeds the 20 MB size limit" },
      { status: 413 },
    );
  }

  const contentType = request.headers.get("content-type");                         // Se obtiene el Content-Type del header

  if (!contentType) {                                                              // Si no se especifica Content-Type, se devuelve un error
    return Response.json(
      { error: "Missing Content-Type header" },
      { status: 400 },
    );
  }

  const normalizedContentType =                                                    // Se normaliza el Content-Type
    contentType.split(";")[0]?.trim() || "audio/wav";                              // Se elimina cualquier parámetro adicional (como charset) y se establece "audio/wav" como valor por defecto

  // Validate audio format and duration
  let duration: number;
  try {
    const metadata = await parseBuffer(                                            // Se parsea el buffer para obtener metadatos
      new Uint8Array(fileBuffer),
      { mimeType: normalizedContentType },
      { duration: true },
    );
    duration = metadata.format.duration ?? 0;                                      // Se obtiene la duración del audio
  } catch {
    return Response.json(
      { error: "File is not a valid audio file" },                                 // Si el parseo falla, se devuelve un error
      { status: 422 },
    );
  }

  if (duration < MIN_AUDIO_DURATION_SECONDS) {                                     // Si el audio es muy corto, se devuelve un error
    return Response.json(
      {
        error: `Audio too short (${duration.toFixed(1)}s). Minimum duration is ${MIN_AUDIO_DURATION_SECONDS} seconds.`,
      },
      { status: 422 },
    );
  }

  let createdVoiceId: string | null = null;

  // Estrategia de persistencia — patrón create → upload → update
  try {
    const voice = await prisma.voice.create({                                       // 1. Crear registro en BD (obtenemos el ID)
      data: {
        name,
        variant: "CUSTOM",
        orgId,
        description,
        category,
        language,
      },
      select: {
        id: true,
      },
    });

    createdVoiceId = voice.id;                                                      // Obtenemos el id
    const r2ObjectKey = `voices/orgs/${orgId}/${voice.id}`;                         // 2º Generamos la clave única para R2 con ese id

    await uploadAudio({                                                             // 3º Subimos el audio a R2
      buffer: Buffer.from(fileBuffer),
      key: r2ObjectKey,
      contentType: normalizedContentType,
    });

    await prisma.voice.update({                                                     // 4º Actualizamos el registro en BD con la clave R2
      where: {
        id: voice.id,
      },
      data: {
        r2ObjectKey,
      },
    });
  } catch {
    if (createdVoiceId) {
      await prisma.voice
        .delete({
          where: {
            id: createdVoiceId,
          },
        })
        .catch(() => { });
    }

    return Response.json(
      { error: "Failed to create voice. Please retry." },
      { status: 500 },
    );
  }

  // Ingest usage event to Polar (fire-and-forget, don't block response)
  // polar.events
  //   .ingest({
  //     events: [
  //       {
  //         name: env.POLAR_METER_VOICE_CREATION,
  //         externalCustomerId: orgId,
  //         metadata: {},
  //         timestamp: new Date(),
  //       },
  //     ],
  //   })
  //   .catch(() => {
  //     // Silently fail - don't break the user experience for metering errors
  //   });

  return Response.json(
    { name, message: "Voice created successfully" },
    { status: 201 },
  );
};