/**
 * The navigation, derived from the business: the dashboard, the business's two record tables and
 * its health page. The rail, the phone's bottom bar and the command palette all read this list, so
 * a destination is defined once.
 */
import {
  Activity,
  BookOpen,
  Building2,
  GraduationCap,
  Heart,
  LayoutDashboard,
  Package,
  Receipt,
  Server,
  ShoppingCart,
  Users,
  type LucideIcon,
} from "lucide-react";

import { t, tl } from "@/i18n";
import type { BusinessProfile, IconName } from "@/profiles";
import type { Route } from "@/router";

export const ICONS: Record<IconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  users: Users,
  server: Server,
  building: Building2,
  receipt: Receipt,
  cart: ShoppingCart,
  heart: Heart,
  graduation: GraduationCap,
  book: BookOpen,
  package: Package,
  health: Activity,
};

export interface NavItem {
  id: "dashboard" | "records-0" | "records-1" | "health";
  to: string;
  /** The full name: the rail's tooltip, the palette, the page title. */
  label: string;
  /** What fits in the phone's bottom bar. */
  short: string;
  icon: LucideIcon;
  active: boolean;
  /** Extra words the command palette matches, in both languages. */
  keywords: string[];
}

export function navItems(p: BusinessProfile, route: Route): NavItem[] {
  const [e0, e1] = p.entities;
  return [
    {
      id: "dashboard",
      to: "/",
      label: t("nav.dashboard"),
      short: t("nav.dashboard"),
      icon: LayoutDashboard,
      active: route.page === "dashboard",
      keywords: ["dashboard", "overview", "home", "داشبورد", "نمای کلی"],
    },
    ...[e0, e1].map((e, i) => ({
      id: `records-${i}` as "records-0" | "records-1",
      to: `/${e.path}`,
      label: tl(e.label),
      short: tl(e.label),
      icon: ICONS[e.icon],
      active: route.page === "records" && route.index === i,
      keywords: [e.label.en, e.label.fa, e.things.en, e.things.fa, e.path],
    })),
    {
      id: "health",
      to: "/health",
      label: tl(p.copy.health),
      short: t("nav.health"),
      icon: Activity,
      active: route.page === "health",
      keywords: ["health", "status", "uptime", "incidents", "سلامت", "وضعیت", p.copy.health.en, p.copy.health.fa],
    },
  ];
}
