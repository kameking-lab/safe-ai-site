import type { ComponentType, SVGProps } from "react";
import {
  BadgeHelp,
  Construction,
  Flame,
  FlaskConical,
  Footprints,
  MoonStar,
  MoveUp,
  PackageOpen,
  PanelsTopLeft,
  ShieldAlert,
  ThermometerSun,
  TrafficCone,
  TriangleAlert,
  UserRound,
  Zap,
} from "lucide-react";
import type { VisualKyCategoryDefinition } from "@/data/visual-ky";

const icons: Record<
  VisualKyCategoryDefinition["icon"],
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  "shield-alert": ShieldAlert,
  construction: Construction,
  "package-open": PackageOpen,
  zap: Zap,
  flame: Flame,
  "flask-conical": FlaskConical,
  "thermometer-sun": ThermometerSun,
  footprints: Footprints,
  "move-up": MoveUp,
  "panels-top-left": PanelsTopLeft,
  "triangle-alert": TriangleAlert,
  "user-round": UserRound,
  "badge-help": BadgeHelp,
  "moon-star": MoonStar,
  "traffic-cone": TrafficCone,
};

export function VisualKyCategoryIcon({
  icon,
  className = "h-5 w-5",
}: {
  icon: VisualKyCategoryDefinition["icon"];
  className?: string;
}) {
  const Icon = icons[icon];
  return <Icon className={className} aria-hidden="true" />;
}
