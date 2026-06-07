import * as React from 'react';

/**
 * Returns a debounced copy of `value` that only updates after `delay` ms of
 * no changes. Useful for search inputs so expensive filtering/re-renders run
 * after the user pauses typing rather than on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
