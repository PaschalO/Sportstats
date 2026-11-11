/** Hit-rate colour bands used by pills and their legends. */
export type RateScale = { strong: number; medium: number; weak: number };
export type RateTone = "strong" | "medium" | "weak" | "low" | "none";

/** NHL period lines (mockup: 75%+, 60–74%, 50–59%, under 50%). */
export const PERIOD_SCALE: RateScale = { strong: 75, medium: 60, weak: 50 };
/** Market lines (mockup: 65%+, 50–64%, 35–49%, under 35%). */
export const MARKET_SCALE: RateScale = { strong: 65, medium: 50, weak: 35 };

export function rateTone(value: number | null | undefined, scale: RateScale): RateTone {
  if (value == null || !Number.isFinite(value)) return "none";
  if (value >= scale.strong) return "strong";
  if (value >= scale.medium) return "medium";
  if (value >= scale.weak) return "weak";
  return "low";
}

export function rateBands(scale: RateScale): { tone: RateTone; label: string }[] {
  return [
    { tone: "strong", label: `${scale.strong}%+` },
    { tone: "medium", label: `${scale.medium}–${scale.strong - 1}%` },
    { tone: "weak", label: `${scale.weak}–${scale.medium - 1}%` },
    { tone: "low", label: `under ${scale.weak}%` },
  ];
}
