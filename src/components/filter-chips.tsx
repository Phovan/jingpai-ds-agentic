import { useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function FilterChips({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string; count: number }[];
  onChange: (value: string) => void;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({
    overflow: false,
    start: true,
    end: true,
  });
  function measure() {
    const el = rail.current;
    if (el)
      setEdges({
        overflow: el.scrollWidth > el.clientWidth + 2,
        start: el.scrollLeft < 2,
        end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
      });
  }
  const optionKey = options.map((o) => o.value + ":" + o.count).join("|");
  useLayoutEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (rail.current) observer.observe(rail.current);
    return () => observer.disconnect();
  }, [optionKey]);
  function scroll(direction: number) {
    rail.current?.scrollBy({
      left: direction * 220,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }
  return (
    <div className="filter-chip-control">
      {edges.overflow && (
        <button
          className="filter-scroll"
          aria-label="向左查看更多分类"
          disabled={edges.start}
          onClick={() => scroll(-1)}
        >
          <ChevronLeft size={14} />
        </button>
      )}
      <div
        className="filter-chip-rail"
        ref={rail}
        role="group"
        aria-label={label}
        onScroll={measure}
      >
        {options.map((o) => (
          <button
            key={o.value}
            className="filter-chip"
            aria-pressed={value === o.value}
            title={o.label}
            onClick={(event) => {
              onChange(o.value);
              event.currentTarget.scrollIntoView({
                block: "nearest",
                inline: "nearest",
              });
            }}
          >
            <span className="filter-chip-label">{o.label}</span>
            <span className="filter-chip-count">{o.count}</span>
          </button>
        ))}
      </div>
      {edges.overflow && (
        <button
          className="filter-scroll"
          aria-label="向右查看更多分类"
          disabled={edges.end}
          onClick={() => scroll(1)}
        >
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}
