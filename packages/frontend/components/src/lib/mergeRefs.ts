import type { Ref } from 'react';

const assign = <T>(ref: Ref<T> | undefined, node: T | null) => {
  if (typeof ref === 'function') return ref(node);

  if (ref) ref.current = node;

  return undefined;
};

/**
 * One ref callback that gives the element to all the refs it is given (a ref of the app, the ref that
 * `register()` of React Hook Form makes, a ref of the component itself). When the element goes away
 * every ref gets `null` again, or, for a ref callback that returns a cleanup function, that cleanup is
 * called. Keep the result stable (`useMemo`): a new function at every render makes React take the
 * element away from the refs and give it again.
 */
export const mergeRefs =
  <T>(...refs: (Ref<T> | undefined)[]) =>
  (node: T | null) => {
    const cleanups = refs.map((ref) => assign(ref, node));

    return () => {
      refs.forEach((ref, index) => {
        const cleanup = cleanups[index];

        if (typeof cleanup === 'function') cleanup();
        else assign(ref, null);
      });
    };
  };
