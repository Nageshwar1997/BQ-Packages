// @vitest-environment jsdom
import { act, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  click,
  focus,
  keyDown,
  labelsOf,
  press,
  pressKey,
  required,
  setRect,
} from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { type ISelect, type ISelectOption, Select } from './Select.js';

const OPTIONS: ISelectOption[] = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana', disabled: true },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Date', value: 'date' },
];

const trigger = (container: HTMLElement) =>
  required(container.querySelector<HTMLButtonElement>('button[role="combobox"]'), 'the field');
const listbox = () => document.querySelector('[role="listbox"]');
const optionsOf = () => [...document.querySelectorAll<HTMLElement>('[role="option"]')];
const activeOf = (container: HTMLElement) => {
  const id = trigger(container).getAttribute('aria-activedescendant');

  return id ? (optionsOf().find((option) => option.id === id)?.textContent ?? null) : null;
};

const Controlled = ({
  initial = '',
  onChange,
  ...props
}: {
  initial?: string | number;
  onChange?: (value: string | number) => void;
} & Partial<ISelect>) => {
  const [value, setValue] = useState<string | number>(initial);

  return (
    <Select
      label="Fruit"
      options={OPTIONS}
      selectProps={{
        value,
        placeholder: 'Pick one',
        onChange: (next) => {
          setValue(next);
          onChange?.(next);
        },
      }}
      {...props}
    />
  );
};

