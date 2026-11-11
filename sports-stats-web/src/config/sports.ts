export type NavItem = { slug: string; name: string };
export type Sport = NavItem & { leagues: NavItem[]; sections: string[] };

export const SECTIONS: NavItem[] = [
  { slug: "team-summary", name: "Team summary" },
  { slug: "team-stats", name: "Team stats" },
  { slug: "rankings", name: "Rankings" },
  { slug: "period-stats", name: "Period stats" },
  { slug: "quarter-stats", name: "Quarter stats" },
  { slug: "players", name: "Players" },
];

const DEFAULT_SECTIONS = ["team-summary", "team-stats", "rankings", "players"];

export const SPORTS: Sport[] = [
  {
    name: "Football",
    slug: "football",
    leagues: [
      { name: "NFL", slug: "nfl" },
      { name: "NCAAF", slug: "ncaaf" },
    ],
    sections: DEFAULT_SECTIONS,
  },
  {
    name: "Basketball",
    slug: "basketball",
    leagues: [
      { name: "NBA", slug: "nba" },
      { name: "NCAAB", slug: "ncaab" },
      { name: "NBL", slug: "nbl" },
      { name: "WNBA", slug: "wnba" },
    ],
    sections: ["team-summary", "team-stats", "rankings", "quarter-stats", "players"],
  },
  {
    name: "Hockey",
    slug: "hockey",
    leagues: [{ name: "NHL", slug: "nhl" }],
    sections: ["team-summary", "rankings", "period-stats", "players"],
  },
  {
    name: "Baseball",
    slug: "baseball",
    leagues: [{ name: "MLB", slug: "mlb" }],
    sections: DEFAULT_SECTIONS,
  },
  {
    name: "Soccer",
    slug: "soccer",
    // Soccer competitions come from SOCCER_LEAGUES in soccerService (see navigation.ts).
    leagues: [],
    sections: DEFAULT_SECTIONS,
  },
];

export const getSport = (slug: string) => SPORTS.find((sport) => sport.slug === slug);
