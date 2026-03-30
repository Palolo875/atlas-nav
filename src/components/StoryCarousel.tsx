import useEmblaCarousel from "embla-carousel-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, Leaf01Icon, BookOpen01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import type { Earthquake, GBIFSpecies, WikiSummary, NaturalEvent } from "@/lib/enrichment";

interface StoryCarouselProps {
  quakes: Earthquake[];
  species: GBIFSpecies[];
  wiki: WikiSummary | null;
  naturalEvents: NaturalEvent[];
  onSelectStory: (id: string) => void;
}

export default function StoryCarousel({ quakes, species, wiki, naturalEvents, onSelectStory }: StoryCarouselProps) {
  const [emblaRef] = useEmblaCarousel({
    align: "start",
    dragFree: false,
    containScroll: "trimSnaps",
  });

  const hasQuakes = quakes.some(q => q.magnitude >= 3);
  const topSpecies = species.slice(0, 3);
  const hasNature = topSpecies.length > 0;
  const hasWiki = !!wiki?.extract;
  const hasEvents = naturalEvents.length > 0;

  if (!hasQuakes && !hasNature && !hasWiki && !hasEvents) return null;

  return (
    <div className="w-full pb-6 border-b border-border animate-fade-in-up">
      <div className="px-5 mb-3 flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          À la une
        </h2>
      </div>
      
      <div className="overflow-hidden px-1" ref={emblaRef}>
        <div className="flex touch-pan-y">
          
          {hasEvents && (
            <div className="flex-[0_0_85%] min-w-0 pl-4 first:pl-5 last:pr-5">
              <div 
                className="relative h-[280px] rounded-2xl overflow-hidden select-none bg-pastel-red-bg border-2 border-pastel-red-text/30 shadow-md flex flex-col justify-end p-5"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-pastel-red-text animate-pulse" />
                <div className="absolute inset-0 opacity-[0.12] bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-pastel-red-text to-transparent" />
                <div className="relative z-10">
                  <span className="text-pastel-red-text text-[10px] uppercase tracking-widest mb-2 flex items-center gap-1.5 font-bold">
                    <HugeiconsIcon icon={Alert02Icon} size={12} />
                    Alerte Environnementale (NASA)
                  </span>
                  <span className="text-foreground font-serif text-3xl leading-tight mb-3 block">
                    {naturalEvents[0].title}
                  </span>
                  <p className="text-foreground/80 text-sm leading-relaxed mb-4">
                    Un événement de type <strong className="text-pastel-red-text">{naturalEvents[0].category.toLowerCase()}</strong> est signalé à seulement {naturalEvents[0].distanceKm} km. Restez vigilant.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {hasWiki && wiki && (
            <div className="flex-[0_0_85%] min-w-0 pl-4 first:pl-5 last:pr-5">
              <div 
                className="relative h-[280px] rounded-2xl overflow-hidden select-none bg-secondary shadow-sm border border-border"
              >
                {wiki.thumbnail && (
                  <img src={wiki.thumbnail} alt={wiki.title} className="absolute inset-0 w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/10" />
                <div className="absolute inset-x-0 bottom-0 p-5 flex flex-col">
                  <span className="text-white/80 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <HugeiconsIcon icon={BookOpen01Icon} size={12} />
                    Histoire & Culture
                  </span>
                  <span className="text-white font-serif text-2xl leading-tight mb-3">
                    {wiki.title}
                  </span>
                  <p className="text-white/70 text-xs line-clamp-4 leading-relaxed font-medium">
                    {wiki.extract}
                  </p>
                </div>
              </div>
            </div>
          )}

          {hasNature && (
            <div className="flex-[0_0_85%] min-w-0 pl-4 first:pl-5 last:pr-5">
              <div 
                className="relative h-[280px] rounded-2xl overflow-hidden select-none bg-pastel-green-bg border border-pastel-green-text/20 shadow-sm flex flex-col justify-end p-5"
              >
                <div className="absolute inset-0 opacity-[0.15] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pastel-green-text to-transparent" />
                <div className="relative z-10">
                  <span className="text-pastel-green-text text-[10px] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <HugeiconsIcon icon={Leaf01Icon} size={12} />
                    Biodiversité
                  </span>
                  <span className="text-foreground font-serif text-4xl leading-tight mb-3 block">
                    {species.length} espèces
                  </span>
                  <p className="text-foreground/80 text-sm leading-relaxed mb-4">
                    Cet écosystème abrite des {topSpecies[0]?.kingdom === 'Plantae' ? 'plantes' : topSpecies[0]?.kingdom === 'Animalia' ? 'animaux' : 'organismes'} comme : <strong className="font-medium text-pastel-green-text">{topSpecies.map(s => s.vernacularName || s.scientificName).join(', ')}</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {hasQuakes && (
            <div className="flex-[0_0_85%] min-w-0 pl-4 first:pl-5 last:pr-5">
              <div 
                className="relative h-[280px] rounded-2xl overflow-hidden select-none bg-pastel-red-bg border border-pastel-red-text/20 shadow-sm flex flex-col justify-end p-5"
              >
                <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-pastel-red-text to-transparent" />
                <div className="relative z-10">
                  <span className="text-pastel-red-text text-[10px] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <HugeiconsIcon icon={Alert02Icon} size={12} />
                    Activité Sismique
                  </span>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-foreground font-serif text-5xl leading-tight">
                      M{Math.max(...quakes.map(q => q.magnitude)).toFixed(1)}
                    </span>
                    <span className="text-pastel-red-text font-mono text-xs">Max (30j)</span>
                  </div>
                  <p className="text-foreground/80 text-sm leading-relaxed mb-4">
                    <strong className="text-pastel-red-text">{quakes.length} secousses</strong> enregistrées récemment. L'activité tectonique est notable dans ce périmètre.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}