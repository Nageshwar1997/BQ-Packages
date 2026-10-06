import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type IOutsideClickOptions, useOutsideClick } from './useOutsideClick.js';

type TCallback = (event: MouseEvent | TouchEvent | PointerEvent) => void;

interface IHarnessProps {
  callback: TCallback;
  options?: IOutsideClickOptions;
}

const Harness = ({ callback, options }: IHarnessProps) => {
  const ref = useOutsideClick<HTMLDivElement>(callback, options);

  return (
    <div>
      <div ref={ref} data-testid="inside">
        <button data-testid="inside-child">inside</button>
      </div>
      <button data-testid="outside">outside</button>
    </div>
  );
};

const press = (element: Element) => {
  fireEvent.pointerDown(element);
};

describe('useOutsideClick', () => {
  // Testing Library only auto-cleans when `afterEach` is a global (vitest globals are off here).
  afterEach(() => {
    cleanup();
  });

  it('calls the callback when the press happens outside the element', () => {
    const callback = vi.fn();
    const { getByTestId } = render(<Harness callback={callback} />);

    press(getByTestId('outside'));

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('passes the original event to the callback', () => {
    const callback = vi.fn<TCallback>();
    const { getByTestId } = render(<Harness callback={callback} />);
    const outside = getByTestId('outside');

    press(outside);

    expect(callback.mock.calls[0]?.[0].target).toBe(outside);
    expect(callback.mock.calls[0]?.[0].type).toBe('pointerdown');
  });

  it('ignores presses on the element itself and on its children', () => {
    const callback = vi.fn();
    const { getByTestId } = render(<Harness callback={callback} />);

    press(getByTestId('inside'));
    press(getByTestId('inside-child'));

    expect(callback).not.toHaveBeenCalled();
  });

  it('does nothing while the ref is not attached to an element', () => {
    const callback = vi.fn();
    const NoRef = () => {
      useOutsideClick<HTMLDivElement>(callback);
      return <button data-testid="somewhere">somewhere</button>;
    };
    const { getByTestId } = render(<NoRef />);

    press(getByTestId('somewhere'));

    expect(callback).not.toHaveBeenCalled();
  });

  it('is enabled by default when no options are passed', () => {
    const callback = vi.fn();
    const { getByTestId } = render(<Harness callback={callback} />);

    press(getByTestId('outside'));

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('is enabled when the options object leaves `enabled` out', () => {
    const callback = vi.fn();
    const { getByTestId } = render(<Harness callback={callback} options={{}} />);

    press(getByTestId('outside'));

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not listen while `enabled` is false, and starts when it turns true', () => {
    const callback = vi.fn();
    const { getByTestId, rerender } = render(
      <Harness callback={callback} options={{ enabled: false }} />,
    );

    press(getByTestId('outside'));
    expect(callback).not.toHaveBeenCalled();

    rerender(<Harness callback={callback} options={{ enabled: true }} />);
    press(getByTestId('outside'));
    expect(callback).toHaveBeenCalledTimes(1);

    rerender(<Harness callback={callback} options={{ enabled: false }} />);
    press(getByTestId('outside'));
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('stops listening after unmount', () => {
    const callback = vi.fn();
    const { getByTestId, unmount } = render(<Harness callback={callback} />);
    const outside = getByTestId('outside');

    unmount();
    press(document.body);
    press(outside);

    expect(callback).not.toHaveBeenCalled();
  });

  it('still sees the press when an inner handler stops propagation (capture phase)', () => {
    const callback = vi.fn();
    const { getByTestId } = render(<Harness callback={callback} />);
    const outside = getByTestId('outside');
    outside.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
    });

    press(outside);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('calls the latest callback after it changes', () => {
    const oldCallback = vi.fn();
    const newCallback = vi.fn();
    const { getByTestId, rerender } = render(<Harness callback={oldCallback} />);

    rerender(<Harness callback={newCallback} />);
    press(getByTestId('outside'));

    expect(oldCallback).not.toHaveBeenCalled();
    expect(newCallback).toHaveBeenCalledTimes(1);
  });
});
