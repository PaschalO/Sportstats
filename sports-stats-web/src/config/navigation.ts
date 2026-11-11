import { SOCCER_LEAGUES } from "../services/soccerService";
import { getSport, SECTIONS, type NavItem } from "./sports";

/** Display order for soccer competitions. */
const SOCCER_ORDER = [
  "premier-league",
  "laliga",
  "serie-a",
  "bundesliga",
  "ligue-1",
  "mls",
  "championship",
  "uefa-champions-league",
  "uefa-europa-league",
  "uefa-conference-league",
];

export const DEFAULT_SECTION = "team-summary";

/** Leagues for a sport; soccer reads the competition registry the API supports. */
export function getLeagues(sportSlug: string): NavItem[] {
  if (sportSlug !== "soccer") return getSport(sportSlug)?.leagues ?? [];
  const rank = (key: string) => SOCCER_ORDER.indexOf(key) + 1 || SOCCER_ORDER.length + 1;
  return [...SOCCER_LEAGUES]
    .sort((a, b) => rank(a.key) - rank(b.key))
    .map((league) => ({ slug: league.key, name: league.label }));
}

export const findLeague = (sportSlug: string, leagueSlug: string) =>
  getLeagues(sportSlug).find((league) => league.slug === leagueSlug);

export function getSections(sportSlug: string): NavItem[] {
  const allowed = getSport(sportSlug)?.sections ?? [];
  return SECTIONS.filter((section) => allowed.includes(section.slug));
}

/** Keep the current section when switching league or sport, if that section exists there. */
export function targetSection(sportSlug: string, currentSection?: string): string {
  const sections = getSections(sportSlug);
  if (currentSection && sections.some((section) => section.slug === currentSection))
    return currentSection;
  return (
    sections.find((section) => section.slug === DEFAULT_SECTION)?.slug ??
    sections[0]?.slug ??
    DEFAULT_SECTION
  );
}

/** Route params for a sport's landing page: first league, default section. */
export function sportLanding(sportSlug: string, currentSection?: string) {
  const league = getLeagues(sportSlug)[0]?.slug;
  return league
    ? { sport: sportSlug, league, section: targetSection(sportSlug, currentSection) }
    : null;
}
