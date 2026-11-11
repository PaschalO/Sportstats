import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode, KeyboardEvent } from "react";
/** Generic responsive, sortable table shell suitable for NFL, NCAAF, basketball, or other sports. */
export type StatsColumn<T> = {
    key: string; label: string; render: (row:T)=>ReactNode;
    sortValue?:(row:T)=>number|string;
    priority?: "main"|"medium"|"all";
};
export default function StatsTable<T extends { team_pk:number;team_name:string }>({
                                                                                      rows,columns,sportSlug,leagueKey,sortKey,desc,onSort,shown,onShowAll,badge,
                                                                                  }: {
    rows:T[];columns:StatsColumn<T>[];sportSlug:string;leagueKey:string;
    sortKey:string;desc:boolean;onSort:(key:string)=>void;shown:number;onShowAll:()=>void;
    badge?:(row:T)=>ReactNode;
}) {
    const displayed=rows.slice(0,shown),navigate=useNavigate();
    const toTeam=(row:T)=>void navigate({to:"/$sport/$league/teams/$teamId",params:{sport:sportSlug,league:leagueKey,teamId:String(row.team_pk)}});
    const initials=(row:T)=><span className="grid size-7 shrink-0 place-items-center rounded-md bg-surface px-1 text-[10px] font-bold text-ink-soft">{row.team_name.split(/\s+/).map(w=>w[0]).join("").slice(0,3)}</span>;
    const goOnKey=(e:KeyboardEvent<HTMLTableRowElement>,row:T)=>{if(e.target!==e.currentTarget)return;if(e.key==="Enter"||e.key===" "){e.preventDefault();toTeam(row);}};
    return <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="grid gap-3 p-3 md:hidden">{displayed.map((row,i)=><article key={row.team_pk} className="cursor-pointer rounded-lg border border-line p-3" onClick={()=>toTeam(row)}><Link onClick={e=>e.stopPropagation()} to="/$sport/$league/teams/$teamId" params={{sport:sportSlug,league:leagueKey,teamId:String(row.team_pk)}} className="flex items-center gap-2 font-semibold text-ink hover:text-accent-strong">{badge?badge(row):initials(row)}<span className="flex-1">{row.team_name}</span><span className="text-xs text-muted">#{i+1}</span></Link><div className="mt-3 grid grid-cols-3 gap-2">{columns.filter(c=>c.key!=="team"&&c.priority!=="all").slice(0,6).map(c=><div key={c.key} className="text-center"><p className="text-[10px] text-muted">{c.label}</p><div className="mt-1 text-xs font-bold text-ink">{c.render(row)}</div></div>)}</div></article>)}</div>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[780px] table-auto text-[11px] tabular-nums 2xl:table-fixed"><thead className="bg-surface-soft"><tr><th className="px-2 py-3 text-left text-[10px] text-muted">#</th><th className="sticky left-0 z-10 bg-surface-soft px-2 py-3 text-left text-[10px] text-muted">TEAM</th>{columns.filter(c=>c.key!=="team").map(c=><th key={c.key} className={`whitespace-nowrap px-2 py-3 text-center text-[10px] font-semibold text-muted ${c.priority==="all"?"hidden 2xl:table-cell":c.priority==="medium"?"hidden xl:table-cell":""}`}><button disabled={!c.sortValue} onClick={()=>onSort(c.key)} className="disabled:cursor-default enabled:hover:text-accent-strong">{c.label}{sortKey===c.key?(desc?" ↓":" ↑"):""}</button></th>)}</tr></thead><tbody>{displayed.map((row,i)=><tr key={row.team_pk} role="link" tabIndex={0} aria-label={`View ${row.team_name} statistics`} onClick={()=>toTeam(row)} onKeyDown={e=>goOnKey(e,row)} className="group cursor-pointer border-t border-line-soft hover:bg-surface-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"><td className="px-2 py-3 text-center text-muted">{i+1}</td><td className="sticky left-0 bg-white px-2 py-2.5 group-hover:bg-surface-soft"><Link onClick={e=>e.stopPropagation()} to="/$sport/$league/teams/$teamId" params={{sport:sportSlug,league:leagueKey,teamId:String(row.team_pk)}} className="flex min-w-40 items-center gap-2 font-semibold text-ink hover:text-accent-strong">{badge?badge(row):initials(row)}<span className="truncate">{row.team_name}</span></Link></td>{columns.filter(c=>c.key!=="team").map(c=><td key={c.key} className={`px-2 py-2.5 text-center text-ink-soft ${c.priority==="all"?"hidden 2xl:table-cell":c.priority==="medium"?"hidden xl:table-cell":""}`}>{c.render(row)}</td>)}</tr>)}</tbody></table></div>
        <div className="flex items-center justify-between gap-3 border-t border-line-soft px-3 py-2 text-[11px] text-muted"><span>Showing {displayed.length} of {rows.length} teams</span>{rows.length>16&&<button onClick={onShowAll} className="rounded-lg border border-accent-soft px-3 py-2 font-semibold text-accent-strong">{shown>=rows.length?"Show first 16":`Show all ${rows.length} teams`}</button>}</div>
    </div>;
}
