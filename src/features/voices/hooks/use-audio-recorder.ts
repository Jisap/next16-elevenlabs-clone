import { useState, useRef, useCallback, useEffect } from "react";
import type RecordRTCType from "recordrtc";
import WaveSurfer from "wavesurfer.js";
import RecordPlugin from "wavesurfer.js/dist/plugins/record.esm.js";

/**
 * Hook que gestiona toda la lógica de grabación de audio desde el micrófono.
 *
 * Orquesta tres librerías de forma coordinada:
 * - `recordrtc`    — captura y codifica el audio como WAV
 * - `wavesurfer.js` — renderiza la visualización de onda en tiempo real
 * - `MediaStream API` — acceso al micrófono del dispositivo
 *
 * Usado por VoiceRecorder para separar la lógica de la UI.
 */
export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);


  const recorderRef = useRef<RecordRTCType | null>(null);                              // Ref al recorder de RecordRTC — se crea al iniciar y se destruye al parar

  const streamRef = useRef<MediaStream | null>(null);                                  // Ref al MediaStream del micrófono — necesario para liberar las pistas de audio al terminar

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);                // Ref al intervalo del cronómetro — permite limpiarlo sin causar re-renders

  const containerRef = useRef<HTMLDivElement>(null);                                   // Ref al contenedor DOM donde WaveSurfer monta el canvas de la onda

  const wsRef = useRef<WaveSurfer | null>(null);                                       // Ref a la instancia de WaveSurfer — necesaria para destruirla explícitamente 

  const micStreamRef = useRef<{ onDestroy: () => void } | null>(null);                 // Ref al handle del stream del micrófono en WaveSurfer — expone onDestroy para limpieza

  /**
   * Destruye la instancia de WaveSurfer y libera el stream del micrófono
   * que usa para renderizar la onda. Se llama tanto al parar la grabación
   * como en el cleanup del useEffect.
   */
  const destroyWaveSurfer = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.onDestroy();
      micStreamRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.destroy();
      wsRef.current = null;
    }
  }, []);

  /**
   * Limpia todos los recursos activos: cronómetro, recorder, stream del
   * micrófono y WaveSurfer. Se llama al parar, resetear o ante cualquier error
   * para evitar fugas de memoria y que el micrófono quede ocupado en segundo plano.
   */
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current) {
      recorderRef.current.destroy();
      recorderRef.current = null;
    }
    if (streamRef.current) {
      // Detiene cada pista de audio individualmente para liberar el micrófono
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    destroyWaveSurfer();
  }, [destroyWaveSurfer]);

  /**
   * Inicializa y monta WaveSurfer cuando comienza la grabación.
   *
   * Se ejecuta solo cuando `isRecording` pasa a true y el stream
   * y el contenedor DOM ya están disponibles. El plugin RecordPlugin
   * con `scrollingWaveform: true` hace que la onda se desplace
   * horizontalmente a medida que llega audio nuevo.
   *
   * El cleanup del efecto destruye WaveSurfer si el componente se
   * desmonta mientras se está grabando.
   */
  useEffect(() => {
    if (!isRecording || !containerRef.current || !streamRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "hsl(var(--foreground) / 0.5)",
      height: 144,
      barWidth: 1,
      barGap: 2,
      barRadius: 1,
      cursorWidth: 0,   // Sin cursor — solo visualización, no reproducción
      barMinHeight: 10,
      barHeight: 2,
      normalize: true,  // Normaliza la amplitud para que la onda siempre sea visible
    });

    wsRef.current = ws;

    const record = ws.registerPlugin(
      RecordPlugin.create({
        scrollingWaveform: true, // La onda avanza de derecha a izquierda como un osciloscopio
      }),
    );

    // Conecta el stream del micrófono a WaveSurfer para la visualización en tiempo real
    const handle = record.renderMicStream(streamRef.current);
    micStreamRef.current = handle;

    return () => {
      destroyWaveSurfer();
    };
  }, [isRecording, destroyWaveSurfer]);

  /**
   * Inicia la grabación de audio.
   *
   * Solicita acceso al micrófono, crea el recorder con RecordRTC
   * (WAV mono a 44100 Hz) e inicia el cronómetro. RecordRTC se importa
   * dinámicamente para evitar que sus dependencias de Node.js se incluyan
   * en el bundle del servidor en Next.js.
   *
   * Si el usuario deniega el permiso del micrófono, captura el DOMException
   * `NotAllowedError` y muestra un mensaje específico.
   */
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setAudioBlob(null);
      setElapsedTime(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Importación dinámica para compatibilidad con SSR en Next.js
      const { default: RecordRTC, StereoAudioRecorder } = await import("recordrtc");

      const recorder = new RecordRTC(stream, {
        recorderType: StereoAudioRecorder,
        mimeType: "audio/wav",
        numberOfAudioChannels: 1,  // Mono — suficiente para clonación de voz
        desiredSampRate: 44100,    // Sample rate estándar para compatibilidad con Chatterbox
      });

      recorderRef.current = recorder;
      recorder.startRecording();
      setIsRecording(true);

      // Cronómetro con resolución de 100ms — suficiente para mostrar HH:MM:SS
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedTime((Date.now() - startTime) / 1000);
      }, 100);
    } catch (err) {
      cleanup();

      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError(
          "Microphone access denied. Please allow microphone access in your browser settings.",
        );
      } else {
        setError("Failed to access microphone. Please check your device.");
      }
    }
  }, [cleanup]);

  /**
   * Detiene la grabación y entrega el blob de audio resultante.
   *
   * `stopRecording` de RecordRTC es asíncrono basado en callback.
   * Una vez disponible el blob, actualiza el estado, ejecuta el cleanup
   * y llama al callback opcional `onBlob` que VoiceRecorder usa para
   * convertir el blob en un File y asignarlo al formulario.
   */
  const stopRecording = useCallback(
    (onBlob?: (blob: Blob) => void) => {
      const recorder = recorderRef.current;
      if (!recorder) return;

      recorder.stopRecording(() => {
        const blob = recorder.getBlob();
        setAudioBlob(blob);
        setIsRecording(false);
        cleanup();
        onBlob?.(blob); // Notifica al consumidor (VoiceRecorder) con el audio grabado
      });
    },
    [cleanup],
  );

  /**
   * Resetea completamente el estado del hook al inicial.
   * Limpia todos los recursos y borra el blob, el tiempo y el error.
   * Usado por "Re-record", "Remove" y el botón "Try again" del estado de error.
   */
  const resetRecording = useCallback(() => {
    cleanup();
    setIsRecording(false);
    setElapsedTime(0);
    setAudioBlob(null);
    setError(null);
  }, [cleanup]);

  return {
    isRecording,   // true mientras se está grabando
    elapsedTime,   // segundos transcurridos desde el inicio
    audioBlob,     // blob resultante tras stopRecording (null si no se ha grabado)
    containerRef,  // ref del div donde WaveSurfer monta la visualización
    error,         // mensaje de error si falló el acceso al micrófono
    startRecording,
    stopRecording,
    resetRecording,
  };
};