describe('Select', () => {
  beforeEach(() => {
    window.innerHeight = 800;
  });

  afterEach(() => {
    unmountAll();
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  describe('closed', () => {
    it('says what is chosen, or what to do while nothing is', () => {
      const none = mount(<Controlled />);
      const some = mount(<Controlled initial="cherry" />);

      expect(trigger(none.container).textContent).toBe('Pick one');
      expect(trigger(some.container).textContent).toBe('Cherry');
    });

    it('shows an option whose value is "" in the quiet colour: it is the same as no choice', () => {
      const view = mount(
        <Select
          options={[{ label: 'None', value: '' }, ...OPTIONS]}
          selectProps={{ value: '', onChange: vi.fn(), placeholder: 'Pick one' }}
        />,
      );

      expect(trigger(view.container).textContent).toBe('None');
      expect(trigger(view.container).querySelector('span')?.className).toContain('text-primary/30');
    });

    it('shows a not-allowed cursor when it is disabled', () => {
      const view = mount(
        <Select options={OPTIONS} selectProps={{ value: '', onChange: vi.fn(), disabled: true }} />,
      );

      expect(trigger(view.container).className).toContain('cursor-no-drop');
    });

    it('shows the placeholder in the quiet colour, and what is chosen in the text colour', () => {
      const none = mount(<Controlled />);
      const some = mount(<Controlled initial="cherry" />);

      expect(trigger(none.container).querySelector('span')?.className).toContain('text-primary/30');
      expect(trigger(some.container).querySelector('span')?.className).not.toContain(
        'text-primary/30',
      );
    });

    it('is a combobox that opens a list, closed for now', () => {
      const view = mount(<Controlled />);
      const field = trigger(view.container);

      expect(field.getAttribute('aria-haspopup')).toBe('listbox');
      expect(field.getAttribute('aria-expanded')).toBe('false');
      expect(field.hasAttribute('aria-controls')).toBe(false);
      expect(field.type).toBe('button'); // it does not submit a form
      expect(listbox()).toBeNull();
    });

    it('has a label that is its name, and is pressed with it', () => {
      const view = mount(<Controlled />);
      const field = trigger(view.container);

      expect(labelsOf(field as unknown as HTMLInputElement).at(0)?.textContent).toBe('Fruit');
    });

    it('can take the id it is given', () => {
      const view = mount(
        <Select
          options={OPTIONS}
          selectProps={{ value: '', onChange: vi.fn(), id: 'fruit-field' }}
        />,
      );

      expect(trigger(view.container).id).toBe('fruit-field');
    });

    it('shows the label of a value that is a number', () => {
      const view = mount(
        <Select
          options={[
            { label: 'One', value: 1 },
            { label: 'Two', value: 2 },
          ]}
          selectProps={{ value: 2, onChange: vi.fn() }}
        />,
      );

      expect(trigger(view.container).textContent).toBe('Two');
    });
  });

  describe('opened by the mouse', () => {
    it('shows the options in a listbox that is in the body, so no parent can cut it', () => {
      const view = mount(<Controlled />);

      click(trigger(view.container));

      expect(listbox()).not.toBeNull();
      expect(view.container.contains(listbox())).toBe(false);
      expect(document.body.contains(listbox())).toBe(true);
      expect(optionsOf().map((option) => option.textContent)).toEqual([
        'Apple',
        'Banana',
        'Cherry',
        'Date',
      ]);
    });

    it('tells assistive technology it is open, and which list it opened', () => {
      const view = mount(<Controlled />);

      click(trigger(view.container));
      const field = trigger(view.container);

      expect(field.getAttribute('aria-expanded')).toBe('true');
      expect(field.getAttribute('aria-controls')).toBe(listbox()?.id);
      expect(listbox()?.getAttribute('aria-label')).toBe('Fruit');
    });

    it('marks the chosen option, and the disabled ones', () => {
      const view = mount(<Controlled initial="cherry" />);

      click(trigger(view.container));

      expect(optionsOf().map((option) => option.getAttribute('aria-selected'))).toEqual([
        'false',
        'false',
        'true',
        'false',
      ]);
      expect(optionsOf()[1]?.getAttribute('aria-disabled')).toBe('true');
      expect(optionsOf()[0]?.hasAttribute('aria-disabled')).toBe(false);
    });

    it('starts at the chosen option, and at none when nothing is chosen', () => {
      const chosen = mount(<Controlled initial="date" />);
      click(trigger(chosen.container));
      expect(activeOf(chosen.container)).toBe('Date');

      const none = mount(<Controlled />);
      click(trigger(none.container));
      expect(activeOf(none.container)).toBeNull();
    });

    it('is closed by pressing the field again', () => {
      const view = mount(<Controlled />);

      click(trigger(view.container));
      click(trigger(view.container));

      expect(listbox()).toBeNull();
      expect(trigger(view.container).getAttribute('aria-expanded')).toBe('false');
    });

    it('is closed by a press outside, and not by a press in the list', () => {
      const view = mount(<Controlled />);
      click(trigger(view.container));

      press(required(optionsOf()[0], 'an option'));
      expect(listbox()).not.toBeNull();

      press(document.body);
      expect(listbox()).toBeNull();
    });

    it('does not open for a field that is disabled, nor for no options', () => {
      const disabled = mount(
        <Select options={OPTIONS} selectProps={{ value: '', onChange: vi.fn(), disabled: true }} />,
      );
      const empty = mount(<Select options={[]} selectProps={{ value: '', onChange: vi.fn() }} />);

      click(trigger(disabled.container));
      click(trigger(empty.container));

      expect(trigger(disabled.container).disabled).toBe(true);
      expect(listbox()).toBeNull();
    });
  });

  describe('choosing', () => {
    it('gives the value of the option that was pressed, and closes', () => {
      const onChange = vi.fn();
      const view = mount(<Controlled onChange={onChange} />);
      click(trigger(view.container));

      click(required(optionsOf()[2], 'Cherry'));

      expect(onChange).toHaveBeenCalledWith('cherry');
      expect(trigger(view.container).textContent).toBe('Cherry');
      expect(listbox()).toBeNull();
    });

    it('does not choose an option that is disabled, and stays open', () => {
      const onChange = vi.fn();
      const view = mount(<Controlled onChange={onChange} />);
      click(trigger(view.container));

      click(required(optionsOf()[1], 'Banana'));

      expect(onChange).not.toHaveBeenCalled();
      expect(listbox()).not.toBeNull();
    });

    it('takes the choice away when the chosen option is pressed again, unless it is not clearable', () => {
      const onChange = vi.fn();
      const clearable = mount(<Controlled initial="cherry" onChange={onChange} />);
      click(trigger(clearable.container));
      click(required(optionsOf()[2], 'Cherry'));
      expect(onChange).toHaveBeenLastCalledWith('');

      onChange.mockReset();
      const fixed = mount(<Controlled initial="cherry" onChange={onChange} clearable={false} />);
      click(trigger(fixed.container));
      click(required(optionsOf()[2], 'Cherry'));
      expect(onChange).toHaveBeenLastCalledWith('cherry');
    });

    it('gives numbers as numbers', () => {
      const onChange = vi.fn();
      const view = mount(
        <Select
          options={[
            { label: 'One', value: 1 },
            { label: 'Two', value: 2 },
          ]}
          selectProps={{ value: '', onChange }}
        />,
      );
      click(trigger(view.container));

      click(required(optionsOf()[1], 'Two'));

      expect(onChange).toHaveBeenCalledWith(2);
    });

    it('keeps the focus on the field', () => {
      const view = mount(<Controlled />);
      focus(trigger(view.container));
      click(trigger(view.container));

      click(required(optionsOf()[0], 'Apple'));

      expect(document.activeElement).toBe(trigger(view.container));
    });

    it('closes the list when the field is disabled while it is open, and chooses nothing', () => {
      const onChange = vi.fn();
      const view = mount(<Select options={OPTIONS} selectProps={{ value: '', onChange }} />);
      click(trigger(view.container));
      expect(listbox()).not.toBeNull();

      view.rerender(
        <Select options={OPTIONS} selectProps={{ value: '', onChange, disabled: true }} />,
      );

      expect(listbox()).toBeNull();
      expect(trigger(view.container).getAttribute('aria-expanded')).toBe('false');
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('with the keyboard', () => {
    it('opens with the arrow down, at the first option that can be chosen', () => {
      const view = mount(<Controlled />);
      focus(trigger(view.container));

      const event = keyDown(trigger(view.container), 'ArrowDown');

      expect(listbox()).not.toBeNull();
      expect(activeOf(view.container)).toBe('Apple');
      expect(event.defaultPrevented).toBe(true); // the page does not scroll
    });

    it('opens with the arrow up at the last option, and at the chosen one when there is one', () => {
      const none = mount(<Controlled />);
      keyDown(trigger(none.container), 'ArrowUp');
      expect(activeOf(none.container)).toBe('Date');
      unmountAll();

      const chosen = mount(<Controlled initial="cherry" />);
      keyDown(trigger(chosen.container), 'ArrowDown');
      expect(activeOf(chosen.container)).toBe('Cherry');
    });

    it('moves with the arrows over the options that can be chosen, and stops at the ends', () => {
      const view = mount(<Controlled />);
      const field = trigger(view.container);

      keyDown(field, 'ArrowDown'); // opens at Apple
      keyDown(field, 'ArrowDown');
      expect(activeOf(view.container)).toBe('Cherry'); // Banana is skipped
      keyDown(field, 'ArrowDown');
      keyDown(field, 'ArrowDown');
      expect(activeOf(view.container)).toBe('Date'); // the end
      keyDown(field, 'ArrowUp');
      expect(activeOf(view.container)).toBe('Cherry');
    });

    it('goes to the first and the last with Home and End', () => {
      const view = mount(<Controlled />);
      const field = trigger(view.container);

      keyDown(field, 'End');
      expect(activeOf(view.container)).toBe('Date');
      keyDown(field, 'Home');
      expect(activeOf(view.container)).toBe('Apple');
    });

    it('chooses the active option with Enter and with Space, and closes', () => {
      const onChange = vi.fn();
      const view = mount(<Controlled onChange={onChange} />);
      const field = trigger(view.container);

      keyDown(field, 'ArrowDown');
      keyDown(field, 'ArrowDown');
      keyDown(field, 'Enter');
      expect(onChange).toHaveBeenLastCalledWith('cherry');
      expect(listbox()).toBeNull();

      keyDown(field, ' '); // opens (the chosen one is the active one)
      expect(activeOf(view.container)).toBe('Cherry');
      keyDown(field, 'ArrowDown');
      keyDown(field, ' ');
      expect(onChange).toHaveBeenLastCalledWith('date');
    });

    it('opens with Enter and Space when it is closed', () => {
      const view = mount(<Controlled />);

      keyDown(trigger(view.container), 'Enter');
      expect(listbox()).not.toBeNull();
    });

    it('is closed with Escape, and nothing is chosen', () => {
      const onChange = vi.fn();
      const view = mount(<Controlled onChange={onChange} />);
      keyDown(trigger(view.container), 'ArrowDown');

      pressKey('Escape');

      expect(listbox()).toBeNull();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('is closed with Tab, and nothing is chosen', () => {
      const onChange = vi.fn();
      const view = mount(<Controlled onChange={onChange} />);
      keyDown(trigger(view.container), 'ArrowDown');

      const event = keyDown(trigger(view.container), 'Tab');

      expect(listbox()).toBeNull();
      expect(onChange).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false); // the focus still moves on
    });

    it('goes to the option that starts with the letter that is typed, and opens the list', () => {
      vi.useFakeTimers();
      const view = mount(<Controlled />);
      const field = trigger(view.container);

      keyDown(field, 'd'); // opens at Date
      expect(listbox()).not.toBeNull();
      expect(activeOf(view.container)).toBe('Date');

      act(() => {
        vi.advanceTimersByTime(800); // a pause: the next letter is a new word
      });
      keyDown(field, 'c');
      expect(activeOf(view.container)).toBe('Cherry');
    });

    it('looks for the letters typed one after the other as one word: "dc" is no option', () => {
      const view = mount(<Controlled />);
      const field = trigger(view.container);

      keyDown(field, 'd');
      keyDown(field, 'c');

      expect(activeOf(view.container)).toBe('Date'); // it stays
    });

    it('finds an option by several letters, and starts the word again after a pause', () => {
      vi.useFakeTimers();
      const view = mount(
        <Controlled
          options={[
            { label: 'Cherry', value: 'cherry' },
            { label: 'Chestnut', value: 'chestnut' },
            { label: 'Date', value: 'date' },
          ]}
        />,
      );
      const field = trigger(view.container);

      keyDown(field, 'c'); // opens at Cherry
      keyDown(field, 'h');
      keyDown(field, 'e');
      keyDown(field, 's');
      expect(activeOf(view.container)).toBe('Chestnut');

      act(() => {
        vi.advanceTimersByTime(800);
      });
      keyDown(field, 'd');
      expect(activeOf(view.container)).toBe('Date'); // not "chesd"
    });

    it('does not go to an option that cannot be chosen', () => {
      const view = mount(<Controlled />);

      keyDown(trigger(view.container), 'b');

      expect(listbox()).toBeNull(); // no option that can be chosen starts with b: nothing opens
    });

    it('goes to an option by the text it is searched with when its label is not text', () => {
      const view = mount(
        <Controlled
          options={[
            { label: <b>Alpha</b>, value: 'x1', searchLabel: 'Alpha' },
            { label: <b>Beta</b>, value: 'x2', searchLabel: 'Beta' },
          ]}
        />,
      );

      keyDown(trigger(view.container), 'b');

      expect(activeOf(view.container)).toBe('Beta');
    });

    it('keeps the page from scrolling or doing what the key does, for the letters it takes', () => {
      const view = mount(<Controlled />);

      const event = keyDown(trigger(view.container), 'c');

      expect(event.defaultPrevented).toBe(true);
    });

    it('goes on from the active option: a letter that matches it stays there', () => {
      const view = mount(
        <Controlled
          options={[
            { label: 'Cherry', value: 'cherry' },
            { label: 'Chestnut', value: 'chestnut' },
            { label: 'Date', value: 'date' },
          ]}
        />,
      );
      const field = trigger(view.container);

      keyDown(field, 'ArrowDown');
      keyDown(field, 'ArrowDown'); // Chestnut

      keyDown(field, 'c');

      expect(activeOf(view.container)).toBe('Chestnut'); // not back to Cherry
    });

    it('has no timer left when it is removed in the middle of a word', () => {
      vi.useFakeTimers();
      const view = mount(<Controlled />);

      keyDown(trigger(view.container), 'c');
      view.unmount();

      expect(vi.getTimerCount()).toBe(0);
    });

    it('leaves the keys with ctrl, alt or meta alone (a shortcut of the browser)', () => {
      const view = mount(<Controlled />);

      const event = keyDown(trigger(view.container), 'a', { ctrlKey: true });
      keyDown(trigger(view.container), 'ArrowDown', { altKey: true });

      expect(event.defaultPrevented).toBe(false);
      expect(listbox()).toBeNull();
    });

    it('does nothing while it is disabled', () => {
      const view = mount(
        <Select options={OPTIONS} selectProps={{ value: '', onChange: vi.fn(), disabled: true }} />,
      );

      keyDown(trigger(view.container), 'ArrowDown');

      expect(listbox()).toBeNull();
    });

    it('keeps the active option in view while the arrows move it', () => {
      const view = mount(<Controlled />);

      keyDown(trigger(view.container), 'ArrowDown');
      const list = required(listbox() as HTMLElement | null, 'the list');

      Object.defineProperty(list, 'clientHeight', { configurable: true, value: 64 });
      optionsOf().forEach((option, index) => {
        Object.defineProperty(option, 'offsetTop', { configurable: true, value: index * 32 });
        Object.defineProperty(option, 'offsetHeight', { configurable: true, value: 32 });
      });
      keyDown(trigger(view.container), 'ArrowDown');
      keyDown(trigger(view.container), 'ArrowDown');

      // the active option is the fourth, at 96: its bottom (128) is the bottom of the list (64 tall)
      expect(activeOf(view.container)).toBe('Date');
      expect(list.scrollTop).toBe(64);
    });
  });

  describe('with the mouse over the options', () => {
    it('makes the one under the pointer the active one, unless it is disabled', () => {
      const view = mount(<Controlled />);
      click(trigger(view.container));

      act(() => {
        required(optionsOf()[2], 'Cherry').dispatchEvent(
          new MouseEvent('mousemove', { bubbles: true }),
        );
      });
      expect(activeOf(view.container)).toBe('Cherry');

      act(() => {
        required(optionsOf()[1], 'Banana').dispatchEvent(
          new MouseEvent('mousemove', { bubbles: true }),
        );
      });
      expect(activeOf(view.container)).toBe('Cherry');
    });
  });

  describe('where the list is', () => {
    const boxOf = (container: HTMLElement) =>
      required(trigger(container).closest('.relative'), 'the box of the field');
    const listFrame = () =>
      required<HTMLElement>(listbox()?.parentElement, 'the frame of the list');

    it('is under the field, as wide as it', () => {
      const view = mount(<Controlled />);
      setRect(boxOf(view.container), { top: 100, bottom: 140, left: 30, width: 200 });

      click(trigger(view.container));

      expect(listFrame().style.top).toBe('148px');
      expect(listFrame().style.left).toBe('30px');
      expect(listFrame().style.width).toBe('200px');
    });

    it('is over the field when it is told so, with its bottom edge above the field', () => {
      const view = mount(<Controlled position="top" />);
      setRect(boxOf(view.container), { top: 400, bottom: 440, left: 10, width: 120 });

      click(trigger(view.container));

      expect(listFrame().style.bottom).toBe('408px'); // 800 - 400 + 8
      expect(listFrame().style.top).toBe('');
    });

    it('opens over the field when there is no room under it', () => {
      const view = mount(<Controlled />);
      setRect(boxOf(view.container), { top: 740, bottom: 780, left: 10, width: 120 });

      click(trigger(view.container));

      expect(listFrame().style.bottom).toBe('68px');
    });

    it('follows the field when the page scrolls or the window is resized', () => {
      const view = mount(<Controlled />);
      setRect(boxOf(view.container), { top: 100, bottom: 140, left: 30, width: 200 });
      click(trigger(view.container));

      setRect(boxOf(view.container), { top: 60, bottom: 100, left: 30, width: 200 });
      act(() => {
        window.dispatchEvent(new Event('scroll'));
      });
      expect(listFrame().style.top).toBe('108px');

      setRect(boxOf(view.container), { top: 60, bottom: 100, left: 30, width: 300 });
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
      expect(listFrame().style.width).toBe('300px');
    });

    it('stops following when it is closed, and when it is removed', () => {
      const remove = vi.spyOn(window, 'removeEventListener');
      const view = mount(<Controlled />);
      click(trigger(view.container));

      click(trigger(view.container));

      expect(remove.mock.calls.map(([type]) => type)).toEqual(
        expect.arrayContaining(['scroll', 'resize']),
      );
      remove.mockRestore();
    });

    it('leaves nothing in the body when the field is removed while it is open', () => {
      const view = mount(<Controlled />);
      click(trigger(view.container));

      view.unmount();

      expect(listbox()).toBeNull();
    });
  });

  describe('the error', () => {
    it('makes the field invalid and described by the message, which is an alert', () => {
      const view = mount(<Controlled error="Choose a fruit" />);
      const field = trigger(view.container);
      const message = required(view.container.querySelector('[role="alert"]'), 'the message');

      expect(field.getAttribute('aria-invalid')).toBe('true');
      expect(field.getAttribute('aria-describedby')).toBe(message.id);
    });

    it('says nothing without a message', () => {
      const view = mount(<Controlled />);

      expect(trigger(view.container).hasAttribute('aria-invalid')).toBe(false);
    });
  });

  describe('its looks', () => {
    it('takes its classes where they belong', () => {
      const view = mount(
        <Controlled className="box" containerClassName="wrap" optionsClassName="list-frame" />,
      );
      click(trigger(view.container));

      expect(view.container.firstElementChild?.className).toContain('wrap');
      expect(trigger(view.container).parentElement?.className).toContain('box');
      expect(listbox()?.parentElement?.className).toContain('list-frame');
    });

    it('shows the icons at the two ends', () => {
      const view = mount(
        <Controlled
          icons={{
            left: { icon: 'solar:info-circle-linear', className: 'left-icon' },
            right: <i data-testid="r" />,
          }}
        />,
      );

      expect(view.container.querySelector('.left-icon')).not.toBeNull();
      expect(view.container.querySelector('[data-testid="r"]')).not.toBeNull();
    });

    it('turns its arrow when it is open, and not for a person who asked for less motion', () => {
      const view = mount(<Controlled />);
      const arrow = () => required(trigger(view.container).querySelector('svg'), 'the arrow');

      expect(arrow().getAttribute('class')).not.toContain('rotate-180');
      click(trigger(view.container));

      expect(arrow().getAttribute('class')).toContain('rotate-180');
      expect(arrow().getAttribute('class')).toContain('motion-reduce:transition-none');
    });

    it('shows a check on the chosen option, with no network', () => {
      const view = mount(<Controlled initial="cherry" />);
      click(trigger(view.container));

      expect(optionsOf()[2]?.querySelector('svg')).not.toBeNull();
      expect(optionsOf()[0]?.querySelector('svg')).toBeNull();
    });
  });

  it('is the same in StrictMode', () => {
    const view = mount(<Controlled />, { strict: true });

    keyDown(trigger(view.container), 'ArrowDown');
    keyDown(trigger(view.container), 'Enter');

    expect(trigger(view.container).textContent).toBe('Apple');
  });

  // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest.
  it('does not compile without the options or the value, or with a position that does not exist', () => {
    const check = () => {
      // @ts-expect-error the options are needed
      <Select selectProps={{ value: '', onChange: () => undefined }} />;
      // @ts-expect-error and the props of the select
      <Select options={[]} />;
      <Select
        options={[]}
        selectProps={{ value: '', onChange: () => undefined }}
        // @ts-expect-error the list opens on the top or the bottom
        position="left"
      />;
      <Select
        // @ts-expect-error the value of an option is text or a number
        options={[{ label: 'x', value: true }]}
        selectProps={{ value: '', onChange: () => undefined }}
      />;
    };

    expect(check).toBeTypeOf('function');
  });
});
