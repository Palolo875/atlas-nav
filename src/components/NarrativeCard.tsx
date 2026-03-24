import type { NarrativeInsight } from "@/lib/narrative";
import { cn } from "@/lib/utils";

interface NarrativeCardProps {
  insight: NarrativeInsight;
  index: number;
}

const pastelMap = {
  green: { bg: "bg-pastel-green-bg", text: "text-pastel-green-text" },
  blue: { bg: "bg-pastel-blue-bg", text: "text-pastel-blue-text" },
  yellow: { bg: "bg-pastel-yellow-bg", text: "text-pastel-yellow-text" },
  red: { bg: "bg-pastel-red-bg", text: "text-pastel-red-text" },
};

const categoryLabels: Record<string, string> = {
  comfort: "Confort",
  air: "Air",
  uv: "UV",
  wind: "Vent",
  visibility: "Visibilité",
  altitude: "Altitude",
  precipitation: "Précipitations",
  pressure: "Pression",
};

export default function NarrativeCard({ insight, index }: NarrativeCardProps) {
  const colors = pastelMap[insight.pastel];

  return (
    <div
      className="animate-fade-in-up border-b border-border py-4 last:border-0"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-start gap-3">
        <span className={cn("shrink-0 mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest", colors.bg, colors.text)}>
          {categoryLabels[insight.category]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-relaxed text-foreground">{insight.signal}</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{insight.proof}</p>
        </div>
      </div>
    </div>
  );
}
