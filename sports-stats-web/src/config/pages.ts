import { lazy, type ComponentType } from "react";

export type SectionPageProps = { league: string };
export type TeamPageProps = { league: string; teamId: string };

/** Section pages by sport and section slug. Each sport's code loads on demand. */
export const SECTION_PAGES: Record<string, Record<string, ComponentType<SectionPageProps>>> = {
  hockey: {
    "team-summary": lazy(() => import("../pages/hockey/NHLTeamSummary")),
    rankings: lazy(() => import("../pages/hockey/NHLTeamRankings")),
  },
  soccer: {
    "team-summary": lazy(() => import("../pages/soccer/SoccerTeamSummary")),
    "team-stats": lazy(() => import("../pages/soccer/SoccerTeamStatsIndex")),
    rankings: lazy(() => import("../pages/soccer/SoccerTeamRankings")),
  },
  basketball: {
    "team-summary": lazy(() => import("../pages/basketball/BasketballTeamSummary")),
    "team-stats": lazy(() => import("../pages/basketball/BasketballTeamStatsIndex")),
    rankings: lazy(() => import("../pages/basketball/BasketballTeamRankings")),
    "quarter-stats": lazy(() => import("../pages/basketball/BasketballQuarterStats")),
  },
  football: {
    "team-summary": lazy(() => import("../pages/american-football/FootballTeamSummary")),
    rankings: lazy(() => import("../pages/american-football/FootballTeamRankings")),
  },
};

/** Team detail page for each sport. */
export const TEAM_PAGES: Record<string, ComponentType<TeamPageProps>> = {
  hockey: lazy(() => import("../pages/hockey/NHLTeamDetail")),
  soccer: lazy(() => import("../pages/soccer/SoccerTeamStats")),
  basketball: lazy(() => import("../pages/basketball/BasketballTeamDetail")),
  football: lazy(() => import("../pages/american-football/FootballTeamDetail")),
};
