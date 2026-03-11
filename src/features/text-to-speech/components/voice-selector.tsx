"use client";

import { useStore } from "@tanstack/react-form";  // Hook para manejar el estado del formulario

import {
  VOICE_CATEGORY_LABELS
} from "@/features/voices/data/voice-categories";

import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTypedAppFormContext } from "@/hooks/use-app-form";  // Hook para manejar el estado del formulario
import { VoiceAvatar } from "@/components/voice-avatar/voice-avatar";

import { useTTSVoices } from "../context/tts-voices-context";  // Hook para el contexto de las voces del TTS
import { ttsFormOptions } from "./text-to-speech-form";        // Opciones del formulario de TTS

export const VoiceSelector = () => {

  const {
    customVoices,
    systemVoices,
    allVoices: voices
  } = useTTSVoices(); // contexto de las voces del TTS

  const form = useTypedAppFormContext(ttsFormOptions);                // formulario de TTS
  const voiceId = useStore(form.store, (s) => s.values.voiceId);      // valor del campo voiceId
  const isSubmitting = useStore(form.store, (s) => s.isSubmitting);   // estado de envío del formulario

  const selectedVoice = voices.find((v) => v.id === voiceId);         // voz seleccionada
  const hasMissingSelectedVoice = Boolean(voiceId) && !selectedVoice; // si la voz seleccionada no existe
  const currentVoice = selectedVoice                                  // voz actual
    ? selectedVoice
    : hasMissingSelectedVoice
      ? {
        id: voiceId,
        name: "Unavailable voice",
        category: null as null,
      }
      : voices[0];

  return (
    <Field>
      <FieldLabel>Voice style</FieldLabel>

      <Select
        value={voiceId}
        onValueChange={(v) => form.setFieldValue("voiceId", v)}
        disabled={isSubmitting}
      >
        <SelectTrigger className="w-full h-auto gap-1 rounded-lg bg-white px-2 py-1">
          <SelectValue>
            {currentVoice && (
              <>
                <VoiceAvatar
                  seed={currentVoice.id}
                  name={currentVoice.name}
                />
                <span className="truncate text-sm font-medium tracking-tight">
                  {currentVoice.name}
                  {currentVoice.category &&
                    ` - ${VOICE_CATEGORY_LABELS[currentVoice.category]}`
                  }
                </span>
              </>
            )}
          </SelectValue>
        </SelectTrigger>

        <SelectContent>
          {/* Si la voz seleccionada no existe usa la primera voz disponible */}
          {hasMissingSelectedVoice && currentVoice && (
            <>
              <SelectGroup>
                <SelectLabel>Selected Voice</SelectLabel>
                <SelectItem value={currentVoice.id}>
                  <VoiceAvatar
                    seed={currentVoice.id}
                    name={currentVoice.name}
                  />

                  <span className="truncate text-sm font-medium">
                    {currentVoice.name}
                    {currentVoice.category &&
                      ` - ${VOICE_CATEGORY_LABELS[currentVoice.category]}`}
                  </span>
                </SelectItem>
              </SelectGroup>
              {(customVoices.length > 0 || systemVoices.length > 0) && (
                <SelectSeparator />
              )}
            </>
          )}

          {/* Si hay voces personalizadas */}
          {customVoices.length > 0 && (
            <SelectGroup>
              <SelectLabel>Team Voices</SelectLabel>
              {customVoices.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  <VoiceAvatar seed={v.id} name={v.name} />

                  <span className="truncate text-sm font-medium">
                    {v.name} - {VOICE_CATEGORY_LABELS[v.category]}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          )}

          {customVoices.length > 0 && systemVoices.length > 0 && (
            <SelectSeparator />
          )}

          {/* Si hay voces del sistema */}
          {systemVoices.length > 0 && (
            <SelectGroup>
              <SelectLabel>Built-in Voices</SelectLabel>
              {systemVoices.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  <VoiceAvatar seed={v.id} name={v.name} />

                  <span className="truncate text-sm font-medium">
                    {v.name} - {VOICE_CATEGORY_LABELS[v.category]}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
    </Field>
  )
}

