import { getLeague, getSections, getSport } from "./sports";
import { SOCCER_LEAGUES, getSoccerLeague } from "../services/soccerService";

/** Navigation-only metadata. API competition names/season IDs stay in soccerService.ts. */
export type NavLeague = { slug: string; name: string };
export type NavGroup = { name: string; leagues: NavLeague[] };
export type NavSection = { slug: string; name: string };

const SOCCER_GROUPS: { name: string; slugs: string[] }[] = [
    { name: "England", slugs: ["premier-league", "championship"] },
    { name: "Europe · UEFA competitions", slugs: ["uefa-champions-league", "uefa-europa-league", "uefa-conference-league"] },
    { name: "Spain", slugs: ["laliga"] },
    { name: "Italy", slugs: ["serie-a"] },
    { name: "Germany", slugs: ["bundesliga"] },
    { name: "France", slugs: ["ligue-1"] },
    { name: "North America", slugs: ["mls"] },
];

const REQUIRED_SOCCER_SECTIONS: NavSection[] = [
    { slug: "team-summary", name: "Team summary" },
    { slug: "team-stats", name: "Team stats" },
    { slug: "rankings", name: "Rankings" },
];

/** All sports share this interface. Soccer uses API competition registry plus country groups. */
export function getNavLeagueGroups(sportSlug: string): NavGroup[] {
    const sport = getSport(sportSlug);
    if (!sport) return [];

    const configured = sport.leagues.map((league) => ({ slug: league.slug, name: league.name }));
    if (sportSlug !== "soccer") return [{ name: "Leagues", leagues: configured }];

    const apiLeagues: NavLeague[] = SOCCER_LEAGUES.map((league) => ({ slug: league.key, name: league.label }));
    const all = new Map<string, NavLeague>();
    for (const league of configured) all.set(league.slug, league);
    // Prefer soccerService as the source of truth for competitions actually supported by the API.
    for (const league of apiLeagues) all.set(league.slug, league);

    const assigned = new Set<string>();
    const groups: NavGroup[] = SOCCER_GROUPS.map((group) => ({
        name: group.name,
        leagues: group.slugs.flatMap((slug) => {
            const league = all.get(slug);
            if (!league) return [];
            assigned.add(slug);
            return [league];
        }),
    })).filter((group) => group.leagues.length > 0);

    const additional = [...all.values()].filter((league) => !assigned.has(league.slug));
    if (additional.length) groups.push({ name: "Other competitions", leagues: additional });
    return groups;
}

/** New soccer competitions may not exist in config/sports.ts yet. They still get the shared tabs. */
export function getNavSections(sportSlug: string, leagueSlug: string): NavSection[] {
    const knownLeague = getLeague(sportSlug, leagueSlug);
    if (sportSlug !== "soccer") {
        if (!knownLeague) return [];
        return getSections(sportSlug, leagueSlug).map((section) => ({ slug: section.slug, name: section.name }));
    }

    if (!knownLeague && !getSoccerLeague(leagueSlug)) return [];
    const existing = knownLeague
        ? getSections(sportSlug, leagueSlug)
        : getLeague("soccer", "premier-league")
            ? getSections("soccer", "premier-league")
            : [];
    const sections = new Map<string, NavSection>();
    for (const section of existing) sections.set(section.slug, { slug: section.slug, name: section.name });
    for (const section of REQUIRED_SOCCER_SECTIONS) {
        if (!sections.has(section.slug)) sections.set(section.slug, section);
    }
    // Keep familiar primary tabs first; retain any additional configured tabs after them.
    const preferred = REQUIRED_SOCCER_SECTIONS.flatMap(({ slug }) => {
        const section = sections.get(slug);
        return section ? [section] : [];
    });
    return [...preferred, ...[...sections.values()].filter((section) => !REQUIRED_SOCCER_SECTIONS.some((item) => item.slug === section.slug))];
}

/** Preserve the active section when changing league; don't carry a team ID into another league. */
export function getNavTargetSection(sportSlug: string, leagueSlug: string, currentSection: string): string {
    const sections = getNavSections(sportSlug, leagueSlug);
    if (sections.some((section) => section.slug === currentSection)) return currentSection;
    return sections.find((section) => section.slug === "team-summary")?.slug ?? sections[0]?.slug ?? "team-summary";
}
