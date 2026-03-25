import useEmblaCarousel from "embla-carousel-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, Leaf01Icon, BookOpen01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import type { Earthquake, GBIFSpecies, WikiSummary } from "@/lib/enrichment";

interface StoryCarouselProps {
  quakes: Earthquake[];
  species: GBIFSpecies[];
  wiki: WikiSummary | null;
  onSelectStory: (id: string) => void;
}

export default function StoryCarousel({ quakes, species, wiki, onSelectStory }: StoryCarouselProps) {
  const [emblaRef] = useEmblaCarousel({
    align: "start",
    dragFree: true,
    containScroll: "trimSnaps",
  });

  const hasQuakes = quakes.some(q => q.magnitude >= 3);
  const topSpecies = species.slice(0, 3);
  const hasNature = topSpecies.length > 0;
  const hasWiki = !!wiki?.thumbnail;

  if (!hasQuakes && !hasNature && !hasWiki) return null;

  return (
    <div className="w-full pb-6 border-b border-border">
      <div className="px-5 mb-3 flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          À la une
        </h2>
      </div>
      
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex pl-5 gap-3 pr-5">
          
          {hasWiki && wiki && (
            <button 
              onClick={() => onSelectStory('wiki')}
              className="relative shrink-0 w-[140px] h-[180px] rounded-xl overflow-hidden group outline-none text-left"
            >
              <img src={wiki.thumbnail} alt={wiki.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3 flex flex-col">
                <span className="text-white/80 text-[9px] uppercase tracking-widest mb-1 flex items-center gap-1">
                  <HugeiconsIcon icon={BookOpen01Icon} size={10} />
                  Histoire
                </span>
                <span className="text-white font-serif text-lg leading-tight line-clamp-2">
                  {wiki.title}
                </span>
              </div>
            </button>
          )}

          {hasNature && (
            <button 
              onClick={() => onSelectStory('nature')}
              className="relative shrink-0 w-[140px] h-[180px] rounded-xl overflow-hidden group outline-none text-left bg-pastel-green-bg border border-pastel-green-text/10"
            >
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-pastel-green-text to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3 flex flex-col">
                <span className="text-pastel-green-text text-[9px] uppercase tracking-widest mb-1 flex items-center gap-1">
                  <HugeiconsIcon icon={Leaf01Icon} size={10} />
                  Faune & Flore
                </span>
                <span className="text-foreground font-serif text-lg leading-tight mb-1">
                  {species.length} espèces
                </span>
                <span className="text-pastel-green-text text-xs font-mono">
                  {topSpecies[0]?.vernacularName || topSpecies[0]?.scientificName}
                </span>
              </div>
            </button>
          )}

          {hasQuakes && (
            <button 
              onClick={() => onSelectStory('quakes')}
              className="relative shrink-0 w-[140px] h-[180px] rounded-xl overflow-hidden group outline-none text-left bg-pastel-red-bg border border-pastel-red-text/10"
            >
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-pastel-red-text to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3 flex flex-col">
                <span className="text-pastel-red-text text-[9px] uppercase tracking-widest mb-1 flex items-center gap-1">
                  <HugeiconsIcon icon={Alert02Icon} size={10} />
                  Sismique
                </span>
                <span className="text-foreground font-serif text-lg leading-tight mb-1">
                  M {Math.max(...quakes.map(q => q.magnitude)).toFixed(1)}
                </span>
                <span className="text-pastel-red-text text-xs font-mono">
                  Activité récente
                </span>
              </div>
            </button>
          )}

        </div>
      </div>
    </div>
  );
}