'use client';

import { useState, useEffect } from 'react';

/** Default delay (ms) for search inputs — long enough to type comfortably before a request fires. */
export const SEARCH_DEBOUNCE_MS = 450;

/**
 * Returns a value that updates only after `delay` ms have passed since the last change.
 * Useful for search inputs to avoid filtering on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
