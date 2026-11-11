import { Link, useLocation } from "@tanstack/react-router";
import { getNavSections } from "../../config/navigation";

/** Reads shared navigation config; no league-specific JSX is needed. */
export default function SectionNavbar() {
    const { pathname } = useLocation();
    const [, sportSlug = "", leagueSlug = "", sectionSlug = ""] = pathname.split("/");
    const sections = getNavSections(sportSlug, leagueSlug);
    if (!sections.length) return null;

    return (
        <nav aria-label="Statistics sections" className="bg-white">
            <div className="page flex gap-6 overflow-x-auto">
                {sections.map((section) => {
                    const isActive = sectionSlug === section.slug;
                    return (
                        <Link
                            key={section.slug}
                            to="/$sport/$league/$section"
                            params={{ sport: sportSlug, league: leagueSlug, section: section.slug }}
                            aria-current={isActive ? "page" : undefined}
                            className={`shrink-0 border-b-2 py-4 text-sm font-medium transition-colors ${isActive ? "border-accent text-ink!" : "border-transparent text-muted! hover:text-ink!"}`}
                        >
                            {section.name}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
