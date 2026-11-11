import { byNewest } from "../../lib/format";
import { resultTone, type FormResult } from "../../lib/results";
import type { BasketballMatch, BasketballSplit } from "../../services/basketballService";

export const SPORT = "basketball";

export const LAST_N_OPTIONS = [5, 10, 15, 100].map((value) => ({
  value,
  label: value === 100 ? "Season" : `Last ${value}`,
}));

export const netRating = (s: BasketballSplit) => s.points_for_per_game - s.points_against_per_game;

export function basketballForm(matches: BasketballMatch[] = []): FormResult[] {
  return byNewest(matches)
    .slice(0, 5)
    .reverse()
    .map((m) => ({
      key: m.game_pk,
      label: m.result,
      tone: resultTone(m.result),
      title: `${m.result} ${m.score_line} vs ${m.opponent_name}`,
    }));
}
