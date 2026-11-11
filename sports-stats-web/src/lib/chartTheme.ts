/** Recharts needs raw colours; these mirror the tokens in index.css. */
export const CHART = {
  accent: "#1F4FE0",
  accentMid: "#9DB5F7",
  accentFaded: "#C4D1F9",
  opponent: "#E8833A",
  opponentFaded: "#F4CFB6",
  ink: "#0B1220",
  inkSoft: "#3B4352",
  muted: "#5B6474",
  faint: "#8A93A3",
  grid: "#EEF0F3",
  neutral: "#D5D9E0",
  cursor: "#F1F3F7",
} as const;

export const AXIS_TICK = { fill: CHART.muted, fontSize: 11 } as const;
export const VALUE_TICK = { fill: CHART.faint, fontSize: 11 } as const;
export const BAR_LABEL = { fill: CHART.inkSoft, fontSize: 11, fontWeight: 600 } as const;
