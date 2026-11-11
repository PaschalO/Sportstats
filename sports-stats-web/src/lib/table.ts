import {
  columnVisibilityFeature,
  createSortedRowModel,
  metaHelper,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";

export type StatsColumnMeta = {
  align?: "left" | "center" | "right";
  /** Applied to both header and body cells. */
  className?: string;
  /**
   * Hide the column until the table itself is wide enough. Based on the table's width
   * (container query), not the screen, so columns only appear when they fit.
   */
  showFrom?: "md" | "lg" | "xl";
  /** Pin the column to the left edge while the table scrolls horizontally. */
  sticky?: boolean;
};

/** TanStack Table v9: register only the features the stats tables use. */
export const statsFeatures = tableFeatures({
  columnVisibilityFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
  columnMeta: metaHelper<StatsColumnMeta>(),
});

export type StatsColumn<T extends RowData> = ColumnDef<typeof statsFeatures, T>;
