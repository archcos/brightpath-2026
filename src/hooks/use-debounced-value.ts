import { useEffect, useState } from 'react';

/** `value`, updated only after it stops changing for `delay` ms (e.g. search-as-you-type without a request per key). */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
