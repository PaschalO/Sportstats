import { useMemo, useState } from "react";
import { numeric, type BasketballMatch } from "../../services/basketballService";
import {
    getBasketballPeriodDefinitions,
    getBasketballPeriodDefaultLine,
    getBasketballPeriodScore,
    type BasketballPeriodDefinition,
} from "./basketballPeriods";

type PeriodRow = {
    game_pk: number;
    opponent_name: string;
    team: number;
    opponent: number;
    total: number;
};

type PeriodData = {
    definition: BasketballPeriodDefinition;
    rows: PeriodRow[];
    totalAvg: number | null;
    scoredAvg: number | null;
    won: number;
    hits: number;
    min: number | null;
    max: number | null;
};

function getPeriodData(matches: BasketballMatch[], definition: BasketballPeriodDefinition, line: number): PeriodData {
    const rows = matches.flatMap((match) => {
        const score = getBasketballPeriodScore(match, definition.key);
        return score ? [{
            game_pk: match.game_pk,
            opponent_name: match.opponent_name,
            team: score.team_points,
            opponent: score.opponent_points,
            total: score.team_points + score.opponent_points,
        }] : [];
    });
    const count = rows.length;
    return {
        definition,
        rows,
        totalAvg: count ? rows.reduce((sum, row) => sum + row.total, 0) / count : null,
        scoredAvg: count ? rows.reduce((sum, row) => sum + row.team, 0) / count : null,
        won: rows.filter((row) => row.team > row.opponent).length,
        hits: rows.filter((row) => row.total > line).length,
        min: count ? Math.min(...rows.map((row) => row.total)) : null,
        max: count ? Math.max(...rows.map((row) => row.total)) : null,
    };
}

