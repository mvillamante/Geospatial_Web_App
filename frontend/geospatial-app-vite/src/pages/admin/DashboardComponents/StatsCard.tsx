import type { LucideIcon } from "lucide-react";
import "./StatsCard.css";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
}: StatsCardProps) {
  return (
    <div className="stats-card">
      <div className="stats-card-content">
        <div className="stats-card-left">
          <p className="stats-card-title">{title}</p>
          <p className="stats-card-value">{value}</p>

          {trend && (
            <p
              className={`stats-card-trend ${
                trend.isPositive ? "positive" : "negative"
              }`}
            >
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}% from last
              month
            </p>
          )}
        </div>

        <div className="stats-card-icon-wrapper">
          <Icon className="stats-card-icon" />
        </div>
      </div>
    </div>
  );
}
