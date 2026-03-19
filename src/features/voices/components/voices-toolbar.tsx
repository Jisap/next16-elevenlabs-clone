import { useState } from "react";
import { useQueryState } from "nuqs";
import { useDebouncedCallback } from "use-debounce";
import { Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "@/components/ui/input-group";
import { voicesSearchParams } from "@/features/voices/lib/params";


export const VoicesToolbar = () => {

  const [query, setQuery] = useQueryState(              // Hook para leer el query parameter "query" desde la url
    "query",
    voicesSearchParams.query
  );
  const [localQuery, setLocalQuery] = useState(query);  // Estado local para el input

  const debouncedSetQuery = useDebouncedCallback(       // Hook para debounced setQuery
    (value: string) => setQuery(value),
    300,
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl lg:text-2xl font-semibold tracking-tight">
          All Libraries
        </h2>
        <p className="text-sm text-muted-foreground">
          Discover your voices, or make your own
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <InputGroup className="lg:max-w-sm">
            <InputGroupAddon>
              <Search className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search voices..."
              value={localQuery}
              onChange={(e) => {
                setLocalQuery(e.target.value);
                debouncedSetQuery(e.target.value);
              }}
            />
          </InputGroup>

          <div className="ml-auto hidden lg:block">
            <Button size="sm">
              <Sparkles />
              Custom voice
            </Button>
          </div>

          <div className="lg:hidden">
            <Button size="sm" className="w-full">
              <Sparkles />
              Custom voice
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

