export interface ChartTheme {
  grid: string;
  tick: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  series: string;
  areaFill: string;
  barColors: {
    kritis: string;
    hampirHabis: string;
    aman: string;
  };
}

export const CHART_TICK_FONT_SIZE = 12;

// Nilai hardcode identik dengan CSS vars DaisyUI (globals.css).
// Digunakan sebagai initial state agar SSR + first client render SAMA (anti hydration mismatch).
export const CHART_THEME_FALLBACK: ChartTheme = {
  grid: 'oklch(0.935 0.004 260)',
  tick: 'oklch(0.40 0.03 260)',
  tooltipBg: 'oklch(0.99 0.002 260)',
  tooltipBorder: 'oklch(0.90 0.005 260)',
  tooltipText: 'oklch(0.18 0.03 260)',
  series: 'oklch(0.46 0.17 260)',
  areaFill: 'oklch(0.935 0.004 260)',
  barColors: {
    kritis: '#ef4444',
    hampirHabis: '#f59e0b',
    aman: '#22c55e',
  },
};

function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

// Dipanggil HANYA setelah mount (client-only) via useEffect.
export function getChartTheme(): ChartTheme {
  return {
    grid: cssVar('--color-base-300', CHART_THEME_FALLBACK.grid),
    tick: cssVar('--color-base-content', CHART_THEME_FALLBACK.tick),
    tooltipBg: cssVar('--color-base-100', CHART_THEME_FALLBACK.tooltipBg),
    tooltipBorder: cssVar('--color-base-300', CHART_THEME_FALLBACK.tooltipBorder),
    tooltipText: cssVar('--color-base-content', CHART_THEME_FALLBACK.tooltipText),
    series: cssVar('--color-primary', CHART_THEME_FALLBACK.series),
    areaFill: cssVar('--color-base-300', CHART_THEME_FALLBACK.areaFill),
    barColors: {
      kritis: cssVar('--color-error', CHART_THEME_FALLBACK.barColors.kritis),
      hampirHabis: cssVar('--color-warning', CHART_THEME_FALLBACK.barColors.hampirHabis),
      aman: cssVar('--color-success', CHART_THEME_FALLBACK.barColors.aman),
    },
  };
}