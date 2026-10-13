import { act, renderHook } from '@testing-library/react-native';

import { useDebouncedValue } from '@/hooks/use-debounced-value';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('only updates once typing pauses', async () => {
  const { result, rerender } = await renderHook(({ value }: { value: string }) => useDebouncedValue(value, 300), {
    initialProps: { value: '' },
  });

  await rerender({ value: 'm' });
  await rerender({ value: 'ma' });
  await act(() => jest.advanceTimersByTime(299));
  expect(result.current).toBe('');

  await rerender({ value: 'mar' });
  await act(() => jest.advanceTimersByTime(299));
  expect(result.current).toBe(''); // each keystroke restarts the wait

  await act(() => jest.advanceTimersByTime(1));
  expect(result.current).toBe('mar');
});
