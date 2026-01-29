import type { ColorScheme } from './types';

export const COLOR_PALETTES: Record<ColorScheme, string[]> = {
  default: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'],
  monochrome: ['#fafafa', '#a1a1aa', '#71717a', '#52525b', '#3f3f46', '#27272a'],
  warm: ['#f97316', '#ef4444', '#eab308', '#f59e0b', '#dc2626', '#ca8a04'],
  cool: ['#3b82f6', '#6366f1', '#06b6d4', '#0ea5e9', '#8b5cf6', '#14b8a6'],
  editorial: ['#1e3a5f', '#c9a227', '#7c3238', '#2d5a3c', '#5c4033', '#4a4a4a'],
  muted: ['#64748b', '#78716c', '#71717a', '#6b7280', '#737373', '#525252'],
};
