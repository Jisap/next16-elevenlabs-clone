# SuperJSON + tRPC + React Query: El flujo completo

## El problema base

El servidor y el navegador no hablan el mismo idioma directamente. Entre medias solo puede viajar **texto plano** (JSON). Y el texto plano no entiende tipos como `Date`, `Set`, `Map`, etc.

---

## Los 4 conceptos, en simple

| Concepto | Qué hace |
|---|---|
| **Serializar** | Convertir datos complejos a texto plano para viajar por la red |
| **Deserializar** | Convertir ese texto plano de vuelta a datos complejos |
| **Deshidratar** | Sacar los datos de la cache del servidor y "aplanarlos" para enviarlos |
| **Hidratar** | Rellenar la cache del cliente con esos datos que llegaron del servidor |

> **Serializar/Deserializar** = el *cómo* se convierte
> **Deshidratar/Hidratar** = el *qué* se convierte (el estado de React Query)

---

## El flujo visual

```
SERVIDOR (Next.js)
│
│  1. Ejecuta las queries y llena su cache con datos reales
│     { createdAt: Date(2024-01-15), tags: Set(["a","b"]) }
│
│  2. DESHIDRATA — saca esos datos de la cache
│
│  3. SERIALIZA (SuperJSON) — los convierte a texto plano seguro
│     { json: "...", meta: { createdAt: "Date", tags: "Set" } }
│                                        ↑
│                              guarda los tipos aquí
↓
════ VIAJA POR LA RED COMO TEXTO ════
↓
CLIENTE (Browser)
│
│  4. DESERIALIZA (SuperJSON) — reconstruye los tipos originales
│     { createdAt: Date(2024-01-15), tags: Set(["a","b"]) }
│
│  5. HIDRATA — mete esos datos en su propia cache de React Query
│
│  6. Tu componente usa useQuery() y ya tiene los datos listos
│     sin hacer ninguna llamada extra al servidor
```

---

## Por qué necesitas SuperJSON específicamente

```
Sin SuperJSON:
  Servidor envía  →  { createdAt: "2024-01-15T00:00:00Z" }  (string)
  Cliente recibe  →  { createdAt: "2024-01-15T00:00:00Z" }  (sigue siendo string ❌)

Con SuperJSON:
  Servidor envía  →  { json: "2024-01-15...", meta: { createdAt: "Date" } }
  Cliente recibe  →  { createdAt: Date(2024-01-15) }  (Date real ✅)
```

SuperJSON es simplemente un JSON más listo que **recuerda qué tipo era cada dato** antes de convertirlo a texto.

---

## Dónde vive cada pieza en el código

### `trpc.ts` — capa tRPC
```typescript
const t = initTRPC.create({
  transformer: SuperJSON, // SuperJSON intercepta TODAS las respuestas de tRPC
});
```

### `query-client.ts` — capa React Query
```typescript
dehydrate: {
  serializeData: superjson.serialize,      // Al sacar datos del servidor
  shouldDehydrateQuery: (query) =>
    defaultShouldDehydrateQuery(query) ||
    query.state.status === 'pending',       // Incluir también queries en vuelo (Suspense)
},
hydrate: {
  deserializeData: superjson.deserialize,  // Al meter datos en el cliente
},
```

Ambas capas trabajan juntas para que los tipos sobrevivan **todo el viaje** de servidor a cliente.

---

## En una frase

> El servidor cocina los datos, SuperJSON los envuelve para que no se estropeen en el viaje, y el cliente los desenvuelve y los mete en su nevera (cache) listos para usar.
