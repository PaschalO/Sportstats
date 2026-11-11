import { byNewest } from "../../lib/format";
import type { FormResult, ResultTone } from "../../lib/results";
import type { SelectOption } from "../../component/ui";
import {
  describeNHLResult,
  isNHLWin,
  nhlFinish,
  type LastGames,
  type NHLMatchResult,
  type NHLMatchSummary,
  type PeriodLine,
} from "../../services/nhlService";

export const SPORT = "hockey";
export const PERIODS = [
  { key: "1ST", label: "1st", field: "first_period" },
  { key: "2ND", label: "2nd", field: "second_period" },
  { key: "3RD", label: "3rd", field: "third_period" },
] as const;

export const PERIOD_LINE_OPTIONS: SelectOption<PeriodLine>[] = [0.5, 1.5, 2.5].map((value) => ({
  value: value as PeriodLine,
  label: `Over ${value}`,
}));

export const LAST_GAMES_OPTIONS: SelectOption<LastGames>[] = [5, 10, 20, 50, 100].map((value) => ({
  value: value as LastGames,
  label: `${value} games`,
}));

function tone(result: NHLMatchResult): ResultTone {
  if (result === "W") return "win";
  if (isNHLWin(result)) return "softWin";
  return result === "L" ? "loss" : "draw";
}

export function nhlResult(match: Pick<NHLMatchSummary, "game_pk" | "result">): FormResult {
  return {
    key: match.game_pk,
    label: isNHLWin(match.result) ? "W" : "L",
    note: nhlFinish(match.result),
    tone: tone(match.result),
    title: describeNHLResult(match.result),
  };
}

/** Last five results, oldest first so the newest sits on the right. */
export const nhlForm = (matches: NHLMatchSummary[]) =>
  byNewest(matches).slice(0, 5).reverse().map(nhlResult);
