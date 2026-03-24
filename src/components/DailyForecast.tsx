import type { WeatherData } from "@/lib/weather";
import { getWeatherDescription } from "@/lib/weather";

interface DailyForecastProps {
  daily: WeatherData["daily"];
}

const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export default function DailyForecast({ daily }: DailyForecastProps) {
  return (
    <div className="space-y-0">
      {daily.time.map((date, i) => {
        const d = new Date(date);
        const dayLabel = i === 0 ? "Auj." : dayNames[d.getDay()];
        const maxT = Math.round(daily.temperatureMax[i]);
        const minT = Math.round(daily.temperatureMin[i]);
        const precip = daily.precipitationProbabilityMax[i];

        return (
          <div
            key={date}
            className="flex items-center justify-between py-2.5 border-b border-border last:border-0 animate-fade-in-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="text-sm text-foreground w-12">{dayLabel}</span>
            <span className="text-xs text-muted-foreground flex-1 truncate px-2">
              {getWeatherDescription(daily.weatherCode[i])}
            </span>
            {precip > 0 && (
              <span className="text-[10px] font-mono text-pastel-blue-text mr-3">{precip}%</span>
            )}
            <div className="flex gap-2 font-mono text-sm">
              <span className="text-muted-foreground">{minT}°</span>
              <span className="text-foreground">{maxT}°</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
