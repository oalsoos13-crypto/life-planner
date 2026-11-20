// أيقونات خطية موحّدة (Lucide): نفس السماكة والحجم بكل التطبيق (Atomic Design: ذرة)
import {
  BookOpen, CalendarRange, Check, ChevronLeft, ChevronRight, Circle, Compass, Droplets, Dumbbell, Footprints, Gem, HandHeart,
  Lightbulb, Mic, Moon, Pause, Pen, Plus, Settings2, Sparkles, Sun, Trash2, X, Zap, ListChecks, Wallet, Gauge, Smile, Undo2, Send, BatteryMedium, Users, Brain, RotateCcw, type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  BookOpen, CalendarRange, Check, ChevronLeft, ChevronRight, Circle, Compass, Droplets, Dumbbell, Footprints, Gem, HandHeart,
  Lightbulb, Mic, Moon, Pause, Pen, Plus, Settings2, Sparkles, Sun, Trash2, X, Zap, ListChecks, Wallet, Gauge, Smile, Undo2, Send, BatteryMedium, Users, Brain, RotateCcw,
};

/** أيقونات العادات الي بيختار منها */
export const HABIT_ICONS = ["Footprints", "BookOpen", "Droplets", "Moon", "Dumbbell", "HandHeart", "Pen", "Lightbulb", "Sun", "Circle"] as const;

export function Icon({ name, size = 22, strokeWidth = 1.8, className }: { name: string; size?: number; strokeWidth?: number; className?: string }) {
  const C = ICONS[name] ?? Circle;
  return <C size={size} strokeWidth={strokeWidth} className={className} aria-hidden />;
}
