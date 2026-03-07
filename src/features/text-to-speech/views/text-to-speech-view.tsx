"use client";

import { TextInputPanel } from "@/features/text-to-speech/components/text-input-panel";
import { VoicePreviewPlaceholder } from "../components/voice-preview-placeholder";
import SettingsPanel from "../components/settings-panel";
import {
  TTSFormValues,
  TextToSpeechForm,
  defaultTTSValues
} from "../components/text-to-speech-form"

export const TextToSpeechView = () => {
  return (
    <TextToSpeechForm defaultValues={defaultTTSValues}>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <TextInputPanel />
          <VoicePreviewPlaceholder />
        </div>

        <SettingsPanel />
      </div>
    </TextToSpeechForm>
  )
}
