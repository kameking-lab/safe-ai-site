"use client";

import {
  Shield,
  GraduationCap,
  ClipboardList,
  Database,
  Scale,
  Info,
  CreditCard,
  Search,
  MessageSquare,
  Handshake,
  BarChart3,
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { PageHeader } from "@/components/page-header";

const ICON_MAP = {
  Shield,
  GraduationCap,
  ClipboardList,
  Database,
  Scale,
  Info,
  CreditCard,
  Search,
  MessageSquare,
  Handshake,
  BarChart3,
} as const;

export type TranslatedPageHeaderIconName = keyof typeof ICON_MAP;

interface TranslatedPageHeaderProps {
  titleJa: string;
  titleEn: string;
  descriptionJa: string;
  descriptionEn: string;
  iconName: TranslatedPageHeaderIconName;
  iconColor: "emerald" | "blue" | "amber" | "red";
  badge?: string;
}

export function TranslatedPageHeader({
  titleJa,
  titleEn,
  descriptionJa,
  descriptionEn,
  iconName,
  iconColor,
  badge,
}: TranslatedPageHeaderProps) {
  const { language } = useLanguage();
  const Icon = ICON_MAP[iconName];
  return (
    <PageHeader
      title={language === "en" ? titleEn : titleJa}
      description={language === "en" ? descriptionEn : descriptionJa}
      icon={Icon}
      iconColor={iconColor}
      badge={badge}
    />
  );
}
