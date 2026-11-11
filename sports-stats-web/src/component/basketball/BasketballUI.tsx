import type { ReactNode } from "react";
import type { BasketballLocation, BasketballMatch } from "../../services/basketballService";

export function LocationSwitch({ value, onChange }: { value: BasketballLocation; onChange: (value: BasketballLocation) => void }) {
    return <div role="group" aria-label="Game location" className="inline-flex rounded-lg bg-surface p-1 text-xs">
        {(["overall", "home", "away"] as const).map((location) => <button type="button" key={location} aria-pressed={value === location} onClick={() => onChange(location)} className={`rounded-md px-3 py-2 font-semibold capitalize ${value === location ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"}`}>{location === "overall" ? "All games" : location}</button>)}
    </div>;
}
export function SmallSelect<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
    return <label className="flex min-w-0 flex-col gap-1 text-[11px] text-muted"><span>{label}</span><select aria-label={label} className="min-w-0 rounded-lg border border-line-strong bg-white px-3 py-2 text-xs font-semibold text-ink" value={value} onChange={(e) => {
        const next = options.find((option) => String(option.value) === e.target.value);
        if (next) onChange(next.value);
    }}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
export function StatCard({ label, value, detail, accent = false }: { label: string; value: ReactNode; detail: ReactNode; accent?: boolean }) {
    return <article className={`min-w-0 rounded-xl border p-4 sm:p-5 ${accent ? "border-accent-soft bg-accent-tint" : "border-line bg-white"}`}>
        <p className={`text-[11px] font-semibold ${accent ? "text-accent-strong" : "text-muted"}`}>{label}</p>
        <p className={`mt-2 text-2xl font-bold tabular-nums sm:text-3xl ${accent ? "text-accent-strong" : "text-ink"}`}>{value}</p>
        <p className="mt-1 text-[11px] text-ink-soft">{detail}</p>
    </article>;
}
export function FormPills({ matches }: { matches: BasketballMatch[] }) {
    return (
        <span className="inline-flex items-center gap-1" aria-label={`Recent form: ${matches.map((m) => m.result).join(", ")}`}>
            {matches.slice(0, 5).reverse().map((m) => <span key={m.game_pk} title={`${m.opponent_name}: ${m.score_line}`} className={`grid size-4 place-items-center rounded text-[9px] font-bold ${m.result === "W" ? "bg-ink text-white" : "border border-line-strong bg-white text-muted"}`}>{m.result}</span>)}
        </span>
    );
}
export function ErrorCard({ error, retry }: { error: unknown; retry?: () => void }) {
    return <section role="alert" className="rounded-xl border border-line p-6"><h2 className="text-lg">Could not load basketball statistics</h2><p className="mt-2 break-words text-sm text-muted">{error instanceof Error ? error.message : String(error)}</p>{retry && <button type="button" onClick={retry} className="mt-4 rounded-lg border border-line px-4 py-2 text-xs font-semibold">Retry</button>}</section>;
}
export function Loading() { return <div className="py-20 text-center text-sm text-muted" role="status">Loading basketball statistics…</div>; }
export function MiniInitials({ name }: { name: string }) { return <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface text-[10px] font-bold text-ink-soft">{name.split(/\s+/).map((word) => word[0]).join("").slice(0, 3).toUpperCase()}</span>; }
