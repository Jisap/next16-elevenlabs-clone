"use client";

import { TextInputPanel } from "@/features/text-to-speech/components/text-input-panel";




import React from 'react'

export const TextToSpeechView = () => {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TextInputPanel />
        {/* <VoicePreviewPlaceholder /> */}
      </div>

      {/* <SettingsPanel /> */}
    </div>
  )
}
