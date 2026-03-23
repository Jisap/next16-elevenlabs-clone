"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { VoiceCreateForm } from "./voice-create-form";
import { Button } from "@/components/ui/button";
import { useCallback } from "react";
import { toast } from "sonner";
import { useCheckout } from "@/features/billing/hooks/use-checkout";

interface VoiceCreateDialogProps {
  children?: React.ReactNode;             // Elemento que actúa como trigger
  open?: boolean;                         // Control externo del estado abierto/cerrado
  onOpenChange?: (open: boolean) => void; // Callback al cambiar el estado
}

export function VoiceCreateDialog({
  children,
  open,
  onOpenChange,
}: VoiceCreateDialogProps) {

  const isMobile = useIsMobile();

  const { checkout } = useCheckout();

  const handleError = useCallback( // Si hay error="SUBSCRIPTION_REQUIRED", se muestra un toast con un botón de acción "Subscribe"
    (message: string) => {
      if (message === "SUBSCRIPTION_REQUIRED") {
        toast.error("Subscription required", {
          action: {
            label: "Subscribe",
            onClick: () => checkout(),
          },
        });
      } else {
        toast.error(message);
      }
    },
    [checkout],
  );

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
      >
        {/* Si se proporciona children, se envuelve en DrawerTrigger */}
        {children && <DrawerTrigger asChild>{children}</DrawerTrigger>}
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Create custom voice</DrawerTitle>
            <DrawerDescription>
              Upload or record an audio sample to add a new voice to your
              library.
            </DrawerDescription>
          </DrawerHeader>

          <VoiceCreateForm
            scrollable
            onError={handleError}
            footer={(submit) => (
              <DrawerFooter>
                {submit}
                <DrawerClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DrawerClose>
              </DrawerFooter>
            )}
          />
        </DrawerContent>
      </Drawer>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Si se proporciona children, se envuelve en DialogTrigger */}
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent>
        <DialogHeader className="text-left">
          <DialogTitle>Create custom voice</DialogTitle>
          <DialogDescription>
            Upload or record an audio sample to add a new voice to your library.
          </DialogDescription>
        </DialogHeader>

        <VoiceCreateForm onError={handleError} />
      </DialogContent>
    </Dialog>
  );
};

// Flujo de ejecución paso a paso

// 1º Validación en Servidor (route.ts):
// Cuando el usuario envía el formulario para crear una voz, el endpoint /api/voices/create
// verifica si existe una suscripción activa. Si no la hay, devuelve el error SUBSCRIPTION_REQUIRED.

// Captura en Cliente (voice-create-form.tsx):
// El formulario captura este error y ejecuta la función onError que se le pasó por props.

// 3º Interfaz de Usuario(voice-create-dialog.tsx):
// El componente VoiceCreateDialog define la función handleError.
// Al recibir el mensaje "SUBSCRIPTION_REQUIRED", muestra una notificación(toast) con un botón de acción "Subscribe".

// 4º Redirección(use-checkout.ts):
// Solo cuando el usuario hace clic en "Subscribe" dentro del toast, se ejecuta el hook checkout(),
// que contacta con tu backend(TRPC) para obtener la URL de pago y redirige el navegador(window.location.href).