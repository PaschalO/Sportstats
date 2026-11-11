import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LoadingState, Page, PageHeader } from "../component/ui";
import { findLeague, getSections } from "../config/navigation";
import { SECTION_PAGES } from "../config/pages";

export const Route = createFileRoute("/$sport/$league/$section")({
  component: SectionRoute,
});

function SectionRoute() {
  const { sport, league, section } = Route.useParams();
  const SectionPage = SECTION_PAGES[sport]?.[section];

  if (!SectionPage) {
    const name =
      getSections(sport).find((item) => item.slug === section)?.name ??
      section.replaceAll("-", " ");
    return (
      <Page>
        <PageHeader
          eyebrow={findLeague(sport, league)?.name ?? league}
          title={name}
          description="This statistics page is ready for its FastAPI data and components."
        />
      </Page>
    );
  }

  return (
    <Suspense fallback={<LoadingState />}>
      <SectionPage key={league} league={league} />
    </Suspense>
  );
}
