// @vitest-environment jsdom
import { Icon } from '@iconify/react';
import { act, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  click,
  installResizeObserver,
  keyDown,
  labelsOf,
  press,
  required,
  setRect,
  typeInto,
} from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { ColorInput, type IColorInput } from './ColorInput.js';

const trigger = (container: HTMLElement) =>
  required(container.querySelector<HTMLButtonElement>('button[aria-haspopup]'), 'the field');
const picker = () => document.querySelector<HTMLElement>('[role="dialog"]');
const thePicker = () => required(picker(), 'the picker');
const hexField = () =>
  required(thePicker().querySelector<HTMLInputElement>('input#hex'), 'the hex field');
const rgbField = () =>
  required(thePicker().querySelector<HTMLInputElement>('input#rgb'), 'the rgb field');
const swatch = (container: HTMLElement) =>
  required(trigger(container).querySelector<HTMLElement>('span[aria-hidden="true"]'), 'the swatch');
const boxOf = (container: HTMLElement) =>
  required(container.querySelector<HTMLElement>('.relative'), 'the box of the field');

const Controlled = ({
  initial,
  onChange,
  ...props
}: { initial?: string; onChange?: (value: string) => void } & Partial<IColorInput>) => {
  const [value, setValue] = useState(initial);

  return (
    <ColorInput
      label="Colour"
      placeholder="Pick a colour"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      {...props}
    />
  );
};

const open = (view: { container: HTMLElement }) => {
  click(trigger(view.container));
};

