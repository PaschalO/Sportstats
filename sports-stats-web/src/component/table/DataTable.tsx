import { useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { useTable, type RowData, type SortingState, type Updater } from "@tanstack/react-table";
import { cn } from "../../lib/cn";
import { statsFeatures, type StatsColumn, type StatsColumnMeta } from "../../lib/table";
import { SearchField, SelectField, TextButton, type SelectOption } from "../ui";

type DataTableProps<T extends RowData> = {
  data: T[];
  columns: StatsColumn<T>[];
  getRowId: (row: T) => string;
  /** Uncontrolled starting sort. Pass sorting + onSortingChange to control it. */
  initialSorting?: SortingState;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  /** Prepend a "#" column numbered in the current sort order. */
  rank?: boolean;
  /** Rows shown before "Show all"; omit to show every row. */
  pageSize?: number;
  /** Rows added per "Show more" click; defaults to everything. */
  pageStep?: number;
  noun?: string;
  /** Extra text in the footer, e.g. "sorted by win %". */
  summary?: ReactNode;
  onRowClick?: (row: T) => void;
  /** Phones get cards instead of the table when provided. */
  renderCard?: (row: T, index: number) => ReactNode;
  /** Sort choices offered above the phone cards. */
  mobileSort?: SelectOption<string>[];
  /** Tailwind min-width class so wide tables scroll instead of squashing. */
  minWidth?: string;
  label?: string;
  /** Set false for small reference tables. */
  sortable?: boolean;
  /** Adds a search box that filters rows by this text (e.g. the team name). */
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  /** Extra controls on the search row, e.g. a legend. */
  toolbar?: ReactNode;
};

const ALIGN: Record<NonNullable<StatsColumnMeta["align"]>, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

/** Container-query breakpoints measured on the table wrapper, not the viewport. */
const SHOW_FROM: Record<NonNullable<StatsColumnMeta["showFrom"]>, string> = {
  md: "hidden @min-[56rem]:table-cell",
  lg: "hidden @min-[68rem]:table-cell",
  xl: "hidden @min-[78rem]:table-cell",
};

function cellClass(meta: StatsColumnMeta | undefined) {
  return cn(
    ALIGN[meta?.align ?? "center"],
    meta?.showFrom && SHOW_FROM[meta.showFrom],
    meta?.className,
    meta?.sticky && "sticky left-0 z-10",
  );
}

/** Shared TanStack Table: sortable headers, responsive columns, phone cards, show more. */
export function DataTable<T extends RowData>({
  data,
  columns,
  getRowId,
  initialSorting = [],
  sorting: controlledSorting,
  onSortingChange,
  rank = false,
  pageSize,
  pageStep,
  noun = "rows",
  summary,
  onRowClick,
  renderCard,
  mobileSort,
  minWidth = "min-w-[640px]",
  label,
  sortable = true,
  searchText,
  searchPlaceholder = "Search teams…",
  toolbar,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term && searchText
      ? data.filter((row) => searchText(row).toLowerCase().includes(term))
      : data;
  }, [data, search, searchText]);
  const [localSorting, setLocalSorting] = useState<SortingState>(initialSorting);
  const sorting = controlledSorting ?? localSorting;
  const setSorting = (updater: Updater<SortingState>) => {
    const next = typeof updater === "function" ? updater(sorting) : updater;
    if (onSortingChange) onSortingChange(next);
    else setLocalSorting(next);
  };

  const [visible, setVisible] = useState(pageSize ?? Number.POSITIVE_INFINITY);

  const table = useTable({
    features: statsFeatures,
    data: filtered,
    columns,
    getRowId,
    enableSorting: sortable,
    state: { sorting },
    onSortingChange: setSorting,
  });

  const rows = table.getRowModel().rows;
  const shown = rows.slice(0, visible);
  const canExpand = pageSize != null && rows.length > pageSize;
  const allShown = shown.length >= rows.length;
  const noMatches = Boolean(searchText && search.trim() && !rows.length);

  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>, row: T) => {
    // Links and buttons inside the row keep their own behaviour.
    if ((event.target as HTMLElement).closest("a, button")) return;
    onRowClick?.(row);
  };

  const footer =
    canExpand || summary ? (
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span>
          Showing {shown.length} of {rows.length} {noun}
          {summary && <> · {summary}</>}
        </span>
        {canExpand && (
          <TextButton
            onClick={() =>
              setVisible(
                allShown ? pageSize : pageStep ? visible + pageStep : Number.POSITIVE_INFINITY,
              )
            }
          >
            {allShown ? "Show fewer" : pageStep ? "Load more" : `Show all ${rows.length} ${noun}`}
          </TextButton>
        )}
      </div>
    ) : null;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {(searchText || toolbar) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {searchText && (
            <SearchField
              label={searchPlaceholder.replace("…", "")}
              placeholder={searchPlaceholder}
              value={search}
              onChange={setSearch}
              className="sm:w-64"
            />
          )}
          {toolbar}
        </div>
      )}
      {noMatches && (
        <p role="status" className="text-caption text-muted">
          No matches for “{search.trim()}”.
        </p>
      )}
      {renderCard && (
        <div className="grid gap-3 md:hidden">
          {mobileSort && (
            <SelectField
              label="Sort"
              className="justify-between rounded-lg border border-line bg-white px-3 py-2"
              value={sorting[0] ? `${sorting[0].id}:${sorting[0].desc ? "desc" : "asc"}` : ""}
              options={mobileSort}
              onChange={(value) => {
                const [id, direction] = value.split(":");
                setSorting([{ id, desc: direction === "desc" }]);
              }}
            />
          )}
          {shown.map((row, index) => (
            <div key={row.id}>{renderCard(row.original, index)}</div>
          ))}
        </div>
      )}

      {!noMatches && (
        <div
          className={cn(
            "@container min-w-0 overflow-hidden rounded-xl border border-line bg-white",
            renderCard && "hidden md:block",
          )}
        >
          <div className="overflow-x-auto">
            <table
              className={cn(
                "w-full border-separate border-spacing-0 text-caption tabular-nums",
                minWidth,
              )}
            >
              {label && <caption className="sr-only">{label}</caption>}
              <thead className="bg-surface-soft">
                {table.getHeaderGroups().map((group) => (
                  <tr key={group.id}>
                    {rank && (
                      <th
                        scope="col"
                        className="label-caps w-10 border-b border-line px-3 py-3 text-left"
                      >
                        #
                      </th>
                    )}
                    {group.headers.map((header) => {
                      const meta = header.column.columnDef.meta;
                      const sorted = header.column.getIsSorted();
                      return (
                        <th
                          key={header.id}
                          scope="col"
                          aria-sort={
                            sorted === "asc"
                              ? "ascending"
                              : sorted === "desc"
                                ? "descending"
                                : undefined
                          }
                          className={cn(
                            "label-caps whitespace-nowrap border-b border-line bg-surface-soft px-3 py-3",
                            cellClass(meta),
                          )}
                        >
                          {header.isPlaceholder ? null : header.column.getCanSort() ? (
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              className="inline-flex items-center gap-1 uppercase hover:text-ink"
                            >
                              <table.FlexRender header={header} />
                              <span aria-hidden="true" className="w-2">
                                {sorted === "asc" ? "↑" : sorted === "desc" ? "↓" : ""}
                              </span>
                            </button>
                          ) : (
                            <table.FlexRender header={header} />
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {shown.map((row, index) => (
                  <tr
                    key={row.id}
                    onClick={
                      onRowClick ? (event) => handleRowClick(event, row.original) : undefined
                    }
                    className={cn("group", onRowClick && "cursor-pointer")}
                  >
                    {rank && (
                      <td className="border-t border-line-soft px-3 py-2.5 text-left text-muted group-first:border-t-0 group-hover:bg-row-hover">
                        {index + 1}
                      </td>
                    )}
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta;
                      return (
                        <td
                          key={cell.id}
                          className={cn(
                            "whitespace-nowrap border-t border-line-soft px-3 py-2.5 text-ink-soft group-first:border-t-0 group-hover:bg-row-hover",
                            meta?.sticky && "bg-white",
                            cellClass(meta),
                          )}
                        >
                          <table.FlexRender cell={cell} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {footer && (
            <div
              className={cn("border-t border-line-soft px-4 py-3", renderCard && "hidden md:block")}
            >
              {footer}
            </div>
          )}
        </div>
      )}

      {footer && renderCard && <div className="md:hidden">{footer}</div>}
    </div>
  );
}
