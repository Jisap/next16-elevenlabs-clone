"use client";

import { useState } from "react";
import { Pause, Play, Download, Redo, Undo } from "lucide-react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VoiceAvatar } from "@/components/voice-avatar/voice-avatar";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import { useWaveSurfer } from "../hooks/use-wavesurfer";

type VoicePreviewPanelVoice = {
  id?: string;
  name: string;
};

// Utilidad para transformar segundos en formato MM:SS de forma consistente
function formatTime(seconds: number): string {
  return format(new Date(seconds * 1000), "mm:ss");
};

export function VoicePreviewPanel({
  audioUrl,
  voice,
  text,
}: {
  audioUrl: string;
  voice: VoicePreviewPanelVoice | null;
  text: string;
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const selectedVoiceName = voice?.name ?? null;
  const selectedVoiceSeed = voice?.id ?? null;

  // Hook personalizado que encapsula la instancia de Wavesurfer.js y el control del audio
  const {
    containerRef,
    isPlaying,
    isReady,
    currentTime,
    duration,
    togglePlayPause,
    seekBackward,
    seekForward,
  } = useWaveSurfer({
    url: audioUrl,
    autoplay: true,
  });

  // Lógica de descarga: sanitiza el texto para crear un nombre de archivo amigable (slug)
  const handleDownload = () => {
    setIsDownloading(true);

    // Remueve caracteres especiales y limita el largo para evitar errores en el sistema de archivos
    const safeName =
      text
        .slice(0, 50)
        .trim()
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase() || "speech";

    const link = document.createElement("a"); // Crea un elemento <a> para simular una descarga
    link.href = audioUrl;                     // Establece la URL del audio como origen de la descarga
    link.download = `${safeName}.wav`;        // Establece el nombre del archivo a descargar
    document.body.appendChild(link);          // Agrega el enlace al DOM
    link.click();                             // Simula un clic en el enlace para iniciar la descarga
    document.body.removeChild(link);          // Elimina el enlace del DOM

    setTimeout(() => setIsDownloading(false), 1000);
  };

  return (
    <div className="h-full gap-8 flex-col border-t hidden flex-1 lg:flex">
      {/* Header */}
      <div className="p-6 pb-0">
        <h3 className="font-semibold text-foreground">Voice preview</h3>
      </div>

      {/* Content */}
      <div className="relative flex flex-1 items-center justify-center">
        {/* Overlay de carga que se sincroniza con el estado de inicialización de la onda */}
        {!isReady && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <Badge
              variant="outline"
              className="gap-2 bg-background/90 px-3 py-1.5 text-sm text-muted-foreground shadow-sm"
            >
              <Spinner className="size-4" />
              <span>Loading audio...</span>
            </Badge>
          </div>
        )}
        {/* Referencia crucial: aquí es donde Wavesurfer inyecta el canvas de la onda */}
        <div
          ref={containerRef}
          className={cn(
            "w-full cursor-pointer transition-opacity duration-200",
            !isReady && "opacity-0",
          )}
        />
      </div>
      {/* Time display */}
      {/* Usa font-tabular-nums para evitar que el texto salte mientras el tiempo avanza */}
      <div className="flex items-center justify-center">
        <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
          {formatTime(currentTime)}&nbsp;
          <span className="text-muted-foreground">
            /&nbsp;{formatTime(duration)}
          </span>
        </p>
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center p-6">
        <div className="grid w-full grid-cols-3">
          {/* Metadata */}
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="truncate text-sm font-medium text-foreground">
              {text}
            </p>
            {selectedVoiceName && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <VoiceAvatar
                  seed={selectedVoiceSeed ?? selectedVoiceName}
                  name={selectedVoiceName}
                  className="shrink-0"
                />
                <span className="truncate">{selectedVoiceName}</span>
              </div>
            )}
          </div>

          {/* Player controls */}
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="ghost"
              size="icon-lg"
              className="flex-col"
              onClick={() => seekBackward(10)}
              disabled={!isReady}
            >
              <Undo className="size-4 -mb-1" />
              <span className="text-[10px] font-medium">10</span>
            </Button>

            <Button
              variant="default"
              size="icon-lg"
              className="rounded-full"
              onClick={togglePlayPause}
            >
              {isPlaying ? (
                <Pause className="fill-background" />
              ) : (
                <Play className="fill-background" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon-lg"
              className="flex-col"
              onClick={() => seekForward(10)}
              disabled={!isReady}
            >
              <Redo className="size-4 -mb-1" />
              <span className="text-[10px] font-medium">10</span>
            </Button>
          </div>

          {/* Download */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              <Download className="size-4" />
              Download
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
};