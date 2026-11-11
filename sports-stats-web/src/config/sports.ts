export const sports = [
    {
        name: "Football",
        slug: "football",
        leagues: [
            { name: "NFL", slug: "nfl" },
            { name: "NCAAF", slug: "ncaaf" },
        ],
    },
    {
        name: "Basketball",
        slug: "basketball",
        leagues: [
            { name: "NBA", slug: "nba" },
            { name: "NCAAB", slug: "ncaab" },
            { name: "NBL", slug: "nbl" },
            {name: "WNBA", slug: "wnba"},
        ],
    },
    {
        name: "Hockey",
        slug: "hockey",
        leagues: [
            { name: "NHL", slug: "nhl" },
        ],
    },
    {
        name: "Baseball",
        slug: "baseball",
        leagues: [
            { name: "MLB", slug: "mlb" },
        ],
    },
    {
        name: "Soccer",
        slug: "soccer",
        leagues: [
            { name: "Premier League", slug: "premier-league" },
            { name: "LaLiga", slug: "laliga" },
            { name: "Serie A", slug: "serie-a" },
            { name: "Bundesliga", slug: "bundesliga" },
            { name: "Ligue 1", slug: "ligue-1" },
            { name: 'UEFA Champions League', slug: "uefa-champions-league"},
            { name: "UEFA Europa League", slug: "uefa-europa-league"},
            //{ name: "MLS", slug: "mls" },
            { name: "Championship", slug: "championship" },
        ],
    },
];

export const sections = [
    { name: "Team summary", slug: "team-summary" },
    { name: "Team stats", slug: "team-stats" },
    { name: "Rankings", slug: "rankings" },
    { name: "Period stats", slug: "period-stats" },
    { name: "Players", slug: "players" },
];

export function getSport(slug: string) {
    return sports.find((sport) => sport.slug === slug);
}

export function getLeague(sportSlug: string, leagueSlug: string) {
    return getSport(sportSlug)?.leagues.find(
        (league) => league.slug === leagueSlug
    );
}

export function getSections(sportSlug: string, leagueSlug) {
    if (sportSlug === "hockey") {
        return sections.filter((section) =>
            ["team-summary", "rankings", "period-stats", "players"]
                .includes(section.slug)
        );
    }

    if (sportSlug === "soccer") {
        return sections.filter((section) =>
            ["team-summary", "team-stats", "rankings", "players"]
                .includes(section.slug)
        );
    }

    return sections.filter((section) => section.slug !== "period-stats");
}