function PeriodCard({ period, line, best }: { period: PeriodData; line: number; best: boolean }) {
    const { definition, rows, hits, won, totalAvg, scoredAvg } = period;
    // Show the most recent 12 games, in chronological order, as in the mockup.
    const chartRows = rows.slice(0, 12).reverse();
    const low = rows.length ? Math.min(...rows.map((row) => row.total), line) : line;
    const high = rows.length ? Math.max(...rows.map((row) => row.total), line) : line;
    const baseline = Math.max(0, Math.min(30, Math.floor((low - 8) / 5) * 5));
    const ceiling = Math.max(85, Math.ceil((high + 4) / 5) * 5, baseline + 15);
    const pct = (value: number) => Math.min(100, Math.max(0, (value - baseline) / (ceiling - baseline) * 100));
    const insight = rows.length
        ? best
            ? `Strongest scoring period: ${numeric(scoredAvg)} points scored per game, with ${won} periods won.`
            : `Won ${won} of ${rows.length} periods and averaged ${numeric(scoredAvg)} points scored.`
        : "No period scores were returned for these games.";

    return (
        <article className={`min-w-0 rounded-2xl border p-4 sm:p-5 ${best ? "border-blue-200 bg-blue-50/50" : "border-line bg-white"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-ink">{definition.title}</h3>
                <span className="text-[11px] font-semibold text-accent-strong">{hits} of {rows.length} over</span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
                <div><p className="text-[11px] text-muted">Total</p><p className="mt-1 text-xl font-bold tabular-nums">{numeric(totalAvg)}</p></div>
                <div><p className="text-[11px] text-muted">Scored</p><p className="mt-1 text-xl font-bold tabular-nums">{numeric(scoredAvg)}</p></div>
                <div><p className="text-[11px] text-muted">Won</p><p className="mt-1 text-xl font-bold tabular-nums">{won}/{rows.length}</p></div>
            </div>
            <div className="relative mt-5 h-24 overflow-hidden" role="img" aria-label={`${definition.title}: ${hits} of ${rows.length} games above ${line}`}>
                <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-slate-700" style={{ bottom: `${pct(line)}%` }} />
                <div className="absolute inset-0 flex items-end gap-1">
                    {chartRows.map((row) => (
                        <div
                            key={row.game_pk}
                            className={`min-w-0 flex-1 rounded-t-[3px] ${row.total > line ? "bg-[#2452E6]" : "bg-[#D5DAE2]"}`}
                            style={{ height: `${Math.max(1.5, pct(row.total))}%` }}
                            title={`${row.opponent_name} · ${definition.title} · ${row.team}–${row.opponent} · ${row.total} combined`}
                        />
                    ))}
                    {!chartRows.length && <p className="m-auto text-xs text-muted">No data</p>}
                </div>
            </div>
            <p className="mt-4 min-h-12 text-xs leading-5 text-ink-soft">{insight}</p>
        </article>
    );
}

export default function BasketballQuarterComparison({
                                                        matches,
                                                        leagueKey,
                                                        teamName,
                                                    }: {
    matches: BasketballMatch[];
    leagueKey: string;
    teamName: string;
}) {
    const defaultLine = getBasketballPeriodDefaultLine(leagueKey);
    const [line, setLine] = useState(defaultLine);
    const definitions = useMemo(() => getBasketballPeriodDefinitions(matches, leagueKey), [matches, leagueKey]);
    const summaries = useMemo(() => definitions.map((definition) => getPeriodData(matches, definition, line)), [matches, definitions, line]);
    const best = [...summaries].filter((item) => item.scoredAvg !== null).sort((a, b) => (b.scoredAvg ?? 0) - (a.scoredAvg ?? 0))[0]?.definition.key;
    const min = summaries.flatMap((item) => item.rows.map((row) => row.total));
    const axisMin = Math.max(0, Math.min(30, Math.floor((Math.min(line, ...min, 30) - 8) / 5) * 5));
    const axisMax = Math.max(85, Math.ceil((Math.max(line, ...min, 80) + 4) / 5) * 5);
    const options = useMemo(() => [...new Set([defaultLine, line, ...Array.from({ length: 35 }, (_, index) => 19.5 + index * 5),
        ...Array.from({ length: 35 }, (_, index) => 20.5 + index * 5)])].filter((n) => n > 0).sort((a, b) => a - b), [defaultLine, line]);
    const isHalf = definitions.length === 2 && (leagueKey === "ncaab" || !definitions.some((p) => p.key.startsWith("Q")));

    return (
        <section className="w-full min-w-0 space-y-4" aria-label={isHalf ? "Half by half" : "Quarter by quarter"}>
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-xl font-semibold text-ink">{isHalf ? "Half by half" : "Quarter by quarter"}</h2>
                    <p className="mt-1 text-xs text-muted">Combined points in each {isHalf ? "half" : "quarter"}, every game. Dashed line = Over {line.toFixed(1)}.</p>
                </div>
                <label className="flex items-center gap-3 text-xs text-muted">
                    <span>{isHalf ? "Half line" : "Quarter line"}</span>
                    <select
                        className="rounded-lg border border-line bg-white px-3 py-2.5 font-semibold text-ink"
                        value={line}
                        onChange={(event) => setLine(Number(event.target.value))}
                    >
                        {options.map((value) => <option key={value} value={value}>Over {value.toFixed(1)}</option>)}
                    </select>
                </label>
            </header>
            {!summaries.length ? (
                <div className="rounded-xl border border-line bg-white p-5 text-sm text-muted">No usable period scores were returned for {teamName}. Expected Q1–Q4, NCAAB Q1/Q2, or 1H/2H.</div>
            ) : (
                <div className={`grid gap-4 sm:grid-cols-2 ${summaries.length >= 3 ? "xl:grid-cols-4" : "xl:grid-cols-2"}`}>
                    {summaries.map((period) => <PeriodCard key={period.definition.key} period={period} line={line} best={period.definition.key === best} />)}
                </div>
            )}
            <p className="text-[11px] text-muted">Mini-charts show up to 12 recent games, oldest to newest. Axis range: {axisMin}–{axisMax} points. “Won” means {teamName} outscored its opponent in that period; ties do not count.</p>
        </section>
    );
}
