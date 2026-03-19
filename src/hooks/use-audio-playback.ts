"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useAudioPlayback(src: string | File | null) {
  const audioRef = useRef<HTMLAudioElement | null>(null);       // instancia de Audio fuera del árbol React, no provoca re-renders
  const [isPlaying, setIsPlaying] = useState(false);            // estado UI → re-render al cambiar
  const [isLoading, setIsLoading] = useState(false);            // estado UI → re-render al cambiar

  useEffect(() => {
    return () => {                                              // cleanup: se ejecuta cuando src cambia o el componente se desmonta
      if (audioRef.current) {
        audioRef.current.pause();                               // detiene la reproducción antes de destruir
        audioRef.current.removeAttribute("src");                // libera el recurso de red
        audioRef.current = null;                                // permite que el GC limpie el objeto
      }
    };
  }, [src]);                                                    // se re-ejecuta solo si src cambia → destruye el audio anterior

  const togglePlay = useCallback(() => {
    if (!src) return;                                           // guard: sin fuente no hay nada que reproducir

    if (!audioRef.current) {                                    // primer click: el Audio aún no existe (creación lazy)
      const url = src instanceof File
        ? URL.createObjectURL(src)                              // File → URL temporal en memoria (blob:)
        : src;                                                  // string → URL directa, sin transformación
      audioRef.current = new Audio(url);
      audioRef.current.addEventListener("ended", () =>
        setIsPlaying(false)                                     // el audio terminó solo → sincroniza el estado sin llamar a togglePlay
      );
      audioRef.current.addEventListener(
        "canplaythrough",
        () => setIsLoading(false),                             // buffer suficiente para reproducir sin cortes → quita el spinner
        { once: true },                                        // se elimina automáticamente tras dispararse una vez
      );
    }

    if (isPlaying) {
      audioRef.current.pause();                                // pausa el audio nativo
      setIsPlaying(false);                                     // sincroniza el estado con la UI
    } else {
      setIsLoading(true);                                      // muestra spinner antes de que el navegador confirme la reproducción
      audioRef.current.play().then(() => {
        setIsPlaying(true);                                    // .play() resolvió → el navegador aceptó la reproducción
        setIsLoading(false);                                   // por si canplaythrough no disparó antes
      });
    }
  }, [src, isPlaying]);                                        // se recrea solo si cambia la fuente o el estado → evita re-renders innecesarios en hijos

  return { isPlaying, isLoading, togglePlay };
};