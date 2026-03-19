import { voicesSearchParamsCache } from "@/features/voices/lib/params";
import { VoicesView } from "@/features/voices/views/voices-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";

export const metadata: Metadata = { title: "Voices" };

const VoicesPage = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {

  const { query } = await voicesSearchParamsCache.parse(searchParams);

  prefetch(trpc.voices.getAll.queryOptions({ query }));


  return (
    <HydrateClient>
      <VoicesView />
    </HydrateClient>
  )
}

export default VoicesPage