describe('ColorInput', () => {
  beforeEach(() => {
    installResizeObserver();
    window.innerHeight = 800;
  });

  afterEach(() => {
    unmountAll();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  describe('closed', () => {
    it('says the colour in capital letters, and shows it', () => {
      const view = mount(<Controlled initial="#ff8000" />);

      expect(trigger(view.container).textContent).toBe('#FF8000');
      expect(swatch(view.container).style.backgroundColor).toBe('rgb(255, 128, 0)');
    });

    it('says the placeholder in the quiet colour while there is no colour, with a black swatch', () => {
      const view = mount(<Controlled />);
      const text = required(
        trigger(view.container).querySelector('span:nth-of-type(2)'),
        'the text',
      );

      expect(trigger(view.container).textContent).toBe('Pick a colour');
      expect(text.className).toContain('text-primary/30');
      expect(swatch(view.container).style.backgroundColor).toBe('rgb(0, 0, 0)');
    });

    it('says the text in the normal colour when there is a colour', () => {
      const view = mount(<Controlled initial="#fff" />);
      const text = required(
        trigger(view.container).querySelector('span:nth-of-type(2)'),
        'the text',
      );

      expect(text.className).not.toContain('text-primary/30');
    });

    it('shows a value that is not a colour as it is, and a black swatch', () => {
      const view = mount(<Controlled initial="not-a-colour" />);

      expect(trigger(view.container).textContent).toBe('NOT-A-COLOUR');
      expect(swatch(view.container).style.backgroundColor).toBe('rgb(0, 0, 0)');
    });

    it('is a button that opens a dialog, closed for now', () => {
      const view = mount(<Controlled />);
      const field = trigger(view.container);

      expect(field.getAttribute('aria-haspopup')).toBe('dialog');
      expect(field.getAttribute('aria-expanded')).toBe('false');
      expect(field.hasAttribute('aria-controls')).toBe(false);
      expect(field.type).toBe('button');
      expect(picker()).toBeNull();
    });

    it('has a label that is its name', () => {
      const view = mount(<Controlled />);

      expect(
        labelsOf(trigger(view.container) as unknown as HTMLInputElement).at(0)?.textContent,
      ).toBe('Colour');
    });

    it('can take the id it is given', () => {
      const view = mount(<Controlled id="brand-colour" />);

      expect(trigger(view.container).id).toBe('brand-colour');
    });

    it('is invalid and described by its message while there is one', () => {
      const view = mount(<Controlled error="Choose a colour" />);
      const message = required(view.container.querySelector('[role="alert"]'), 'the message');

      expect(trigger(view.container).getAttribute('aria-invalid')).toBe('true');
      expect(trigger(view.container).getAttribute('aria-describedby')).toBe(message.id);
      expect(message.textContent).toBe('Choose a colour');
    });

    it('is valid without a message', () => {
      const view = mount(<Controlled />);

      expect(trigger(view.container).hasAttribute('aria-invalid')).toBe(false);
      expect(trigger(view.container).hasAttribute('aria-describedby')).toBe(false);
    });

    it('does not open when it is disabled, and says so', () => {
      const view = mount(<Controlled disabled />);

      click(trigger(view.container));

      expect(trigger(view.container).disabled).toBe(true);
      expect(trigger(view.container).className).toContain('cursor-no-drop');
      expect(picker()).toBeNull();
    });

    it('marks the field when it has a message, and not otherwise', () => {
      const withError = mount(<Controlled error="Choose a colour" />);
      const without = mount(<Controlled />);

      expect(withError.container.querySelector('[data-invalid]')).not.toBeNull();
      expect(without.container.querySelector('[data-invalid]')).toBeNull();
    });

    it('shows the icon of the picker while closed and the icon that closes it while open', () => {
      const view = mount(
        <>
          <Controlled />
          <Icon icon="pepicons-pop:color-picker" data-testid="closed" />
          <Icon icon="pepicons-pop:color-picker-off" data-testid="opened" />
        </>,
      );
      const markup = (name: string) =>
        required(view.container.querySelector(`[data-testid="${name}"]`), name).innerHTML;
      const own = () => {
        const icons = trigger(view.container).querySelectorAll('svg');

        return required(icons[icons.length - 1], 'the icon').innerHTML;
      };

      expect(own()).toBe(markup('closed'));

      open(view);

      expect(own()).toBe(markup('opened'));
      expect(own()).not.toBe(markup('closed'));
    });

    it('takes the classes it is given', () => {
      const view = mount(<Controlled className="field-class" containerClassName="box-class" />);

      expect(view.container.innerHTML).toContain('field-class');
      expect(required(view.container.firstElementChild, 'the box').className).toContain(
        'box-class',
      );
    });
  });

  describe('opening', () => {
    it('opens a dialog named by the label, with the focus in it', () => {
      const view = mount(<Controlled initial="#ff0000" />);

      open(view);

      expect(thePicker().getAttribute('aria-label')).toBe('Colour');
      expect(trigger(view.container).getAttribute('aria-expanded')).toBe('true');
      expect(trigger(view.container).getAttribute('aria-controls')).toBe(thePicker().id);
      expect(thePicker().contains(document.activeElement)).toBe(true);
    });

    it('is named "Colour picker" without a label, or by the words of the app', () => {
      const plain = mount(<Controlled label="" />);

      open(plain);
      expect(thePicker().getAttribute('aria-label')).toBe('Colour picker');
      unmountAll();
      document.body.replaceChildren();

      const named = mount(<Controlled label="" pickerLabel="Selector de color" />);

      open(named);
      expect(thePicker().getAttribute('aria-label')).toBe('Selector de color');
    });

    it('is drawn in the body, not where the field is', () => {
      const view = mount(<Controlled />);

      open(view);

      expect(thePicker().parentElement).toBe(document.body);
      expect(view.container.contains(thePicker())).toBe(false);
    });

    it('shows the colour in the fields of the picker, hex and rgb', () => {
      const view = mount(<Controlled initial="#ff8000" />);

      open(view);

      expect(hexField().value).toBe('#ff8000');
      expect(rgbField().value).toBe('255, 128, 0');
      expect(thePicker().querySelector('input#hsv')).toBeNull();
    });

    it('closes when the field is pressed again, and gives the focus back to it', () => {
      const view = mount(<Controlled />);

      open(view);
      click(trigger(view.container));

      expect(picker()).toBeNull();
      expect(trigger(view.container).getAttribute('aria-expanded')).toBe('false');
    });

    it('closes with Escape, and gives the focus back to the field', () => {
      const view = mount(<Controlled />);

      trigger(view.container).focus();
      open(view);
      keyDown(document, 'Escape');

      expect(picker()).toBeNull();
      expect(document.activeElement).toBe(trigger(view.container));
    });

    it('closes on a press outside, but not on one inside the picker', () => {
      const view = mount(<Controlled />);

      open(view);
      press(thePicker());
      press(hexField());
      expect(picker()).not.toBeNull();

      press(document.body);

      expect(picker()).toBeNull();
    });

    it('keeps the focus inside the picker with Tab', () => {
      const view = mount(<Controlled />);

      open(view);
      rgbField().focus();
      keyDown(document, 'Tab');
      const first = document.activeElement;

      expect(thePicker().contains(first)).toBe(true);
    });

    it('closes when the field is disabled while it is open, and stays closed when it is enabled again', () => {
      const render = (disabled: boolean) => (
        <ColorInput label="Colour" value="#fff" disabled={disabled} />
      );
      const view = mount(render(false));

      open(view);
      expect(picker()).not.toBeNull();

      view.rerender(render(true));
      expect(picker()).toBeNull();

      view.rerender(render(false));
      expect(picker()).toBeNull();
    });

    it('has the alpha slider unless it is told to hide it', () => {
      const shown = mount(<Controlled />);

      open(shown);
      expect(thePicker().querySelector('.rcp-alpha')).not.toBeNull();
      unmountAll();
      document.body.replaceChildren();

      const hidden = mount(<Controlled hideAlpha />);

      open(hidden);
      expect(thePicker().querySelector('.rcp-alpha')).toBeNull();
    });
  });

  describe('changing the colour', () => {
    it('tells the app the colour in hexadecimal, and shows it', () => {
      const onChange = vi.fn();
      const view = mount(<Controlled initial="#ff0000" onChange={onChange} />);

      open(view);
      typeInto(hexField(), '#00ff00');

      expect(onChange).toHaveBeenLastCalledWith('#00ff00');
      expect(trigger(view.container).textContent).toBe('#00FF00');
      expect(swatch(view.container).style.backgroundColor).toBe('rgb(0, 255, 0)');
    });

    it('takes a colour written in rgb', () => {
      const onChange = vi.fn();
      const view = mount(<Controlled initial="#ff0000" onChange={onChange} />);

      open(view);
      typeInto(rgbField(), '0, 0, 255');

      expect(onChange).toHaveBeenLastCalledWith('#0000ff');
    });

    it('does not tell the app about text that is no colour', () => {
      const onChange = vi.fn();
      const view = mount(<Controlled initial="#ff0000" onChange={onChange} />);

      open(view);
      typeInto(hexField(), '#GG0000');

      expect(onChange).not.toHaveBeenCalled();
      expect(trigger(view.container).textContent).toBe('#FF0000');
    });

    it('works without an onChange', () => {
      const view = mount(<ColorInput label="Colour" value="#ff0000" />);

      open(view);

      expect(() => {
        typeInto(hexField(), '#00ff00');
      }).not.toThrow();
    });

    it('does not tell the app anything while it is disabled', () => {
      const onChange = vi.fn();
      const view = mount(<ColorInput label="Colour" value="#ff0000" onChange={onChange} />);

      open(view);
      view.rerender(<ColorInput label="Colour" value="#ff0000" onChange={onChange} disabled />);

      expect(picker()).toBeNull();
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('when the app gives another colour', () => {
    it('shows it in the field and in the picker', () => {
      const view = mount(<ColorInput label="Colour" value="#ff0000" />);

      open(view);
      view.rerender(<ColorInput label="Colour" value="#0000ff" />);

      expect(trigger(view.container).textContent).toBe('#0000FF');
      expect(swatch(view.container).style.backgroundColor).toBe('rgb(0, 0, 255)');
      // the field with the focus is left alone while it is edited; the area of the picker has it
      expect(
        required(thePicker().querySelector<HTMLElement>('.rcp-saturation'), 'the area').style
          .backgroundColor,
      ).toBe('rgb(0, 0, 255)');
    });

    it('shows it in the fields of the picker once the field is left', () => {
      const view = mount(<ColorInput label="Colour" value="#ff0000" />);

      open(view);
      view.rerender(<ColorInput label="Colour" value="#0000ff" />);
      act(() => {
        hexField().blur();
      });

      expect(hexField().value).toBe('#0000ff');
      expect(rgbField().value).toBe('0, 0, 255');
    });

    it('shows the placeholder when the colour is taken away', () => {
      const view = mount(<ColorInput label="Colour" placeholder="None" value="#ff0000" />);

      view.rerender(<ColorInput label="Colour" placeholder="None" />);

      expect(trigger(view.container).textContent).toBe('None');
      expect(swatch(view.container).style.backgroundColor).toBe('rgb(0, 0, 0)');
    });

    it('keeps the colour of the picker when it is only the same colour in another case', () => {
      const view = mount(<ColorInput label="Colour" value="#aabbcc" />);

      open(view);
      typeInto(hexField(), '#aabbcc');
      view.rerender(<ColorInput label="Colour" value="#AABBCC" />);

      expect(hexField().value.toLowerCase()).toBe('#aabbcc');
    });

    it('does not take the colour the picker gave back as news (a grey would lose its hue)', () => {
      const seen: string[] = [];
      const view = mount(
        <Controlled
          initial="#808080"
          onChange={(value) => {
            seen.push(value);
          }}
        />,
      );

      open(view);
      typeInto(hexField(), '#7f7f7f');

      expect(seen).toEqual(['#7f7f7f']);
      expect(hexField().value).toBe('#7f7f7f');
    });
  });

  describe('where the picker is', () => {
    it('is under the field by default, when there is room on both sides', () => {
      const view = mount(<Controlled />);

      setRect(boxOf(view.container), { top: 400, bottom: 440, left: 30, width: 200 });
      open(view);

      expect(thePicker().style.top).toBe('448px');
      expect(thePicker().style.bottom).toBe('');
    });

    it('is under the field, as wide as it', () => {
      const view = mount(<Controlled />);

      setRect(boxOf(view.container), { top: 100, bottom: 140, left: 30, width: 200 });
      open(view);

      expect(thePicker().style.top).toBe('148px');
      expect(thePicker().style.left).toBe('30px');
      expect(thePicker().style.width).toBe('200px');
      expect(thePicker().className).toContain('fixed');
    });

    it('is over the field when it is asked to, and there is room', () => {
      const view = mount(<Controlled position="top" />);

      setRect(boxOf(view.container), { top: 500, bottom: 540, left: 10, width: 120 });
      open(view);

      expect(thePicker().style.bottom).toBe('308px');
    });

    it('is on the other side when there is no room on the one asked for', () => {
      const view = mount(<Controlled />);

      setRect(boxOf(view.container), { top: 600, bottom: 780, left: 10, width: 120 });
      open(view);

      expect(thePicker().style.bottom).toBe('208px');
    });

    it('follows the field while the page scrolls', () => {
      const view = mount(<Controlled />);

      setRect(boxOf(view.container), { top: 100, bottom: 140, left: 30, width: 200 });
      open(view);
      setRect(boxOf(view.container), { top: 60, bottom: 100, left: 30, width: 200 });
      act(() => {
        window.dispatchEvent(new Event('scroll'));
      });

      expect(thePicker().style.top).toBe('108px');
    });
  });

  it('is the same in StrictMode', () => {
    const onChange = vi.fn();
    const view = mount(<Controlled initial="#ff0000" onChange={onChange} />, { strict: true });

    open(view);
    typeInto(hexField(), '#00ff00');

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(trigger(view.container).textContent).toBe('#00FF00');
  });

  // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest.
  it('does not compile with a value that is not text, or a position that does not exist', () => {
    const check = () => {
      // @ts-expect-error the colour is text
      <ColorInput value={0xff0000} />;
      // @ts-expect-error onChange gets the colour as text
      <ColorInput onChange={(value: number) => value} />;
      // @ts-expect-error the picker opens on the top or the bottom
      <ColorInput position="left" />;
    };

    expect(check).toBeTypeOf('function');
  });
});
