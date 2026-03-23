import { useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCheckout } from "@/features/billing/hooks/use-checkout";
import { useTRPC } from "@/trpc/client";

// Convierte céntimos a cadena con formato de moneda USD (ej: 150 → "$1.50")
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

// Tarjeta mostrada cuando el usuario NO tiene suscripción activa
function UpgradeCard() {
  const { checkout, isPending: isCheckoutPending } = useCheckout(); // Hook que gestiona la creación del checkout y la redirección

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold tracking-tight text-foreground">
          Pay as you go
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Generate speech starting at $0.30 per 1,000 characters
        </p>
      </div>
      <Button
        variant="outline"
        className="w-full text-xs"
        size="sm"
        disabled={isCheckoutPending}  // Bloquea el botón mientras redirige
        onClick={checkout}
      >
        {isCheckoutPending ? (        // Feedback visual durante la redirección
          <>
            <Spinner className="size-3" />
            Redirecting...
          </>
        ) : (
          "Upgrade"
        )}
      </Button>
    </div>
  );
};

// Tarjeta mostrada cuando el usuario YA tiene suscripción activa
function UsageCard({
  estimatedCostCents
}: {
  estimatedCostCents: number                               // Coste estimado del periodo actual en céntimos
}) {
  const trpc = useTRPC();
  const portalMutation = useMutation(
    trpc.billing.createPortalSession.mutationOptions({}),  // Mutación que crea la sesión del portal de Polar
  );


  const openPortal = useCallback(() => {                   // Abre el portal de gestión de suscripción en una pestaña nueva
    portalMutation.mutate(undefined, {
      onSuccess: (data) => {
        window.open(data.portalUrl, "_blank");             // Redirige al portal sin cerrar la app
      },
    });
  }, [portalMutation]);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold tracking-tight text-foreground">
          Current usage
        </p>
        <p className="text-xl font-bold tracking-tight text-foreground mt-1">
          {formatCurrency(estimatedCostCents)} {/* Muestra el coste formateado en USD */}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Estimated this period
        </p>
      </div>
      <Button
        variant="outline"
        className="w-full text-xs"
        size="sm"
        disabled={portalMutation.isPending}  // Bloquea el botón mientras crea la sesión
        onClick={openPortal}
      >
        {portalMutation.isPending ? (         // Feedback visual durante la redirección
          <>
            <Spinner className="size-3" />
            Redirecting...
          </>
        ) : (
          "Manage Subscription"
        )}
      </Button>
    </div>
  );
};

/**
 * Contenedor principal de facturación.
 * Consulta el estado de suscripción de la organización y decide
 * qué tarjeta renderizar: UpgradeCard (sin suscripción) o UsageCard (activa).
 */
export function UsageContainer() {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.billing.getStatus.queryOptions()); // Obtiene estado de suscripción de la org

  return (
    // Se oculta automáticamente cuando el sidebar está colapsado a modo icono
    <div className="group-data-[collapsible=icon]:hidden bg-background border border-border rounded-lg p-3">
      {data?.hasActiveSubscription ? (
        <UsageCard estimatedCostCents={data.estimatedCostCents} /> // Suscripción activa → mostrar uso
      ) : (
        <UpgradeCard />                                            // Sin suscripción → invitar a contratar
      )}
    </div>
  );
};