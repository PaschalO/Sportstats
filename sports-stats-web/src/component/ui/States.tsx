import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { cn } from "../../lib/cn";

export function LoadingState({ label = "Loading statistics…" }: { label?: string }) {
  return (
    <div
      role="status"
      className="rounded-xl border border-line-soft bg-surface-soft px-4 py-12 text-center text-caption text-muted"
    >
      {label}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  title = "Could not load statistics",
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <section role="alert" className="rounded-xl border border-line bg-white p-5">
      <h2 className="text-h3">{title}</h2>
      <p className="mt-1 break-words text-caption text-muted">
        {error instanceof Error ? error.message : String(error)}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg bg-ink px-3 py-1.5 text-caption font-semibold text-white"
        >
          Retry
        </button>
      )}
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="rounded-xl border border-line bg-white px-4 py-8 text-center text-caption text-muted"
    >
      {children}
    </p>
  );
}

export function Notice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "warning";
}) {
  return (
    <p
      className={cn(
        "rounded-xl border p-4 text-caption",
        tone === "warning"
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-line bg-surface-soft text-ink-soft",
      )}
    >
      {children}
    </p>
  );
}

type QueryStateProps<T> = {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
  loadingLabel?: string;
  errorTitle?: string;
};

/** Loading, error and data states for one TanStack Query result. */
export function QueryState<T>({ query, children, loadingLabel, errorTitle }: QueryStateProps<T>) {
  if (query.isError) {
    return (
      <ErrorState error={query.error} title={errorTitle} onRetry={() => void query.refetch()} />
    );
  }
  if (query.data === undefined) {
    // A disabled query (e.g. missing season ID) is pending but idle: render nothing.
    return query.fetchStatus === "idle" ? null : <LoadingState label={loadingLabel} />;
  }
  return (
    <>
      {query.isPlaceholderData && (
        <p role="status" className="-mb-3 text-xs text-muted lg:-mb-5">
          Updating…
        </p>
      )}
      {children(query.data)}
    </>
  );
}
