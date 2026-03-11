"use client";

import { createContext, useContext } from "react";
import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/trpc/routers/_app";

type TTSVoiceItem =
  inferRouterOutputs<AppRouter>["voices"]["getAll"]["custom"][number];      // Tipo para el router voices.getAll.custom

interface TTSVoicesContextValue { // Contexto para las voces del TTS usa el mismo tipo por tener misma estructura
  customVoices: TTSVoiceItem[];      // Voces personalizadas
  systemVoices: TTSVoiceItem[];      // Voces del sistema
  allVoices: TTSVoiceItem[];         // Todas las voces
};

const TTSVoicesContext = createContext<TTSVoicesContextValue | null>(null); // Contexto para las voces del TTS

export function TTSVoicesProvider({                                         // Provider para las voces del TTS 
  children,
  value,
}: {
  children: React.ReactNode;
  value: TTSVoicesContextValue;
}) {
  return (
    <TTSVoicesContext.Provider value={value}>
      {children}
    </TTSVoicesContext.Provider>
  );
};

export function useTTSVoices() {                                             // Hook para las voces del TTS
  const context = useContext(TTSVoicesContext);

  if (!context) {
    throw new Error("useTTSVoices must be used within a TTSVoicesProvider");
  }

  return context;
};