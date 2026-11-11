import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { LOCATION_LABELS, LOCATIONS, type Location } from "../../lib/types";

export type Option<T> = { value: T; label: ReactNode };
export type SelectOption<T> = { value: T; label: string };

type SegmentedProps<T extends string | number> = {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md";
  className?: string;
};

/** Pill toggle group: "All games | Home | Away". */
export function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
  label,
  size = "md",
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "scrollbar-none inline-flex max-w-full shrink-0 overflow-x-auto rounded-lg bg-surface p-1",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-md font-medium transition-colors",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-caption",
              active ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

const LOCATION_OPTIONS = LOCATIONS.map((value) => ({ value, label: LOCATION_LABELS[value] }));

export function LocationSwitch({
  value,
  onChange,
  size,
}: {
  value: Location;
  onChange: (value: Location) => void;
  size?: "sm" | "md";
}) {
  return (
    <SegmentedControl
      label="Game location"
      value={value}
      options={LOCATION_OPTIONS}
      onChange={onChange}
      size={size}
    />
  );
}

type SelectFieldProps<T extends string | number> = {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  /** inline: label beside the select; stacked: label above it. */
  layout?: "inline" | "stacked";
  className?: string;
};

export function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  layout = "inline",
  className,
}: SelectFieldProps<T>) {
  return (
    <label
      className={cn(
        "flex min-w-0 text-caption text-muted",
        layout === "inline" ? "items-center gap-2" : "flex-col gap-1",
        className,
      )}
    >
      <span className="shrink-0">{label}</span>
      <select
        value={String(value)}
        onChange={(event) => {
          const next = options.find((option) => String(option.value) === event.target.value);
          if (next) onChange(next.value);
        }}
        className="min-w-0 rounded-lg border border-line-strong bg-white px-3 py-1.5 text-caption font-semibold text-ink"
      >
        {options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Rounded chips that pick one metric: "Possession · Shots · On target". */
export function ChipTabs<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-caption font-medium transition-colors",
              active
                ? "border-ink bg-ink text-white"
                : "border-line bg-white text-ink-soft hover:border-accent",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  return (
    <input
      type="search"
      aria-label={label}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-caption text-ink outline-none focus:border-accent",
        className,
      )}
    />
  );
}

/** "− Over 6.5 +" control for chart thresholds. */
export function LineStepper({
  value,
  onChange,
  step = 1,
  min = 0.5,
  label = "Line",
}: {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  label?: string;
}) {
  const change = (direction: 1 | -1) =>
    onChange(Math.max(min, Number((value + direction * step).toFixed(2))));
  return (
    <div className="flex items-center gap-2 text-caption text-muted">
      <span>{label}</span>
      <div
        role="group"
        aria-label={label}
        className="inline-flex overflow-hidden rounded-lg border border-line-strong bg-white"
      >
        <button
          type="button"
          onClick={() => change(-1)}
          disabled={value - step < min}
          aria-label="Decrease line"
          className="px-2.5 py-1.5 hover:bg-surface disabled:opacity-40"
        >
          −
        </button>
        <span className="border-x border-line-strong px-3 py-1.5 font-semibold tabular-nums text-ink">
          Over {value.toFixed(1)}
        </span>
        <button
          type="button"
          onClick={() => change(1)}
          aria-label="Increase line"
          className="px-2.5 py-1.5 hover:bg-surface"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function TextButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-accent-soft bg-white px-3 py-1.5 text-caption font-semibold text-accent-strong hover:bg-accent-tint"
    >
      {children}
    </button>
  );
}
