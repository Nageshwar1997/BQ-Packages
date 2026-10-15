// @vitest-environment jsdom
import { act, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  click,
  focus,
  installResizeObserver,
  keyDown,
  labelsOf,
  press,
  required,
  setRect,
  typeInto,
} from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import {
  HierarchySelect,
  type IHierarchySelect,
  type IHierarchySelectOption,
} from './HierarchySelect.js';

const OPTIONS: IHierarchySelectOption[] = [
  {
    label: 'Skin',
    value: 'skin',
    children: [
      { label: 'Cleanser', value: 'cleanser' },
      {
        label: 'Moisturiser',
        value: 'moisturiser',
        children: [
          { label: 'Day cream', value: 'day-cream' },
          { label: 'Night cream', value: 'night-cream' },
        ],
      },
      { label: 'Mask', value: 'mask', disabled: true },
    ],
  },
  { label: 'Hair', value: 'hair', children: [{ label: 'Shampoo', value: 'shampoo' }] },
  { label: 'Gift card', value: 'gift' },
];

const trigger = (container: HTMLElement) =>
  required(container.querySelector<HTMLButtonElement>('button[aria-haspopup]'), 'the field');
const popup = () => document.querySelector<HTMLElement>('[role="dialog"]');
const thePopup = () => required(popup(), 'the popup');
const search = () =>
  required(document.querySelector<HTMLInputElement>('input[role="combobox"]'), 'the search');
const rows = () => [...document.querySelectorAll<HTMLElement>('[role="treeitem"]')];
const names = () => rows().map((row) => row.textContent);
const rowNamed = (name: string) =>
  required(
    rows().find((row) => row.textContent === name),
    name,
  );
const activeName = () => {
  const id = search().getAttribute('aria-activedescendant');

  return id ? (rows().find((row) => row.id === id)?.textContent ?? null) : null;
};
const boxOf = (container: HTMLElement) =>
  required(container.querySelector<HTMLElement>('.relative'), 'the box of the field');

