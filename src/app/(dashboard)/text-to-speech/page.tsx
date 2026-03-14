

import { TextToSpeechView } from "@/features/text-to-speech/views/text-to-speech-view";
import type { Metadata } from "next";
import { trpc, HydrateClient, prefetch } from "@/trpc/server";


export const metadata: Metadata = {
  title: "Text to Speech",
  description: "Text to Speech",
};

const TextToSpeechPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ text?: string; voiceId?: string }>;
}) => {

  const { text, voiceId } = await searchParams;

  prefetch(trpc.voices.getAll.queryOptions());
  // Ejecuta la query en servidor y mete
  // el resultado en la cache — arranca el
  // ciclo deshidratar → serializar → deserializar → hidratar

  return (
    <>
      <HydrateClient>                                                {/* Transfiere la cache del servidor al cliente */}
        <TextToSpeechView initialValues={{ text, voiceId }} />       {/* Recibe la cache ya hidratada — sin fetches extra */}
      </HydrateClient>
    </>
  )
}

export default TextToSpeechPage

// TextToSpeechPage(Server Component)
// │
// │  1. prefetch(trpc.voices.getAll.queryOptions())
// │     └─ Ejecuta la query en el servidor
// │     └─ Llena la cache del servidor con las voces
// │     └─ SuperJSON serializa + deshidrata los datos (saca de la cache del server)
// │
// │  2. <HydrateClient>
// │     └─ Envía esos datos deshidratados al cliente
// │     └─ SuperJSON deserializa + hidrata la cache de React Query (los mete en la cache del cliente)
// │
// │  3. < TextToSpeechView />
// │     └─ Cuando llega al cliente, useQuery('voices.getAll')
// │        ya tiene los datos en cache — cero waterfalls