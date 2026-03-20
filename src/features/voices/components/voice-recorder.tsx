import {
  Mic,
  Square,
  RotateCcw,
  X,
  FileAudio,
  Play,
  Pause,
} from "lucide-react";

import { cn, formatFileSize } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAudioPlayback } from "@/hooks/use-audio-playback";
import { useAudioRecorder } from "@/features/voices/hooks/use-audio-recorder";

/**
 * Convierte segundos en formato HH:MM:SS con padding de ceros.
 * Se usa para mostrar el tiempo transcurrido durante la grabación
 * y la duración del archivo grabado.
 */
function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

/**
 * Componente de grabación de audio desde el micrófono del dispositivo.
 *
 * Actúa como alternativa a FileDropzone dentro del tab "Record" de VoiceCreateForm.
 * Ambos comparten la misma interfaz de props y producen el mismo resultado:
 * un objeto File que se asigna al campo `file` del formulario.
 *
 * Renderiza uno de cuatro estados excluyentes (en orden de prioridad):
 *   1. error       — no se pudo acceder al micrófono
 *   2. file        — grabación completada
 *   3. isRecording — grabando activamente
 *   4. idle        — estado inicial
 */
export function VoiceRecorder({
  file,
  onFileChange,
  isInvalid,
}: {

  file: File | null;                                                      // Archivo de audio actual. Null si no se ha grabado nada todavía. 
  onFileChange: (file: File | null) => void;                              // Callback que actualiza el campo `file` del formulario padre. 
  isInvalid?: boolean;                                                    // Si true, aplica estilos de error (borde rojo) al estado idle. 
}) {

  const { isPlaying, togglePlay } = useAudioPlayback(file);                 // Gestiona la reproducción del archivo grabado (play/pause)

  // Gestiona toda la lógica de grabación:
  // acceso al micrófono, MediaRecorder, tiempo transcurrido,
  // visualización de onda (containerRef) y blob resultante
  const {
    isRecording,
    elapsedTime,
    audioBlob,
    containerRef,
    error,
    startRecording,
    stopRecording,
    resetRecording,
  } = useAudioRecorder();

  /**
   * Al detener la grabación, convierte el Blob en un objeto File
   * antes de pasarlo al formulario. El endpoint y el schema de Zod
   * esperan File, no Blob, y el nombre/tipo deben coincidir con
   * lo que el endpoint usa como Content-Type al subir a R2.
   */
  const handleStop = () => {
    stopRecording((blob) => {
      const recordedFile = new File([blob], "recording.wav", {
        type: "audio/wav",
      });
      onFileChange(recordedFile);
    });
  };

  /**
   * Limpia tanto el archivo del formulario como el estado interno
   * del recorder para permitir una nueva grabación.
   * Lo usan tanto "Re-record" como "Remove".
   */
  const handleReRecord = () => {
    onFileChange(null);
    resetRecording();
  };

  // --- Estado 1: Error de acceso al micrófono ---
  // Puede ocurrir por permisos denegados o hardware no disponible
  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-destructive/50 bg-destructive/5 px-6 py-10">
        <p className="text-center text-sm text-destructive">{error}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={resetRecording}
        >
          Try again
        </Button>
      </div>
    );
  }

  // --- Estado 2: Grabación completada ---
  // Muestra nombre, tamaño y duración del archivo.
  // La duración solo se muestra si proviene de una grabación real
  // (audioBlob existe y elapsedTime > 0), no si el archivo fue
  // asignado externamente.
  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-xl border p-4">

        <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
          <FileAudio className="size-5 text-muted-foreground" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(file.size)}
            {/* Muestra la duración solo si viene de una grabación real */}
            {audioBlob && elapsedTime > 0 && (
              <>&nbsp;&middot;&nbsp;{formatTime(elapsedTime)}</>
            )}
          </p>
        </div>

        {/* Reproducir / pausar el audio grabado */}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={togglePlay}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="size-4" />
          ) : (
            <Play className="size-4" />
          )}
        </Button>

        {/* Volver a grabar: limpia archivo y resetea el recorder */}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleReRecord}
          title="Re-record"
        >
          <RotateCcw className="size-4" />
        </Button>

        {/* Eliminar: mismo comportamiento que re-record */}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleReRecord}
          title="Remove"
        >
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  // --- Estado 3: Grabando activamente ---
  // containerRef es donde useAudioRecorder monta la visualización
  // de la onda de audio en tiempo real.
  if (isRecording) {
    return (
      <div className="flex flex-col overflow-hidden rounded-2xl border">
        {/* Visualización de onda de audio (montada por useAudioRecorder) */}
        <div ref={containerRef} className="w-full" />
        <div className="flex items-center justify-between border-t p-4">
          {/* Contador de tiempo transcurrido */}
          <p className="text-[28px] font-semibold leading-[1.2] tracking-tight">
            {formatTime(elapsedTime)}
          </p>
          <Button
            type="button"
            variant="destructive"
            onClick={handleStop}
          >
            <Square className="size-3" />
            Stop
          </Button>
        </div>
      </div>
    );
  }

  // --- Estado 4: Idle (estado inicial) ---
  // Aplica borde rojo si el campo es inválido (validación del formulario)
  return (
    <div
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border px-6 py-10",
        isInvalid && "border-destructive",
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <Mic className="size-5 text-muted-foreground" />
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <p className="text-base font-semibold tracking-tight">
          Record your voice
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Click record to start capturing audio
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={startRecording}
      >
        <Mic className="size-3.5" />
        Record
      </Button>
    </div>
  );
};