const Controlled = ({
  initial = '',
  onChange,
  ...props
}: {
  initial?: string | number;
  onChange?: (value: string | number) => void;
} & Partial<IHierarchySelect>) => {
  const [value, setValue] = useState<string | number>(initial);

  return (
    <HierarchySelect
      label="Category"
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

const open = (view: { container: HTMLElement }) => {
  click(trigger(view.container));
};

describe('HierarchySelect', () => {
  beforeEach(() => {
    installResizeObserver();
    window.innerHeight = 800;
  });

  afterEach(() => {
    unmountAll();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  describe('closed', () => {
    it('says what is chosen, also when it is deep in the tree, or what to do while nothing is', () => {
      const none = mount(<Controlled />);
      const some = mount(<Controlled initial="night-cream" />);

      expect(trigger(none.container).textContent).toBe('Pick one');
      expect(trigger(some.container).textContent).toBe('Night cream');
    });

    it('shows the placeholder in the quiet colour, and what is chosen in the text colour', () => {
      const none = mount(<Controlled />);
      const some = mount(<Controlled initial="gift" />);

      expect(trigger(none.container).querySelector('span')?.className).toContain('text-primary/30');
      expect(trigger(some.container).querySelector('span')?.className).not.toContain(
        'text-primary/30',
      );
    });

    it('shows an option whose value is "" in the quiet colour: it is the same as no choice', () => {
      const view = mount(
        <HierarchySelect
          options={[{ label: 'None', value: '' }, ...OPTIONS]}
          selectProps={{ value: '', onChange: vi.fn(), placeholder: 'Pick one' }}
        />,
      );

      expect(trigger(view.container).textContent).toBe('None');
      expect(trigger(view.container).querySelector('span')?.className).toContain('text-primary/30');
    });

    it('marks the field when it has a message, and not otherwise', () => {
      const withError = mount(<Controlled error="Choose one" />);
      const without = mount(<Controlled />);

      expect(withError.container.querySelector('[data-invalid]')).not.toBeNull();
      expect(without.container.querySelector('[data-invalid]')).toBeNull();
    });

    it('shows the placeholder for a value that is not in the tree', () => {
      const view = mount(<Controlled initial="nothing" />);

      expect(trigger(view.container).textContent).toBe('Pick one');
    });

    it('is a button that opens a dialog, closed for now', () => {
      const view = mount(<Controlled />);
      const field = trigger(view.container);

      expect(field.getAttribute('aria-haspopup')).toBe('dialog');
      expect(field.getAttribute('aria-expanded')).toBe('false');
      expect(field.hasAttribute('aria-controls')).toBe(false);
      expect(field.type).toBe('button');
      expect(popup()).toBeNull();
    });

    it('has a label that is its name', () => {
      const view = mount(<Controlled />);

      expect(
        labelsOf(trigger(view.container) as unknown as HTMLInputElement).at(0)?.textContent,
      ).toBe('Category');
    });

    it('can take the id it is given', () => {
      const view = mount(
        <HierarchySelect
          label="Category"
          options={OPTIONS}
          selectProps={{ value: '', onChange: vi.fn(), id: 'category' }}
        />,
      );

      expect(trigger(view.container).id).toBe('category');
    });

    it('is invalid and described by its message while there is one', () => {
      const view = mount(<Controlled error="Choose a category" />);
      const field = trigger(view.container);
      const message = required(view.container.querySelector('[role="alert"]'), 'the message');

      expect(field.getAttribute('aria-invalid')).toBe('true');
      expect(field.getAttribute('aria-describedby')).toBe(message.id);
      expect(message.textContent).toBe('Choose a category');
    });

    it('is valid without a message', () => {
      const view = mount(<Controlled />);

      expect(trigger(view.container).hasAttribute('aria-invalid')).toBe(false);
      expect(trigger(view.container).hasAttribute('aria-describedby')).toBe(false);
    });

    it('does not open when it is disabled, and says so', () => {
      const view = mount(
        <HierarchySelect
          options={OPTIONS}
          selectProps={{ value: '', onChange: vi.fn(), disabled: true }}
        />,
      );

      click(trigger(view.container));

      expect(trigger(view.container).disabled).toBe(true);
      expect(trigger(view.container).className).toContain('cursor-no-drop');
      expect(popup()).toBeNull();
    });

    it('does not open without options', () => {
      const view = mount(<Controlled options={[]} />);

      open(view);

      expect(popup()).toBeNull();
      expect(trigger(view.container).getAttribute('aria-expanded')).toBe('false');
    });

    it('has an icon at each end, and takes the classes it is given', () => {
      const view = mount(
        <Controlled
          className="field-class"
          containerClassName="box-class"
          icons={{ left: { icon: 'solar:folder-linear' }, right: <b data-testid="right">r</b> }}
        />,
      );

      // the arrow of the field and the icon on the left
      expect(view.container.querySelectorAll('svg')).toHaveLength(2);
      expect(view.container.querySelector('[data-testid="right"]')).not.toBeNull();
      expect(view.container.innerHTML).toContain('field-class');
      expect(required(view.container.firstElementChild, 'the box').className).toContain(
        'box-class',
      );
    });
  });

  describe('opening', () => {
    it('opens a dialog, named by the label, with the search field in focus', () => {
      const view = mount(<Controlled />);

      open(view);

      expect(thePopup().getAttribute('aria-label')).toBe('Category');
      expect(trigger(view.container).getAttribute('aria-expanded')).toBe('true');
      expect(trigger(view.container).getAttribute('aria-controls')).toBe(thePopup().id);
      expect(document.activeElement).toBe(search());
    });

    it('is drawn in the body, not where the field is', () => {
      const view = mount(<Controlled />);

      open(view);

      expect(thePopup().parentElement).toBe(document.body);
      expect(view.container.contains(thePopup())).toBe(false);
    });

    it('names the tree as the field, when it has a label', () => {
      const view = mount(<Controlled label="Category" />);

      open(view);

      expect(
        required(document.querySelector('[role="tree"]'), 'the tree').getAttribute('aria-label'),
      ).toBe('Category');
    });

    it('is named "Options" when the field has no label, or by the words of the app', () => {
      const plain = mount(<Controlled label="" />);

      open(plain);
      expect(thePopup().getAttribute('aria-label')).toBe('Options');
      expect(
        required(document.querySelector('[role="tree"]'), 'the tree').getAttribute('aria-label'),
      ).toBe('Options');
    });

    it('closes when the trigger is pressed again', () => {
      const view = mount(<Controlled />);

      open(view);
      click(trigger(view.container));

      expect(popup()).toBeNull();
      expect(trigger(view.container).getAttribute('aria-expanded')).toBe('false');
    });

    it('shows the top of the tree, closed', () => {
      const view = mount(<Controlled />);

      open(view);

      expect(names()).toEqual(['Skin', 'Hair', 'Gift card']);
    });

    it('is a tree: each line has its level, place, and whether it is open', () => {
      const view = mount(<Controlled />);

      open(view);
      const skin = rowNamed('Skin');
      const gift = rowNamed('Gift card');

      expect(required(document.querySelector('[role="tree"]'), 'the tree')).toBeTruthy();
      expect(skin.getAttribute('aria-level')).toBe('1');
      expect(skin.getAttribute('aria-posinset')).toBe('1');
      expect(skin.getAttribute('aria-setsize')).toBe('3');
      expect(skin.getAttribute('aria-expanded')).toBe('false');
      expect(gift.getAttribute('aria-posinset')).toBe('3');
      expect(gift.hasAttribute('aria-expanded')).toBe(false);
    });

    it('opens the way to the option that is chosen, and makes it the active one', () => {
      const view = mount(<Controlled initial="night-cream" />);

      open(view);

      expect(names()).toEqual([
        'Skin',
        'Cleanser',
        'Moisturiser',
        'Day cream',
        'Night cream',
        'Mask',
        'Hair',
        'Gift card',
      ]);
      expect(activeName()).toBe('Night cream');
      expect(rowNamed('Night cream').getAttribute('aria-selected')).toBe('true');
      expect(rowNamed('Night cream').getAttribute('aria-level')).toBe('3');
      expect(rowNamed('Day cream').getAttribute('aria-selected')).toBe('false');
    });

    it('closes the other branches when it opens again', () => {
      const view = mount(<Controlled />);

      open(view);
      click(rowNamed('Skin'));
      click(rowNamed('Hair'));
      click(trigger(view.container));
      open(view);

      expect(names()).toEqual(['Skin', 'Hair', 'Gift card']);
    });

    it('has nothing active at first when nothing is chosen', () => {
      const view = mount(<Controlled />);

      open(view);

      expect(activeName()).toBeNull();
      expect(search().hasAttribute('aria-activedescendant')).toBe(false);
    });

    it('has nothing active at first when what is chosen is disabled', () => {
      const view = mount(<Controlled initial="mask" />);

      open(view);

      expect(activeName()).toBeNull();
    });

    it('closes when the field is disabled while it is open, and when its options are gone', () => {
      const render = (disabled: boolean, options: IHierarchySelectOption[]) => (
        <HierarchySelect
          label="Category"
          options={options}
          selectProps={{ value: '', onChange: vi.fn(), disabled }}
        />
      );
      const view = mount(render(false, OPTIONS));

      open(view);
      expect(popup()).not.toBeNull();

      view.rerender(render(true, OPTIONS));
      expect(popup()).toBeNull();
      expect(trigger(view.container).getAttribute('aria-expanded')).toBe('false');

      // and it does not come back by itself
      view.rerender(render(false, OPTIONS));
      expect(popup()).toBeNull();

      open(view);
      expect(popup()).not.toBeNull();

      view.rerender(render(false, []));
      expect(popup()).toBeNull();

      view.rerender(render(false, OPTIONS));
      expect(popup()).toBeNull();
    });
  });

  describe('with the mouse', () => {
    it('opens and closes a branch when it is pressed, and chooses nothing', () => {
      const onChange = vi.fn();
      const view = mount(<Controlled onChange={onChange} />);

      open(view);
      click(rowNamed('Skin'));

      expect(names()).toEqual(['Skin', 'Cleanser', 'Moisturiser', 'Mask', 'Hair', 'Gift card']);
      expect(rowNamed('Skin').getAttribute('aria-expanded')).toBe('true');

      click(rowNamed('Skin'));

      expect(names()).toEqual(['Skin', 'Hair', 'Gift card']);
      expect(onChange).not.toHaveBeenCalled();
      expect(popup()).not.toBeNull();
    });

    it('opens a branch inside a branch', () => {
      const view = mount(<Controlled />);

      open(view);
      click(rowNamed('Skin'));
      click(rowNamed('Moisturiser'));

      expect(names()).toContain('Night cream');
      expect(rowNamed('Day cream').getAttribute('aria-level')).toBe('3');
      expect(rowNamed('Day cream').getAttribute('aria-posinset')).toBe('1');
      expect(rowNamed('Day cream').getAttribute('aria-setsize')).toBe('2');
    });

    it('chooses an option without children, closes, and gives the focus back to the field', () => {
      const onChange = vi.fn();
      const view = mount(<Controlled onChange={onChange} />);

      open(view);
      click(rowNamed('Skin'));
      click(rowNamed('Cleanser'));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('cleanser');
      expect(popup()).toBeNull();
      expect(trigger(view.container).textContent).toBe('Cleanser');
      expect(document.activeElement).toBe(trigger(view.container));
    });

    it('chooses an option at the top of the tree', () => {
      const onChange = vi.fn();
      const view = mount(<Controlled onChange={onChange} />);

      open(view);
      click(rowNamed('Gift card'));

      expect(onChange).toHaveBeenCalledWith('gift');
      expect(trigger(view.container).textContent).toBe('Gift card');
    });

    it('does nothing for an option that is disabled', () => {
      const onChange = vi.fn();
      const view = mount(<Controlled onChange={onChange} />);

      open(view);
      click(rowNamed('Skin'));
      click(rowNamed('Mask'));

      expect(onChange).not.toHaveBeenCalled();
      expect(popup()).not.toBeNull();
      expect(rowNamed('Mask').getAttribute('aria-disabled')).toBe('true');
      expect(rowNamed('Mask').className).toContain('cursor-not-allowed');
    });

    it('does not make a disabled option the active one when it is pressed', () => {
      const view = mount(<Controlled initial="cleanser" />);

      open(view);
      click(rowNamed('Mask'));

      expect(activeName()).toBe('Cleanser');
    });

    it('indents each level a little more', () => {
      const view = mount(<Controlled initial="night-cream" />);

      open(view);

      expect(rowNamed('Skin').style.paddingLeft).toBe('8px');
      expect(rowNamed('Moisturiser').style.paddingLeft).toBe('20px');
      expect(rowNamed('Night cream').style.paddingLeft).toBe('32px');
    });

    it('makes the option the pointer is over the active one', () => {
      const view = mount(<Controlled />);

      open(view);
      act(() => {
        rowNamed('Hair').dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
      });

      expect(activeName()).toBe('Hair');
    });

    it('does not make a disabled option active', () => {
      const view = mount(<Controlled />);

      open(view);
      click(rowNamed('Skin'));
      act(() => {
        rowNamed('Mask').dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
      });

      // the branch that was pressed stays the active one
      expect(activeName()).toBe('Skin');
    });

    it('keeps the focus in the search field when a row is pressed', () => {
      const view = mount(<Controlled />);

      open(view);
      const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });

      act(() => {
        rowNamed('Skin').dispatchEvent(event);
      });

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(search());
    });

    it('closes on a press outside, but not on one inside the box', () => {
      const view = mount(<Controlled />);

      open(view);
      press(thePopup());
      press(rowNamed('Skin'));
      expect(popup()).not.toBeNull();

      press(document.body);

      expect(popup()).toBeNull();
    });

    it('marks the option that is chosen with a check, that is not read out', () => {
      const view = mount(<Controlled initial="gift" />);

      open(view);

      expect(rowNamed('Gift card').querySelectorAll('svg')).toHaveLength(2);
      expect(rowNamed('Hair').querySelectorAll('svg')).toHaveLength(2);
      for (const mark of rowNamed('Gift card').querySelectorAll('span[aria-hidden="true"]')) {
        expect(mark.getAttribute('aria-hidden')).toBe('true');
      }
    });
  });

  describe('with the keyboard', () => {
    it('opens with the arrow keys on the field', () => {
      const down = mount(<Controlled />);
      const field = trigger(down.container);

      const event = keyDown(field, 'ArrowDown');

      expect(event.defaultPrevented).toBe(true);
      expect(popup()).not.toBeNull();
      unmountAll();
      document.body.replaceChildren();

      const up = mount(<Controlled />);

      keyDown(trigger(up.container), 'ArrowUp');

      expect(popup()).not.toBeNull();
    });

    it('does not take the keys with ctrl, alt or meta on the field', () => {
      const view = mount(<Controlled />);

      keyDown(trigger(view.container), 'ArrowDown', { ctrlKey: true });
      keyDown(trigger(view.container), 'ArrowDown', { altKey: true });
      keyDown(trigger(view.container), 'ArrowDown', { metaKey: true });

      expect(popup()).toBeNull();
    });

    it('moves to the next and the previous option with the arrows, skipping the disabled ones', () => {
      const view = mount(<Controlled initial="cleanser" />);

      open(view);
      expect(activeName()).toBe('Cleanser');

      keyDown(search(), 'ArrowDown');
      expect(activeName()).toBe('Moisturiser');

      keyDown(search(), 'ArrowDown'); // Mask is disabled
      expect(activeName()).toBe('Hair');

      keyDown(search(), 'ArrowUp');
      expect(activeName()).toBe('Moisturiser');
    });

    it('starts at the first with Arrow Down and at the last with Arrow Up, when none is active', () => {
      const down = mount(<Controlled />);

      open(down);
      keyDown(search(), 'ArrowDown');
      expect(activeName()).toBe('Skin');
      unmountAll();
      document.body.replaceChildren();

      const up = mount(<Controlled />);

      open(up);
      keyDown(search(), 'ArrowUp');
      expect(activeName()).toBe('Gift card');
    });

    it('stays at the end of the tree', () => {
      const view = mount(<Controlled initial="gift" />);

      open(view);
      keyDown(search(), 'ArrowDown');

      expect(activeName()).toBe('Gift card');
    });

    it('keeps the page from moving with the arrows', () => {
      const view = mount(<Controlled />);

      open(view);

      expect(keyDown(search(), 'ArrowDown').defaultPrevented).toBe(true);
      expect(keyDown(search(), 'ArrowUp').defaultPrevented).toBe(true);
    });

    it('opens a branch with Arrow Right, then goes to its first option', () => {
      const view = mount(<Controlled />);

      open(view);
      keyDown(search(), 'ArrowDown'); // Skin
      const event = keyDown(search(), 'ArrowRight');

      expect(event.defaultPrevented).toBe(true);
      expect(rowNamed('Skin').getAttribute('aria-expanded')).toBe('true');
      expect(activeName()).toBe('Skin');

      keyDown(search(), 'ArrowRight');
      expect(activeName()).toBe('Cleanser');
    });

    it('does not go to a child that is disabled', () => {
      const view = mount(
        <Controlled
          options={[
            {
              label: 'Parent',
              value: 'parent',
              children: [
                { label: 'Off', value: 'off', disabled: true },
                { label: 'On', value: 'on' },
              ],
            },
          ]}
        />,
      );

      open(view);
      keyDown(search(), 'ArrowDown');
      keyDown(search(), 'ArrowRight'); // opens it
      keyDown(search(), 'ArrowRight'); // the first child is disabled: the Parent stays

      expect(activeName()).toBe('Parent');
    });

    it('does not open the box again when an arrow is pressed on the field while it is open', () => {
      const view = mount(<Controlled initial="night-cream" />);

      open(view);
      keyDown(search(), 'ArrowUp'); // Day cream
      keyDown(trigger(view.container), 'ArrowDown');

      expect(activeName()).toBe('Day cream');
    });

    it('does not do anything with Escape while it is closed', () => {
      const view = mount(<Controlled />);
      const other = document.createElement('input');

      document.body.append(other);
      other.focus();
      keyDown(document, 'Escape');

      expect(document.activeElement).toBe(other);
      expect(trigger(view.container).getAttribute('aria-expanded')).toBe('false');
    });

    it('does nothing with Arrow Right on an option without children', () => {
      const view = mount(<Controlled initial="gift" />);

      open(view);
      const event = keyDown(search(), 'ArrowRight');

      expect(event.defaultPrevented).toBe(false);
      expect(activeName()).toBe('Gift card');
    });

    it('closes an open branch with Arrow Left, then goes to its parent', () => {
      const view = mount(<Controlled initial="night-cream" />);

      open(view);
      keyDown(search(), 'ArrowUp'); // Day cream
      keyDown(search(), 'ArrowLeft');
      expect(activeName()).toBe('Moisturiser');

      keyDown(search(), 'ArrowLeft');
      expect(rowNamed('Moisturiser').getAttribute('aria-expanded')).toBe('false');
      expect(names()).not.toContain('Day cream');

      keyDown(search(), 'ArrowLeft');
      expect(activeName()).toBe('Skin');
    });

    it('does nothing with Arrow Left at the top of the tree', () => {
      const view = mount(<Controlled initial="gift" />);

      open(view);
      const event = keyDown(search(), 'ArrowLeft');

      expect(event.defaultPrevented).toBe(false);
      expect(activeName()).toBe('Gift card');
    });

    it('chooses with Enter on an option, and opens or closes a branch with it', () => {
      const onChange = vi.fn();
      const view = mount(<Controlled onChange={onChange} />);

      open(view);
      keyDown(search(), 'ArrowDown'); // Skin
      keyDown(search(), 'Enter');
      expect(rowNamed('Skin').getAttribute('aria-expanded')).toBe('true');

      keyDown(search(), 'Enter');
      expect(rowNamed('Skin').getAttribute('aria-expanded')).toBe('false');
      expect(onChange).not.toHaveBeenCalled();

      keyDown(search(), 'ArrowUp'); // Gift card (from Skin, none before: stays on Skin)
      keyDown(search(), 'ArrowDown'); // Hair
      keyDown(search(), 'ArrowDown'); // Gift card
      const event = keyDown(search(), 'Enter');

      expect(event.defaultPrevented).toBe(true);
      expect(onChange).toHaveBeenCalledWith('gift');
      expect(popup()).toBeNull();
    });

    it('does nothing with Enter when no option is active', () => {
      const onChange = vi.fn();
      const view = mount(<Controlled onChange={onChange} />);

      open(view);
      const event = keyDown(search(), 'Enter');

      expect(event.defaultPrevented).toBe(true);
      expect(onChange).not.toHaveBeenCalled();
      expect(popup()).not.toBeNull();
    });

    it('closes with Escape and gives the focus back to the field', () => {
      const view = mount(<Controlled />);

      open(view);
      keyDown(document, 'Escape');

      expect(popup()).toBeNull();
      expect(document.activeElement).toBe(trigger(view.container));
    });

    it('closes with Tab, with the focus on the field so the Tab goes on from there', () => {
      const view = mount(<Controlled />);

      open(view);
      const event = keyDown(search(), 'Tab');

      expect(popup()).toBeNull();
      expect(document.activeElement).toBe(trigger(view.container));
      expect(event.defaultPrevented).toBe(false);
    });

    it('does not give the focus to the field when it is closed by a press outside', () => {
      const view = mount(<Controlled />);
      const other = document.createElement('input');

      document.body.append(other);
      open(view);
      other.focus();
      press(other);

      expect(popup()).toBeNull();
      expect(document.activeElement).toBe(other);
    });

    it.each(['ctrlKey', 'altKey', 'metaKey'] as const)(
      'leaves alone the keys with %s',
      (modifier) => {
        const view = mount(<Controlled />);

        open(view);
        const event = keyDown(search(), 'ArrowDown', { [modifier]: true });

        expect(event.defaultPrevented).toBe(false);
        expect(activeName()).toBeNull();
      },
    );

    it('lets the app listen to the keys first, and leaves them to it when it handled one', () => {
      const onKeyDown = vi.fn((event: { key: string; preventDefault: () => void }) => {
        if (event.key === 'ArrowDown') event.preventDefault();
      });
      const view = mount(<Controlled inputProps={{ onKeyDown }} />);

      open(view);
      keyDown(search(), 'ArrowDown');

      expect(onKeyDown).toHaveBeenCalledTimes(1);
      expect(activeName()).toBeNull();

      keyDown(search(), 'ArrowUp');
      expect(activeName()).toBe('Gift card');
    });

    it('scrolls the active option into view without moving the page', () => {
      const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
      const view = mount(<Controlled />);

      open(view);
      const list = required(document.querySelector<HTMLElement>('[role="tree"]'), 'the tree');

      Object.defineProperty(list, 'clientHeight', { configurable: true, value: 50 });
      for (const row of rows()) {
        Object.defineProperty(row, 'offsetTop', {
          configurable: true,
          value: 100 * rows().indexOf(row),
        });
        Object.defineProperty(row, 'offsetHeight', { configurable: true, value: 30 });
      }
      keyDown(search(), 'ArrowDown');
      keyDown(search(), 'ArrowDown');
      keyDown(search(), 'ArrowDown');

      // the third row is at 200 and 30 tall: its bottom (230) is the bottom of the list
      expect(list.scrollTop).toBe(180);
      expect(scrollTo).not.toHaveBeenCalled();
      scrollTo.mockRestore();
    });
  });

  describe('searching', () => {
    it('shows the options that match, and the branches that lead to them, all open', () => {
      const view = mount(<Controlled />);

      open(view);
      typeInto(search(), 'night');

      expect(names()).toEqual(['Skin', 'Moisturiser', 'Night cream']);
      expect(rowNamed('Skin').getAttribute('aria-expanded')).toBe('true');
      expect(rowNamed('Moisturiser').getAttribute('aria-expanded')).toBe('true');
    });

    it('does not mind capital letters or spaces around the word', () => {
      const view = mount(<Controlled />);

      open(view);
      typeInto(search(), '  SHAMPOO ');

      expect(names()).toEqual(['Hair', 'Shampoo']);
    });

    it('keeps everything under an option that matches', () => {
      const view = mount(<Controlled />);

      open(view);
      typeInto(search(), 'moist');

      expect(names()).toEqual(['Skin', 'Moisturiser', 'Day cream', 'Night cream']);
    });

    it('looks for a node by its searchLabel when its label is not text', () => {
      const view = mount(
        <Controlled
          options={[
            { label: <b>Fancy</b>, value: 'fancy', searchLabel: 'Luxury' },
            { label: 'Plain', value: 'plain' },
          ]}
        />,
      );

      open(view);
      typeInto(search(), 'lux');

      expect(names()).toEqual(['Fancy']);
    });

    it('looks for a node by its value when it has neither text nor a searchLabel', () => {
      const view = mount(
        <Controlled
          options={[
            { label: <b>Box</b>, value: 'special-box' },
            { label: 'Plain', value: 'plain' },
          ]}
        />,
      );

      open(view);
      typeInto(search(), 'special');

      expect(names()).toEqual(['Box']);
    });

    it('makes the first match the active one, so Enter takes it', () => {
      const onChange = vi.fn();
      const view = mount(<Controlled onChange={onChange} />);

      open(view);
      typeInto(search(), 'cream');

      expect(activeName()).toBe('Day cream');

      keyDown(search(), 'Enter');

      expect(onChange).toHaveBeenCalledWith('day-cream');
    });

    it('skips a disabled match for the first active one', () => {
      const view = mount(<Controlled />);

      open(view);
      typeInto(search(), 'mask');

      expect(names()).toEqual(['Skin', 'Mask']);
      expect(activeName()).toBeNull();
    });

    it('moves among the matches with the arrows', () => {
      const view = mount(<Controlled />);

      open(view);
      typeInto(search(), 'cream');
      keyDown(search(), 'ArrowDown');

      expect(activeName()).toBe('Night cream');
    });

    it('leaves Arrow Right to the text also when a branch is the active one', () => {
      const view = mount(<Controlled />);

      open(view);
      typeInto(search(), 'cream');
      keyDown(search(), 'ArrowUp'); // from Day cream to Moisturiser, a branch

      expect(activeName()).toBe('Moisturiser');
      expect(keyDown(search(), 'ArrowRight').defaultPrevented).toBe(false);
      expect(activeName()).toBe('Moisturiser');
    });

    it('does not mind a search of only spaces: nothing is filtered and nothing is opened', () => {
      const view = mount(<Controlled />);

      open(view);
      typeInto(search(), '   ');

      expect(names()).toEqual(['Skin', 'Hair', 'Gift card']);
      expect(thePopup().querySelector('[role="status"].sr-only')?.textContent).toBe('');
    });

    it('does not remember a branch that was pressed while a search had it open', () => {
      const view = mount(<Controlled />);

      open(view);
      click(rowNamed('Skin'));
      typeInto(search(), 'cream');
      click(rowNamed('Moisturiser'));
      typeInto(search(), '');

      // Skin is open as the person left it; Moisturiser was never opened or closed by them
      expect(names()).toEqual(['Skin', 'Cleanser', 'Moisturiser', 'Mask', 'Hair', 'Gift card']);
    });

    it('leaves Arrow Right and Left to the text while there is a search', () => {
      const view = mount(<Controlled />);

      open(view);
      typeInto(search(), 'cream');

      expect(keyDown(search(), 'ArrowRight').defaultPrevented).toBe(false);
      expect(keyDown(search(), 'ArrowLeft').defaultPrevented).toBe(false);
      expect(rowNamed('Moisturiser').getAttribute('aria-expanded')).toBe('true');
    });

    it('does not close a branch that a search opened when it is pressed', () => {
      const view = mount(<Controlled />);

      open(view);
      typeInto(search(), 'cream');
      click(rowNamed('Moisturiser'));

      expect(names()).toContain('Day cream');
    });

    it('says how many options it found, politely', () => {
      const view = mount(<Controlled />);

      open(view);
      const status = required(
        thePopup().querySelector<HTMLElement>('[role="status"].sr-only'),
        'the count',
      );

      expect(status.textContent).toBe('');

      typeInto(search(), 'night');
      expect(status.textContent).toBe('3 options found');

      typeInto(search(), 'gift');
      expect(status.textContent).toBe('1 option found');
    });

    it('says there is nothing, in a status, when nothing matches', () => {
      const view = mount(<Controlled />);

      open(view);
      typeInto(search(), 'zzz');

      expect(rows()).toHaveLength(0);
      expect(document.querySelector('[role="tree"]')).toBeNull();
      expect(thePopup().textContent).toContain('No matching options found');
      expect(thePopup().textContent).toContain('Try searching with a different keyword');
      expect(search().hasAttribute('aria-controls')).toBe(false);
    });

    it('is emptied when the box closes', () => {
      const view = mount(<Controlled />);

      open(view);
      typeInto(search(), 'cream');
      keyDown(document, 'Escape');
      open(view);

      expect(search().value).toBe('');
      expect(names()).toEqual(['Skin', 'Hair', 'Gift card']);
    });

    it('is a combobox for assistive technology, with a name and a hint', () => {
      const view = mount(<Controlled />);

      open(view);

      expect(search().getAttribute('role')).toBe('combobox');
      expect(search().getAttribute('aria-label')).toBe('Search options');
      expect(search().getAttribute('aria-expanded')).toBe('true');
      expect(search().getAttribute('aria-autocomplete')).toBe('list');
      expect(search().getAttribute('autocomplete')).toBe('off');
      expect(search().getAttribute('placeholder')).toBe('Search here...');
      expect(search().getAttribute('aria-controls')).toBe(
        required(document.querySelector('[role="tree"]'), 'the tree').id,
      );
    });

    it('points to the active option, which exists', () => {
      const view = mount(<Controlled initial="gift" />);

      open(view);

      const active = search().getAttribute('aria-activedescendant') ?? '';

      expect(document.getElementById(active)?.textContent).toBe('Gift card');
    });

    describe('the clear button', () => {
      it('is a magnifier that does nothing while the search is empty, and a named button when it is not', () => {
        const view = mount(<Controlled />);

        open(view);
        expect(thePopup().querySelector('button')).toBeNull();

        typeInto(search(), 'a');
        const button = required(
          thePopup().querySelector<HTMLButtonElement>('button[aria-label="Clear search"]'),
          'the clear button',
        );

        expect(button.type).toBe('button');
      });

      it('empties the search, shows the whole tree and keeps the focus in the search field', () => {
        const view = mount(<Controlled />);

        open(view);
        typeInto(search(), 'cream');
        const clear = required(
          thePopup().querySelector<HTMLButtonElement>('button[aria-label="Clear search"]'),
          'the clear button',
        );

        // a press on the button takes the focus, as the click of a person does
        clear.focus();
        click(clear);

        expect(search().value).toBe('');
        expect(names()).toEqual(['Skin', 'Hair', 'Gift card']);
        expect(document.activeElement).toBe(search());
        expect(thePopup().querySelector('button')).toBeNull();
      });
    });

    describe('when the app owns the search', () => {
      const Owned = ({ onSearch }: { onSearch: (text: string) => void }) => {
        const [text, setText] = useState('');

        return (
          <Controlled
            inputProps={{
              value: text,
              onChange: (event) => {
                setText(event.target.value);
                onSearch(event.target.value);
              },
            }}
          />
        );
      };

      it('shows its text and tells it what was typed', () => {
        const onSearch = vi.fn();
        const view = mount(<Owned onSearch={onSearch} />);

        open(view);
        typeInto(search(), 'night');

        expect(onSearch).toHaveBeenLastCalledWith('night');
        expect(search().value).toBe('night');
        expect(names()).toEqual(['Skin', 'Moisturiser', 'Night cream']);
      });

      it('tells it that the search was cleared', () => {
        const onSearch = vi.fn();
        const view = mount(<Owned onSearch={onSearch} />);

        open(view);
        typeInto(search(), 'night');
        click(
          required(
            thePopup().querySelector('button[aria-label="Clear search"]'),
            'the clear button',
          ),
        );

        expect(onSearch).toHaveBeenLastCalledWith('');
        expect(search().value).toBe('');
      });

      it('keeps its text when the box closes: it is the app that owns it', () => {
        const view = mount(<Owned onSearch={vi.fn()} />);

        open(view);
        typeInto(search(), 'night');
        keyDown(document, 'Escape');
        open(view);

        expect(search().value).toBe('night');
      });
    });

    it('takes the other attributes of the search field, and its placeholder', () => {
      const view = mount(
        <Controlled
          inputProps={{
            placeholder: 'Find a category',
            'aria-label': 'Find',
            name: 'q',
            className: 'mine',
          }}
        />,
      );

      open(view);

      expect(search().getAttribute('placeholder')).toBe('Find a category');
      expect(search().getAttribute('aria-label')).toBe('Find');
      expect(search().name).toBe('q');
      expect(search().className).toContain('mine');
      expect(search().className).toContain('py-2!');
    });

    it('tells the app each time the text changes', () => {
      const onChange = vi.fn();
      const view = mount(<Controlled inputProps={{ onChange }} />);

      open(view);
      typeInto(search(), 'a');
      typeInto(search(), 'ab');

      expect(onChange).toHaveBeenCalledTimes(2);
    });
  });

  describe('where the box is', () => {
    it('is under the field, as wide as it', () => {
      const view = mount(<Controlled />);

      setRect(boxOf(view.container), { top: 100, bottom: 140, left: 30, width: 200 });
      open(view);

      expect(thePopup().style.top).toBe('148px');
      expect(thePopup().style.left).toBe('30px');
      expect(thePopup().style.width).toBe('200px');
      expect(thePopup().className).toContain('fixed');
    });

    it('is over the field when it is asked to, and there is room', () => {
      const view = mount(<Controlled position="top" />);

      setRect(boxOf(view.container), { top: 500, bottom: 540, left: 10, width: 120 });
      open(view);

      expect(thePopup().style.bottom).toBe('308px');
      expect(thePopup().style.top).toBe('');
    });

    it('is on the other side when there is no room on the one asked for', () => {
      const view = mount(<Controlled />);

      setRect(boxOf(view.container), { top: 600, bottom: 780, left: 10, width: 120 });
      open(view);

      expect(thePopup().style.bottom).toBe('208px');
    });

    it('follows the field when the page scrolls', () => {
      const view = mount(<Controlled />);

      setRect(boxOf(view.container), { top: 100, bottom: 140, left: 30, width: 200 });
      open(view);
      setRect(boxOf(view.container), { top: 60, bottom: 100, left: 30, width: 200 });
      act(() => {
        window.dispatchEvent(new Event('scroll'));
      });

      expect(thePopup().style.top).toBe('108px');
    });

    it('follows the field when the window is resized', () => {
      const view = mount(<Controlled />);

      setRect(boxOf(view.container), { top: 100, bottom: 140, left: 30, width: 200 });
      open(view);
      setRect(boxOf(view.container), { top: 100, bottom: 140, left: 30, width: 300 });
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      expect(thePopup().style.width).toBe('300px');
    });

    it('stops following when it is closed', () => {
      const add = vi.spyOn(window, 'addEventListener');
      const remove = vi.spyOn(window, 'removeEventListener');
      const view = mount(<Controlled />);

      open(view);
      const scrolls = add.mock.calls.filter(([type]) => type === 'scroll').length;

      keyDown(document, 'Escape');

      expect(scrolls).toBe(1);
      expect(remove.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(1);
      add.mockRestore();
      remove.mockRestore();
    });

    it('takes a class for the box', () => {
      const view = mount(<Controlled optionsClassName="wide" />);

      open(view);

      expect(thePopup().className).toContain('wide');
    });
  });

  describe('the words', () => {
    it('can all be said in another language', () => {
      const view = mount(
        <Controlled
          label=""
          labels={{
            tree: 'Categorías',
            search: 'Buscar',
            searchPlaceholder: 'Buscar aquí',
            clearSearch: 'Borrar',
            noResultsTitle: 'Nada',
            noResultsDescription: 'Prueba otra palabra',
            results: (count) => `${String(count)} encontradas`,
          }}
        />,
      );

      open(view);
      expect(thePopup().getAttribute('aria-label')).toBe('Categorías');
      expect(search().getAttribute('aria-label')).toBe('Buscar');
      expect(search().getAttribute('placeholder')).toBe('Buscar aquí');

      typeInto(search(), 'night');
      expect(thePopup().textContent).toContain('3 encontradas');
      expect(thePopup().querySelector('[aria-label="Borrar"]')).not.toBeNull();

      typeInto(search(), 'zzz');
      expect(thePopup().textContent).toContain('Nada');
      expect(thePopup().textContent).toContain('Prueba otra palabra');
    });
  });

  it('is the same in StrictMode', () => {
    const onChange = vi.fn();
    const view = mount(<Controlled onChange={onChange} />, { strict: true });

    open(view);
    click(rowNamed('Gift card'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(popup()).toBeNull();
  });

  it('focuses the search field when the field is focused and opened by the keyboard', () => {
    const view = mount(<Controlled />);

    focus(trigger(view.container));
    keyDown(trigger(view.container), 'ArrowDown');

    expect(document.activeElement).toBe(search());
  });

  // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest.
  it('does not compile without the options or the value, or with a position that does not exist', () => {
    const check = () => {
      // @ts-expect-error the options are needed
      <HierarchySelect selectProps={{ value: '', onChange: () => undefined }} />;
      // @ts-expect-error and the props of the select
      <HierarchySelect options={[]} />;
      <HierarchySelect
        options={[]}
        selectProps={{ value: '', onChange: () => undefined }}
        // @ts-expect-error the box opens on the top or the bottom
        position="left"
      />;
      <HierarchySelect
        // @ts-expect-error an option has a label and a value
        options={[{ value: 'a' }]}
        selectProps={{ value: '', onChange: () => undefined }}
      />;
    };

    expect(check).toBeTypeOf('function');
  });
});
