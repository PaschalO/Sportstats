import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "../../lib/cn";

/** Vertical rhythm shared by every statistics page. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-6 lg:gap-8", className)}>{children}</div>
  );
}

type PageHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Filters and toggles, right-aligned on desktop. */
  actions?: ReactNode;
  /** Badge or logo shown left of the title. */
  leading?: ReactNode;
  meta?: ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  leading,
  meta,
}: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        {leading}
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="mt-1 break-words">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-body text-muted">{description}</p>}
          {meta && <div className="mt-2 text-caption text-muted">{meta}</div>}
        </div>
      </div>
      {actions && (
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">{actions}</div>
      )}
    </header>
  );
}

const CARD_TONES = {
  default: "border-line bg-white",
  accent: "border-accent-soft bg-accent-tint",
  soft: "border-line-soft bg-surface-soft",
  dark: "border-ink bg-ink text-white",
} as const;

type CardProps = {
  children: ReactNode;
  as?: "section" | "article" | "div" | "aside";
  tone?: keyof typeof CARD_TONES;
  padded?: boolean;
  className?: string;
  label?: string;
};

export function Card({
  children,
  as: Tag = "section",
  tone = "default",
  padded = true,
  className,
  label,
}: CardProps) {
  return (
    <Tag
      aria-label={label}
      className={cn(
        "min-w-0 rounded-xl border",
        CARD_TONES[tone],
        padded && "p-4 sm:p-5",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

type SectionHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** h2 for page sections, h3 for titles inside cards. */
  level?: 2 | 3;
  className?: string;
};

export function SectionHeader({
  title,
  description,
  actions,
  level = 2,
  className,
}: SectionHeaderProps) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-4 gap-y-2", className)}>
      <div className="min-w-0">
        <Heading>{title}</Heading>
        {description && <p className="mt-1 text-caption text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** A titled page section: header above, content below. */
export function Section({
  children,
  className,
  ...header
}: SectionHeaderProps & { children: ReactNode }) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-3", className)}>
      <SectionHeader {...header} />
      {children}
    </section>
  );
}

export function Footnote({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("text-2xs text-muted", className)}>{children}</div>;
}

type Crumb = { label: string; section?: string };

/** Sport / League / Section / Current. Crumbs with a section link to that page. */
export function Breadcrumbs({
  sport,
  league,
  items,
}: {
  sport: string;
  league: string;
  items: Crumb[];
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-1.5 text-caption text-muted"
    >
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
          {index > 0 && <span aria-hidden="true">/</span>}
          {item.section ? (
            <Link
              to="/$sport/$league/$section"
              params={{ sport, league, section: item.section }}
              className="hover:text-accent-strong"
            >
              {item.label}
            </Link>
          ) : (
            <span className={index === items.length - 1 ? "font-medium text-ink" : undefined}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
