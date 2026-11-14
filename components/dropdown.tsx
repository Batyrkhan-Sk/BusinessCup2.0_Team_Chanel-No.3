"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type DropdownOption = { value: string; label: string };

/** Base UI cannot select an empty-string value, so "" maps to this sentinel internally. */
const NONE = "__none__";
const toInternal = (v: string) => (v === "" ? NONE : v);
const fromInternal = (v: string) => (v === NONE ? "" : v);

export function Dropdown({
  id,
  value,
  onValueChange,
  options,
  className,
  invalid,
  disabled,
  "aria-describedby": describedBy,
}: {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  options: DropdownOption[];
  className?: string;
  invalid?: boolean;
  disabled?: boolean;
  "aria-describedby"?: string;
}) {
  const items = options.map((o) => ({ value: toInternal(o.value), label: o.label }));
  return (
    <SelectPrimitive.Root
      items={items}
      value={toInternal(value)}
      onValueChange={(v) => onValueChange(fromInternal(String(v ?? "")))}
      disabled={disabled}
      modal={false}
    >
      <SelectPrimitive.Trigger
        type="button"
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(
          "group flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-[var(--dc-r-md)] border border-border bg-surface px-4 text-left text-base text-ink outline-none transition-colors",
          "hover:border-ink-3 focus-visible:border-brand focus-visible:shadow-[var(--dc-focus)] data-popup-open:border-brand data-popup-open:shadow-[var(--dc-focus)]",
          "aria-invalid:border-danger disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        <SelectPrimitive.Value className="line-clamp-1 flex-1" />
        <SelectPrimitive.Icon
          render={
            <ChevronDownIcon
              aria-hidden="true"
              className="size-5 shrink-0 text-ink-3 transition-transform duration-150 group-data-popup-open:rotate-180"
            />
          }
        />
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner side="bottom" sideOffset={6} align="start" alignItemWithTrigger={false} className="isolate z-50">
          <SelectPrimitive.Popup
            className={cn(
              "max-h-[min(320px,var(--available-height))] w-(--anchor-width) min-w-44 origin-(--transform-origin) overflow-y-auto rounded-[var(--dc-r-md)] border border-border bg-surface p-1.5 text-ink shadow-[var(--dc-sh-lg)] outline-none",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 duration-100",
            )}
          >
            <SelectPrimitive.List>
              {items.map((o) => (
                <SelectPrimitive.Item
                  key={o.value}
                  value={o.value}
                  className={cn(
                    "relative flex min-h-11 w-full cursor-pointer items-center rounded-[var(--dc-r-sm)] py-2 pr-9 pl-3 text-base outline-none select-none",
                    "data-highlighted:bg-surface-2 data-selected:font-semibold data-selected:text-brand",
                  )}
                >
                  <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="absolute right-3 flex items-center text-brand">
                    <CheckIcon aria-hidden="true" className="size-4" strokeWidth={2.5} />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
