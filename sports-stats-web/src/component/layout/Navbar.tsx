import { Link, useParams } from "@tanstack/react-router";
import { cn } from "../../lib/cn";
import { getSections, sportLanding } from "../../config/navigation";
import { SPORTS } from "../../config/sports";

function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2 py-3 text-ink">
      <svg width={28} height={28} viewBox="0 0 30 30" aria-hidden="true">
        <rect width="30" height="30" rx="8" fill="#0B1220" />
        <g
          transform="translate(7 7) scale(0.6667)"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinecap="round"
        >
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </g>
      </svg>
      <span className="font-display text-lg font-bold tracking-tight">SportsStats</span>
    </Link>
  );
}

function SectionLinks({ className }: { className?: string }) {
  const { sport = "", league = "", section } = useParams({ strict: false });
  const sections = getSections(sport);
  if (!league || !sections.length) return null;
  return (
    <nav
      aria-label="Statistics sections"
      className={cn("scrollbar-none flex gap-5 overflow-x-auto", className)}
    >
      {sections.map((item) => {
        const active = item.slug === section;
        return (
          <Link
            key={item.slug}
            to="/$sport/$league/$section"
            params={{ sport, league, section: item.slug }}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 py-3 text-caption font-medium transition-colors",
              active ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}

/** Logo, sport tabs and (on wide screens) section tabs in one row, as in the mockup. */
export default function Navbar() {
  const { sport: activeSport, section } = useParams({ strict: false });

  return (
    <header className="border-b border-line bg-white">
      <div className="page flex items-center gap-4 lg:gap-8">
        <Logo />
        <nav
          aria-label="Sports"
          className="scrollbar-none flex min-w-0 flex-1 gap-1 overflow-x-auto py-2"
        >
          {SPORTS.map((sport) => {
            const active = sport.slug === activeSport;
            const landing = sportLanding(sport.slug, section);
            const className = cn(
              "shrink-0 rounded-md px-3 py-1.5 text-caption font-medium transition-colors",
              active ? "bg-ink text-white" : "text-muted hover:bg-surface hover:text-ink",
            );
            return landing ? (
              <Link
                key={sport.slug}
                to="/$sport/$league/$section"
                params={landing}
                aria-current={active ? "page" : undefined}
                className={className}
              >
                {sport.name}
              </Link>
            ) : (
              <Link
                key={sport.slug}
                to="/$sport"
                params={{ sport: sport.slug }}
                className={className}
              >
                {sport.name}
              </Link>
            );
          })}
        </nav>
        <SectionLinks className="hidden self-stretch xl:flex" />
      </div>
      <div className="page border-t border-line-soft xl:hidden">
        <SectionLinks />
      </div>
    </header>
  );
}
