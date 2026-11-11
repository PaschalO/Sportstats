import type { BasketballMatch } from "../../services/basketballService";

export type BasketballHalf = "1H" | "2H";
export type BasketballPeriodScore = { team_points: number; opponent_points: number };

// Use only complete, numeric scores. Missing periods are not zero-point periods.
function score(value: unknown): BasketballPeriodScore | null {
    if (!value || typeof value !== "object") return null;
    const item = value as Record<string, unknown>;
    if (item.team_points == null || item.opponent_points == null) return null;
    const team = Number(item.team_points);
    const opponent = Number(item.opponent_points);
    return Number.isFinite(team) && Number.isFinite(opponent)
        ? { team_points: team, opponent_points: opponent }
        : null;
}

export function getBasketballPeriodScore(match: BasketballMatch, key: string): BasketballPeriodScore | null {
    return score(match.periods?.[key]);
}

/**
 * Resolve halves using the competition's period convention.
 * NBA / WNBA / NBL: Q1 + Q2 and Q3 + Q4.
 * NCAAB in this user's feed: Q1 is the 1st half, Q2 is the 2nd half.
 * Explicit 1H/2H, H1/H2, or 1ST/2ND scores take precedence when provided.
 * OT is excluded. Never infer a half from a single missing quarter.
 */
export function getBasketballHalfScore(
    match: BasketballMatch,
    half: BasketballHalf,
    leagueKey: string,
): BasketballPeriodScore | null {
    const directKeys = half === "1H" ? ["1H", "H1", "1ST"] : ["2H", "H2", "2ND"];
    for (const key of directKeys) {
        const found = getBasketballPeriodScore(match, key);
        if (found) return found;
    }

    if (leagueKey.toLowerCase() === "ncaab") {
        const first = getBasketballPeriodScore(match, "Q1");
        const second = getBasketballPeriodScore(match, "Q2");
        const third = getBasketballPeriodScore(match, "Q3");
        const fourth = getBasketballPeriodScore(match, "Q4");
        if (first && second && !third && !fourth) {
            return half === "1H" ? first : second;
        }
    }

    const parts = half === "1H" ? ["Q1", "Q2"] : ["Q3", "Q4"];
    const a = getBasketballPeriodScore(match, parts[0]);
    const b = getBasketballPeriodScore(match, parts[1]);
    if (!a || !b) return null;
    return { team_points: a.team_points + b.team_points, opponent_points: a.opponent_points + b.opponent_points };
}

export type BasketballPeriodDefinition = { key: string; title: string };

export function getBasketballPeriodDefinitions(matches: BasketballMatch[], leagueKey: string): BasketballPeriodDefinition[] {
    const keys = new Set(matches.flatMap((match) => Object.keys(match.periods ?? {})));
    const quarters = ["Q1", "Q2", "Q3", "Q4"].filter((key) => keys.has(key));
    if (leagueKey.toLowerCase() === "ncaab" && quarters.length === 2 && quarters[0] === "Q1" && quarters[1] === "Q2") {
        return [{ key: "Q1", title: "Q1 · 1st half" }, { key: "Q2", title: "Q2 · 2nd half" }];
    }
    if (quarters.length) return quarters.map((key) => ({ key, title: key }));
    if (keys.has("1H") && keys.has("2H")) return [{ key: "1H", title: "1st half" }, { key: "2H", title: "2nd half" }];
    if (keys.has("H1") && keys.has("H2")) return [{ key: "H1", title: "1st half" }, { key: "H2", title: "2nd half" }];
    if (keys.has("1ST") && keys.has("2ND")) return [{ key: "1ST", title: "1st half" }, { key: "2ND", title: "2nd half" }];
    return [];
}

export function getBasketballHalfDefaultLine(leagueKey: string): number {
    return leagueKey === "nba" ? 114.5 : leagueKey === "ncaab" ? 74.5 : leagueKey === "wnba" ? 79.5 : 89.5;
}

export function getBasketballPeriodDefaultLine(leagueKey: string): number {
    return leagueKey === "nba" ? 57.5 : leagueKey === "ncaab" ? 74.5 : leagueKey === "wnba" ? 39.5 : 44.5;
}
