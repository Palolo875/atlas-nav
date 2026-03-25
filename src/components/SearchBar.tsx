import { useState, useRef, useEffect, useCallback } from "react";
import { searchPlaces, type GeoResult } from "@/lib/geocoder";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, Location01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";

interface SearchBarProps {
  onSelect: (result: GeoResult) => void;
}

export default function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await searchPlaces(q);
      setResults(res);
      setIsOpen(res.length > 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(query), 300);
    return () => clearTimeout(timerRef.current);
  }, [query, search]);

  const handleSelect = (r: GeoResult) => {
    setQuery(r.name);
    setIsOpen(false);
    onSelect(r);
  };

  const clear = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/90 backdrop-blur-md px-3 py-2.5 shadow-sm transition-all focus-within:border-foreground/20 focus-within:shadow-md">
        <HugeiconsIcon icon={Search01Icon} size={16} className="text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Rechercher un lieu..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        {query && (
          <button onClick={clear} className="text-muted-foreground hover:text-foreground transition-colors">
            <HugeiconsIcon icon={Cancel01Icon} size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-lg overflow-hidden z-50">
          {results.map((r, i) => (
            <button
              key={`${r.lat}-${r.lon}-${i}`}
              onClick={() => handleSelect(r)}
              className="flex items-start gap-3 w-full px-3 py-2.5 text-left hover:bg-secondary transition-colors border-b border-border last:border-0"
            >
              <HugeiconsIcon icon={Location01Icon} size={14} className="text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-foreground truncate">{r.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {[r.state, r.country].filter(Boolean).join(", ")}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
