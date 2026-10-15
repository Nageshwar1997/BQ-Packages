// @vitest-environment jsdom
import { createRef, type Ref, useMemo } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mount, unmountAll } from '../test-utils/react.js';
import { mergeRefs } from './mergeRefs.js';

type TInputRef = Ref<HTMLInputElement> | undefined;

const Field = ({ a, b, c }: { a?: TInputRef; b?: TInputRef; c?: TInputRef }) => {
  const merged = useMemo(() => mergeRefs<HTMLInputElement>(a, b, c), [a, b, c]);

  return <input ref={merged} />;
};

describe('mergeRefs', () => {
  afterEach(unmountAll);

  it('gives the element to a ref object, a ref callback and skips what is not there', () => {
    const object = createRef<HTMLInputElement>();
    const callback = vi.fn();
    const view = mount(<Field a={object} b={undefined} c={callback} />);
    const input = view.container.querySelector('input');

    expect(object.current).toBe(input);
    expect(callback).toHaveBeenCalledWith(input);
  });

  it('takes the element from every ref when it goes away', () => {
    const object = createRef<HTMLInputElement>();
    const callback = vi.fn();
    const view = mount(<Field a={object} b={callback} />);

    view.unmount();

    expect(object.current).toBeNull();
    expect(callback).toHaveBeenLastCalledWith(null);
  });

  it('calls the cleanup of a ref callback that has one, instead of giving it null', () => {
    const cleanup = vi.fn();
    const callback = vi.fn(() => cleanup);
    const view = mount(<Field a={callback} />);

    view.unmount();

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1); // not called again with null
  });

  it('is the same in StrictMode: every ref ends with the element', () => {
    const object = createRef<HTMLInputElement>();
    const view = mount(<Field a={object} />, { strict: true });

    expect(object.current).toBe(view.container.querySelector('input'));
  });
});
