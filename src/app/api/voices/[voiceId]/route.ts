import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getSignedAudioUrl } from "@/lib/r2";


/**
 * 
 * @param _request - Request object
 * @param param1 - Params object containing voiceId
 * @returns Response object with voice audio
 * 
 *  Este endpoint sirve el audio de una voz (sample de referencia)
 *  almacenada en R2 (Cloudflare), con autenticación 
 *  y control de acceso por organización.
 */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ voiceId: string }> },
) {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { voiceId } = await params;                                // Obtiene el voiceId de los parámetros de la ruta

  const voice = await prisma.voice.findUnique({                    // Busca la voz en la base de datos
    where: { id: voiceId },
    select: {
      variant: true,
      orgId: true,
      r2ObjectKey: true,
    },
  });

  if (!voice) {
    return new Response("Not found", { status: 404 });
  }

  if (voice.variant === "CUSTOM" && voice.orgId !== orgId) {
    return new Response("Not found", { status: 404 });
  }

  if (!voice.r2ObjectKey) {
    return new Response("Voice audio is not available yet", { status: 409 });
  }

  const signedUrl = await getSignedAudioUrl(voice.r2ObjectKey);                                // Obtiene la URL firmada de la voz
  const audioResponse = await fetch(signedUrl);                                                // Obtiene la respuesta de la URL firmada

  if (!audioResponse.ok) {
    return new Response("Failed to fetch voice audio", { status: 502 });
  }

  const contentType =                                                                          // Obtiene el tipo de contenido de la respuesta
    audioResponse.headers.get("content-type") || "audio/wav";

  return new Response(audioResponse.body, {                                                    // Devuelve la respuesta con el contenido de la voz
    headers: {
      "Content-Type": contentType,
      "Cache-Control":
        voice.variant === "SYSTEM"
          ? "public, max-age=86400"
          : "private, max-age=3600",
    },
  });
};

// GET /voices/[voiceId]/audio
//
// 1. Verificar auth (Clerk) → userId + orgId
//    └─ sin auth → 401 Unauthorized
//
// 2. Buscar voz en DB (Prisma) → variant, orgId, r2ObjectKey
//    └─ no existe → 404 Not found
//
// 3. ¿Voz CUSTOM de otra org? (voice.orgId !== orgId)
//    └─ sí → 404 Denegado (no se revela que existe)
//
// 4. ¿Tiene r2ObjectKey? (audio disponible en R2)
//    └─ no → 409 Aún procesando
//
// 5. Obtener URL firmada → getSignedAudioUrl(r2ObjectKey)
//
// 6. Fetch interno del audio desde R2
//    └─ error → 502 Bad Gateway
//
// 7. → 200 Stream de audio
//       SYSTEM: public, max-age=86400 (24h, cacheable en CDN)
//       CUSTOM: private, max-age=3600 (1h, solo navegador)