import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getSignedAudioUrl } from "@/lib/r2";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ generationId: string }> },
) {
  // Verifica que hay un usuario y organización autenticados con Clerk
  // Si no los hay, corta aquí — nadie accede sin autenticación
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { generationId } = await params;

  // Busca el audio filtrando por ID y por orgId — así una organización
  // nunca puede acceder al audio de otra aunque conozca el ID
  const generation = await prisma.generation.findUnique({
    where: { id: generationId, orgId },
  });

  if (!generation) {
    return new Response("Not found", { status: 404 });
  }

  // El audio puede no estar listo todavía si R2 aún no terminó de recibirlo
  if (!generation.r2ObjectKey) {
    return new Response("Audio is not available yet", { status: 409 });
  }

  // En lugar de devolver la URL firmada al cliente, el servidor hace él mismo
  // el fetch y retransmite los bytes — así la URL de R2 nunca llega al navegador
  const signedUrl = await getSignedAudioUrl(generation.r2ObjectKey);
  const audioResponse = await fetch(signedUrl);

  if (!audioResponse.ok) {
    return new Response("Failed to fetch audio", { status: 502 });
  }

  return new Response(audioResponse.body, {
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "private, max-age=3600", // Cacheable 1h solo en el navegador, nunca en proxies intermedios
    },
  });
};