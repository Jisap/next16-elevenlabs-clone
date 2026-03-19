"use client";

import { useTRPC } from "@/trpc/client";
import { useQueryState } from "nuqs";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { useSuspenseQuery } from "@tanstack/react-query";

import { VoicesList } from "../components/voices-list";
import { voicesSearchParams } from "../lib/params";
import { VoicesToolbar } from "../components/voices-toolbar";

function VoicesContent() {
  const trpc = useTRPC();
  const [query] = useQueryState(
    "query",
    voicesSearchParams.query
  );
  const { data } = useSuspenseQuery(
    trpc.voices.getAll.queryOptions({ query })
  );

  return (
    <>
      <VoicesList
        title="Team Voices"
        voices={data.custom}
      />

      <VoicesList
        title="Built-in Voices"
        voices={data.system}
      />
    </>
  );
};

export function VoicesView() {
  return (
    <NuqsAdapter>
      <div className="flex-1 space-y-10 overflow-y-auto p-3 lg:p-6">
        <VoicesToolbar />
        <VoicesContent />
      </div>
    </NuqsAdapter>
  );
};