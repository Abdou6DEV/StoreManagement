import React, { useMemo, useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Input } from "../../../lib/components/input";
import { useDebounce } from "../../../lib/hooks/useDebounce";
import { cn } from "../../../lib/utils";

type ClientOption = {
  id: string;
  name: string;
  phone?: string | null;
};

interface ClientSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  clients: ClientOption[];
  selectedClientId: string | null;
  onSelectClient: (client: ClientOption) => void;
  onClearSelection: () => void;
  placeholder?: string;
  className?: string;
}

const MAX_SUGGESTIONS = 8;

const ClientSearchInput: React.FC<ClientSearchInputProps> = ({
  value,
  onChange,
  clients,
  selectedClientId,
  onSelectClient,
  onClearSelection,
  placeholder,
  className,
}) => {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<number | null>(null);
  const [suppressSuggestions, setSuppressSuggestions] = useState(false);

  const debouncedQuery = useDebounce(value, 200);
  const trimmedQuery = debouncedQuery.trim().toLowerCase();

  const suggestions = useMemo(() => {
    if (!trimmedQuery) {
      return [];
    }

    return clients
      .filter((client) => {
        const matchesName = client.name.toLowerCase().includes(trimmedQuery);
        const matchesPhone =
          client.phone &&
          client.phone.toString().toLowerCase().includes(trimmedQuery);
        return matchesName || matchesPhone;
      })
      .slice(0, MAX_SUGGESTIONS);
  }, [clients, trimmedQuery]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [suggestions.length]);

  useEffect(
    () => () => {
      if (blurTimeoutRef.current) {
        window.clearTimeout(blurTimeoutRef.current);
      }
    },
    [],
  );

  const showSuggestions =
    isFocused &&
    !suppressSuggestions &&
    value.trim().length > 0 &&
    (suggestions.length > 0 || trimmedQuery.length > 0);

  useEffect(() => {
    setSuppressSuggestions(false);
  }, [debouncedQuery]);

  const handleSelect = (client: ClientOption) => {
    onSelectClient(client);
    setSuppressSuggestions(true);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex(
        (prev) => (prev - 1 + suggestions.length) % suggestions.length,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const client = suggestions[highlightedIndex];
      if (client) {
        handleSelect(client);
      }
    } else if (event.key === "Escape") {
      setIsFocused(false);
    }
  };

  const handleClear = () => {
    onClearSelection();
    setSuppressSuggestions(false);
    setHighlightedIndex(0);
    inputRef.current?.focus();
  };

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
      <Input
        ref={inputRef}
        type="text"
        value={value}
        placeholder={
          placeholder ??
          t("clients.searchClients", "Search clients...")
        }
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => {
          if (blurTimeoutRef.current) {
            window.clearTimeout(blurTimeoutRef.current);
          }
          setIsFocused(true);
        }}
        onBlur={() => {
          blurTimeoutRef.current = window.setTimeout(() => {
            setIsFocused(false);
          }, 120);
        }}
        onKeyDown={handleKeyDown}
        className="pl-10 pr-10 border-2 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      {(value.length > 0 || selectedClientId) && (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground focus:outline-none"
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleClear}
          aria-label={t("common.clear", "Clear")}
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {showSuggestions && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
          {suggestions.length > 0 ? (
            suggestions.map((client, index) => (
              <button
                key={client.id}
                type="button"
                className={cn(
                  "w-full px-3 py-2 text-left text-sm transition-colors",
                  index === highlightedIndex
                    ? "bg-muted/70"
                    : "hover:bg-muted/50",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(client)}
              >
                <div className="font-medium">{client.name}</div>
                {client.phone && (
                  <div className="text-xs text-muted-foreground">
                    {client.phone}
                  </div>
                )}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {t("clients.noClientsFound", "No clients found")}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClientSearchInput;

