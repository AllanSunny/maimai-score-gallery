import { useOutsideDismissal } from "../../hooks/useOutsideDismissal";
import { classNames } from "../../utils/class-names";
import { ChevronIcon } from "./ChevronIcon";

export interface DropdownSelectorOption<T extends string | null> {
  value: T;
  label: string;
}

interface DropdownSelectorBaseProps<T extends string | null> {
  align?: "left" | "right";
  label: string;
  options: ReadonlyArray<DropdownSelectorOption<T>>;
  triggerClassName?: string;
}

interface SingleDropdownSelectorProps<T extends string | null> extends DropdownSelectorBaseProps<T> {
  allowMultiple?: false;
  value: T;
  onChange: (value: T) => void;
}

interface MultipleDropdownSelectorProps<T extends string | null> extends DropdownSelectorBaseProps<T> {
  allowMultiple: true;
  values: T[];
  onChange: (values: T[]) => void;
}

type DropdownSelectorProps<T extends string | null> =
  | SingleDropdownSelectorProps<T>
  | MultipleDropdownSelectorProps<T>;

export function DropdownSelector<T extends string | null>(props: DropdownSelectorProps<T>) {
  const { align = "left", label, options, triggerClassName } = props;
  const allowMultiple = props.allowMultiple === true;
  const selected = allowMultiple ? props.values : [props.value];
  const detailsRef = useOutsideDismissal<HTMLDetailsElement>((details) => {
    if (details.open) details.open = false;
  });
  const selectedLabel = options.find((option) => option.value === selected[0])?.label ?? label;

  function select(value: T) {
    if (props.allowMultiple) {
      props.onChange(props.values.includes(value)
        ? props.values.filter((candidate) => candidate !== value)
        : [...props.values, value]);
      return;
    }

    props.onChange(value);
    if (detailsRef.current) detailsRef.current.open = false;
  }

  return (
    <details ref={detailsRef} className="relative">
      <summary className={classNames(
        "inline-flex cursor-pointer list-none items-center gap-2 rounded-lg border border-line bg-white/95 px-3 py-1.5 text-sm text-dark marker:hidden",
        triggerClassName,
      )}>
        {allowMultiple
          ? <span className="inline-flex items-center gap-1 whitespace-nowrap">
              {label}
              <span className="inline-block min-w-5">{selected.length > 0 ? `(${selected.length})` : null}</span>
            </span>
          : <span className="min-w-0 flex-1 truncate">{selectedLabel}</span>}
        <ChevronIcon direction="down" className="-mr-1 shrink-0" />
      </summary>
      <div className={classNames(
        "absolute z-40 max-h-72 w-max min-w-full overflow-y-auto overscroll-none rounded-xl border border-t-0 border-line bg-white/95 p-2 shadow-lg",
        align === "right" ? "right-0" : "left-0",
      )}>
        {options.map((option) => allowMultiple
          ? <label key={option.value ?? "null"} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-dark hover:bg-primary/50">
              <input type="checkbox" checked={selected.includes(option.value)} onChange={() => select(option.value)} />
              <span className="whitespace-nowrap">{option.label}</span>
            </label>
          : <button
              key={option.value ?? "null"}
              type="button"
              aria-pressed={selected.includes(option.value)}
              className={classNames(
                "block w-full cursor-pointer whitespace-nowrap rounded-lg px-2 py-1.5 text-left text-sm text-dark hover:bg-primary/50",
                { when: selected.includes(option.value), then: "bg-primary/35" },
              )}
              onClick={() => select(option.value)}
            >
              {option.label}
            </button>)}
      </div>
    </details>
  );
}
