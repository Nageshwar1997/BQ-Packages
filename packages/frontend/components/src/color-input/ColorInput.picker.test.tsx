// @vitest-environment jsdom
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { act } from 'react';
import type { ColorPicker as TColorPicker, IColor } from 'react-color-palette';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { click, installResizeObserver, required } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { ColorInput } from './ColorInput.js';

type TPickerProps = ComponentProps<typeof TColorPicker>;

// The picker of the library is replaced by one that shows nothing and keeps what it was given: its
// sliders need a mouse, and what matters here is what the field gives it and does with what it says.
const picker = vi.hoisted(() => ({ latest: undefined as undefined | Record<string, unknown> }));

vi.mock('react-color-palette', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-color-palette')>();

  return {
    ...actual,
    ColorPicker: (props: Record<string, unknown>) => {
      picker.latest = props;

      return null;
    },
  };
});

const latest = () => {
  if (!picker.latest) throw new Error('the picker was not drawn');

  return picker.latest as unknown as TPickerProps;
};

// A grey that has a hue: the hex of it cannot say so, only the hsv can
const GREY: IColor = {
  hex: '#808080',
  rgb: { r: 128, g: 128, b: 128, a: 1 },
  hsv: { h: 200, s: 0, v: 50, a: 1 },
};

const trigger = (container: HTMLElement) =>
  required(container.querySelector<HTMLButtonElement>('button[aria-haspopup]'), 'the field');

const Controlled = ({
  onChange,
  initial = '#ff0000',
}: {
  onChange?: (value: string) => void;
  initial?: string;
}) => {
  const [value, setValue] = useState(initial);

  return (
    <ColorInput
      label="Colour"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
};

describe('ColorInput with the picker of the library replaced', () => {
  beforeEach(() => {
    installResizeObserver();
    picker.latest = undefined;
  });

  afterEach(() => {
    unmountAll();
    document.body.replaceChildren();
  });

  it('gives the picker the colour of the value, and what to hide', () => {
    const view = mount(<ColorInput label="Colour" value="#ff8000" hideAlpha />);

    click(trigger(view.container));

    expect(latest().color.hex).toBe('#ff8000');
    expect(latest().hideAlpha).toBe(true);
    expect(latest().hideInput).toEqual(['hsv']);
  });

  it('keeps the colour the picker made, with its hue, when the app gives its hex back', () => {
    const onChange = vi.fn();
    const view = mount(<Controlled onChange={onChange} />);

    click(trigger(view.container));
    act(() => {
      latest().onChange(GREY);
    });

    expect(onChange).toHaveBeenCalledWith('#808080');
    // not made again from the hex, which would turn the hue of 200 into 0
    expect(latest().color.hsv.h).toBe(200);
  });

  it('keeps it also when the app writes the hex in another case', () => {
    const view = mount(<ColorInput label="Colour" value="#ff0000" />);

    click(trigger(view.container));
    act(() => {
      latest().onChange(GREY);
    });
    view.rerender(<ColorInput label="Colour" value="#808080" />);
    view.rerender(<ColorInput label="Colour" value="#808080" />);

    expect(latest().color.hsv.h).toBe(200);
  });

  it('makes a new colour when the app gives another one', () => {
    const view = mount(<ColorInput label="Colour" value="#ff0000" />);

    click(trigger(view.container));
    act(() => {
      latest().onChange(GREY);
    });
    view.rerender(<ColorInput label="Colour" value="#0000ff" />);

    expect(latest().color.hex).toBe('#0000ff');
  });

  it('keeps the colour it was given until the app says another, when the app does not take it back', () => {
    const view = mount(<ColorInput label="Colour" value="#ff0000" />);

    click(trigger(view.container));
    act(() => {
      latest().onChange(GREY);
    });

    // the app did not change `value`, but the picker goes on from where the person took it
    expect(latest().color.hsv.h).toBe(200);
  });

  it('does not take a colour that is no colour', () => {
    const onChange = vi.fn();
    const view = mount(<ColorInput label="Colour" value="#ff0000" onChange={onChange} />);

    click(trigger(view.container));
    act(() => {
      latest().onChange({ ...GREY, hex: '#GG0000' });
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(latest().color.hex).toBe('#ff0000');
  });

  it('gives the focus to the picker box when there is nothing in it to focus', () => {
    const view = mount(<ColorInput label="Colour" value="#ff0000" />);

    click(trigger(view.container));

    const box = required(document.querySelector('[role="dialog"]'), 'the picker box');

    expect(document.activeElement).toBe(box);
    expect((box as HTMLElement).tabIndex).toBe(-1);
  });
});
