/**
 * Creates a debounced version of a function that delays execution
 * until after the specified delay has elapsed since the last call.
 *
 * @param {Function} fn - The function to debounce
 * @param {number} delay - Delay in milliseconds (default: 300)
 * @returns {Function} Debounced function with a cancel() method
 *
 * @example
 * const debouncedSave = debounce((value) => save(value), 500);
 * input.addEventListener('input', (e) => debouncedSave(e.target.value));
 *
 * // To cancel pending execution:
 * debouncedSave.cancel();
 */
export function debounce(fn, delay = 300) {
  let timeout;

  const debounced = (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };

  debounced.cancel = () => {
    clearTimeout(timeout);
  };

  return debounced;
}
