"use client";

import { useCallback, useRef, type KeyboardEvent } from "react";

/**
 * Roving focus for the org chart's nodes: one Tab stop for the whole chart, then the arrow
 * keys (and Home/End) step through the nodes in reading order. Up/Left go back, Down/Right go
 * forward, so it behaves the same whether the tiers are stacked (phone) or wide (desktop).
 * Moving focus is enough: the chart selects whatever node has focus.
 */
export function useArrowNav<T extends string>(order: readonly T[]) {
  const refs = useRef(new Map<T, HTMLButtonElement>());

  const register = useCallback(
    (id: T) => (el: HTMLButtonElement | null) => {
      if (el) refs.current.set(id, el);
      else refs.current.delete(id);
    },
    [],
  );

  const onKeyDown = useCallback(
    (id: T) => (e: KeyboardEvent<HTMLButtonElement>) => {
      const i = order.indexOf(id);
      let next: number | null = null;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") next = Math.min(order.length - 1, i + 1);
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = Math.max(0, i - 1);
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = order.length - 1;
      if (next === null) return;
      e.preventDefault();
      refs.current.get(order[next])?.focus();
    },
    [order],
  );

  const focus = useCallback((id: T) => refs.current.get(id)?.focus(), []);

  return { register, onKeyDown, focus };
}
