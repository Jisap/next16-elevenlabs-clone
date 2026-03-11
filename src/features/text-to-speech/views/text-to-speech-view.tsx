"use client";

import { TextInputPanel } from "@/features/text-to-speech/components/text-input-panel";
import { VoicePreviewPlaceholder } from "../components/voice-preview-placeholder";
import SettingsPanel from "../components/settings-panel";
import {
  TextToSpeechForm,
  defaultTTSValues,
  type TTSFormValues,
} from "../components/text-to-speech-form"
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { TTSVoicesProvider } from "../context/tts-voices-context";

export const TextToSpeechView = ({
  initialValues,
}: {
  initialValues?: Partial<TTSFormValues>;
}) => {

  const trpc = useTRPC();
  const {
    data: voices,
  } = useSuspenseQuery(trpc.voices.getAll.queryOptions());  // Carga las voces de la cache hidratada del cliente en <HidrateClient>. Si la cache estuviera vacía, suspendería aquí hasta que llegaran los datos

  const { custom: customVoices, system: systemVoices } = voices;
  const allVoices = [...customVoices, ...systemVoices];
  const fallbackVoiceId = allVoices[0]?.id ?? "";

  // Requested voice may no longer exist (deleted); fall back to first available
  const resolvedVoiceId =
    initialValues?.voiceId &&
      allVoices.some((v) => v.id === initialValues.voiceId)
      ? initialValues.voiceId
      : fallbackVoiceId;

  const defaultValues: TTSFormValues = {
    ...defaultTTSValues,
    ...initialValues,
    voiceId: resolvedVoiceId,
  };


  return (
    <TTSVoicesProvider value={{ customVoices, systemVoices, allVoices }}>
      <TextToSpeechForm defaultValues={defaultValues}>
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <TextInputPanel />
            <VoicePreviewPlaceholder />
          </div>

          <SettingsPanel />
        </div>
      </TextToSpeechForm>
    </TTSVoicesProvider>
  )
}
