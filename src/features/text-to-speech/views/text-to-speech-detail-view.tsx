"use client";

import { useSuspenseQueries } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";
import { TextInputPanel } from "@/features/text-to-speech/components/text-input-panel";
import SettingsPanel from "@/features/text-to-speech/components/settings-panel";
import {
  TextToSpeechForm,
  type TTSFormValues
} from "@/features/text-to-speech/components/text-to-speech-form";
import { TTSVoicesProvider } from "../context/tts-voices-context";
import { VoicePreviewPanel } from "../components/voice-preview-panel";
import { VoicePreviewMobile } from "../components/voice-preview-mobile";

const TextToSpeechDetailView = ({ generationId }: { generationId: string }) => {

  const trpc = useTRPC();

  // Recupera datos de generación y voces en paralelo usando la caché precargada del servidor
  const [
    generationQuery,
    voicesQuery,
  ] = useSuspenseQueries({
    queries: [
      trpc.generations.getById.queryOptions({ id: generationId }),
      trpc.voices.getAll.queryOptions()
    ],
  });

  const data = generationQuery.data;
  const { custom: customVoices, system: systemVoices } = voicesQuery.data;
  const allVoices = [...customVoices, ...systemVoices];

  const fallbackVoiceId = allVoices[0]?.id ?? "";

  // Validación de seguridad: Si la voz original fue borrada, hace fallback a la primera disponible
  const resolvedVoiceId =
    data?.voiceId &&
      allVoices.some((v) => v.id === data.voiceId)
      ? data.voiceId
      : fallbackVoiceId;

  // Inicializa los valores del formulario con los metadatos de la generación recuperada
  const defaultValues: TTSFormValues = {
    text: data.text,
    voiceId: resolvedVoiceId,
    temperature: data.temperature,
    topP: data.topP,
    topK: data.topK,
    repetitionPenalty: data.repetitionPenalty,
  };

  // Objeto simplificado para los componentes de previsualización de audio
  const generationVoice = {
    id: data.voiceId ?? undefined,
    name: data.voiceName,
  };

  return (
    <TTSVoicesProvider value={{ customVoices, systemVoices, allVoices }}>
      {/* El uso de key={generationId} garantiza que el formulario se resetee al cambiar de registro */}
      <TextToSpeechForm
        key={generationId}
        defaultValues={defaultValues}
      >
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col">
            <TextInputPanel />
            {/* Componentes de reproducción que consumen la URL de audio protegida del servidor */}
            <VoicePreviewMobile
              audioUrl={data.audioUrl}
              voice={generationVoice}
              text={data.text}
            />
            <VoicePreviewPanel
              audioUrl={data.audioUrl}
              voice={generationVoice}
              text={data.text}
            />
          </div>

          <SettingsPanel />
        </div>
      </TextToSpeechForm>
    </TTSVoicesProvider>
  )
}

export default TextToSpeechDetailView