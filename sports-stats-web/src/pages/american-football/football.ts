import { byNewest, fmtRecord, range } from "../../lib/format";
import { resultTone, type FormResult } from "../../lib/results";
import type {
  FootballBetKind,
  FootballMatch,
  FootballSplit,
} from "../../services/americanFootballService";

export const SPORT = "football";

export const LAST_N_OPTIONS = [5, 10, 20, 50, 100].map((value) => ({
  value,
  label: value === 100 ? "Season" : `${value} games`,
}));

export const record = (s: FootballSplit) =>
  fmtRecord(s.wins, s.losses, ...(s.ties ? [s.ties] : []));

export const signedLine = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
export const spreadOptions = range(-20, 20, 0.5).map((value) => ({
  value,
  label: signedLine(value),
}));

export const BETS: { key: FootballBetKind; label: string; short: (line: number) => string }[] = [
  { key: "gameTotal", label: "Game total", short: (line) => `O${line}` },
  { key: "teamTotal", label: "Team total", short: (line) => `TT O${line}` },
  { key: "teamSpread", label: "Spread", short: (line) => `Cover ${signedLine(line)}` },
  { key: "opponentSpread", label: "Opponent spread", short: (line) => `Opp ${signedLine(line)}` },
];

export function footballForm(matches: FootballMatch[] = []): FormResult[] {
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
