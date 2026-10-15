// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { click, keyDown, press, required } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { Dropdown } from './Dropdown.js';

const toggle = (container: HTMLElement) =>
  required(container.querySelector<HTMLButtonElement>('button[aria-expanded]'), 'the button');
const panel = (container: HTMLElement) => {
  const id = toggle(container).getAttribute('aria-controls') ?? '';

  return required(container.querySelector<HTMLElement>(`[id="${id}"]`), 'the panel');
};

describe('Dropdown', () => {
  afterEach(unmountAll);

  describe('closed', () => {
    it('shows the title in a button that says it is closed', () => {
      const view = mount(
        <Dropdown title="Filters">
          <p>Content</p>
        </Dropdown>,
      );

      expect(toggle(view.container).textContent).toBe('Filters');
      expect(toggle(view.container).getAttribute('aria-expanded')).toBe('false');
      expect(toggle(view.container).getAttribute('type')).toBe('button');
    });

    it('hides the content from the keyboard and from assistive technology, not only from the eyes', () => {
      const view = mount(
        <Dropdown title="Filters">
          <button type="button">Inside</button>
        </Dropdown>,
      );

      expect(panel(view.container).hasAttribute('inert')).toBe(true);
      expect(panel(view.container).className).toContain('grid-rows-[0fr]');
      expect(panel(view.container).className).toContain('opacity-0');
    });

    it('points the button to the panel it opens', () => {
      const view = mount(
        <Dropdown title="Filters">
          <p>Content</p>
        </Dropdown>,
      );

      expect(panel(view.container).textContent).toBe('Content');
    });

    it('gives each dropdown its own panel', () => {
      const view = mount(
        <>
          <Dropdown title="One">x</Dropdown>
          <Dropdown title="Two">x</Dropdown>
        </>,
      );
      const buttons = view.container.querySelectorAll('button[aria-expanded]');

      expect(buttons[0].getAttribute('aria-controls')).not.toBe(
        buttons[1].getAttribute('aria-controls'),
      );
    });
  });

  describe('opening and closing', () => {
    it('opens with the button and closes with it', () => {
      const view = mount(
        <Dropdown title="Filters">
          <p>Content</p>
        </Dropdown>,
      );

      click(toggle(view.container));
      expect(toggle(view.container).getAttribute('aria-expanded')).toBe('true');
      expect(panel(view.container).hasAttribute('inert')).toBe(false);
      expect(panel(view.container).className).toContain('grid-rows-[1fr]');
      expect(panel(view.container).className).toContain('opacity-100');

      click(toggle(view.container));
      expect(toggle(view.container).getAttribute('aria-expanded')).toBe('false');
      expect(panel(view.container).hasAttribute('inert')).toBe(true);
    });

    it('turns the arrow over while it is open', () => {
      const view = mount(<Dropdown title="Filters">x</Dropdown>);
      const arrow = () =>
        required(toggle(view.container).querySelector('svg:last-of-type'), 'arrow');

      expect(arrow().getAttribute('class')).toContain('rotate-0');

      click(toggle(view.container));

      expect(arrow().getAttribute('class')).toContain('rotate-180');
    });

    it('can start open', () => {
      const view = mount(
        <Dropdown title="Filters" defaultOpen>
          x
        </Dropdown>,
      );

      expect(toggle(view.container).getAttribute('aria-expanded')).toBe('true');
      expect(panel(view.container).hasAttribute('inert')).toBe(false);
    });

    it('is reached by the keyboard like any button', () => {
      const view = mount(<Dropdown title="Filters">x</Dropdown>);

      toggle(view.container).focus();

      expect(document.activeElement).toBe(toggle(view.container));
      expect(toggle(view.container).tabIndex).toBe(0);
    });
  });

  describe('its content', () => {
    it('is what it is given', () => {
      const view = mount(
        <Dropdown title="Filters" defaultOpen>
          <span>one</span>
          <span>two</span>
        </Dropdown>,
      );

      expect(panel(view.container).textContent).toBe('onetwo');
    });

    it('can be a function that gets a way to close the dropdown', () => {
      const view = mount(
        <Dropdown title="Filters" defaultOpen>
          {({ close }) => (
            <button type="button" onClick={close}>
              Pick
            </button>
          )}
        </Dropdown>,
      );

      click(required(panel(view.container).querySelector('button'), 'Pick'));

      expect(toggle(view.container).getAttribute('aria-expanded')).toBe('false');
    });

    it('is kept (not thrown away) while the dropdown is closed', () => {
      const view = mount(
        <Dropdown title="Filters">
          <input aria-label="search" defaultValue="shoes" />
        </Dropdown>,
      );

      click(toggle(view.container));
      click(toggle(view.container));

      expect(required(panel(view.container).querySelector('input'), 'the input').value).toBe(
        'shoes',
      );
    });
  });

  describe('the title and its icons', () => {
    it('can be an element', () => {
      const view = mount(<Dropdown title={<b>Bold</b>}>x</Dropdown>);

      expect(toggle(view.container).querySelector('b')?.textContent).toBe('Bold');
    });

    it('has an icon on each side', () => {
      const view = mount(
        <Dropdown
          title="Filters"
          icons={{
            left: { icon: 'solar:check-circle-linear' },
            right: { icon: 'solar:danger-triangle-linear' },
          }}
        >
          x
        </Dropdown>,
      );

      // the two icons and the arrow
      expect(toggle(view.container).querySelectorAll('svg')).toHaveLength(3);
    });

    it('has only the arrow without icons', () => {
      const view = mount(<Dropdown title="Filters">x</Dropdown>);

      expect(toggle(view.container).querySelectorAll('svg')).toHaveLength(1);
    });
  });

  describe('the press outside', () => {
    const outside = () => {
      const element = document.createElement('button');

      document.body.append(element);

      return element;
    };

    it('does not close it unless it is told to', () => {
      const view = mount(
        <Dropdown title="Filters" defaultOpen>
          x
        </Dropdown>,
      );

      press(outside());

      expect(toggle(view.container).getAttribute('aria-expanded')).toBe('true');
    });

    it('closes it when it is told to', () => {
      const view = mount(
        <Dropdown title="Filters" defaultOpen closeOnOutsideClick>
          x
        </Dropdown>,
      );

      press(outside());

      expect(toggle(view.container).getAttribute('aria-expanded')).toBe('false');
    });

    it('does not close it when the press is inside', () => {
      const view = mount(
        <Dropdown title="Filters" defaultOpen closeOnOutsideClick>
          <p>Content</p>
        </Dropdown>,
      );

      press(required(panel(view.container).querySelector('p'), 'the content'));
      press(toggle(view.container));

      expect(toggle(view.container).getAttribute('aria-expanded')).toBe('true');
    });
  });

  describe('Escape', () => {
    it('does not close it unless it is told to', () => {
      const view = mount(
        <Dropdown title="Filters" defaultOpen>
          x
        </Dropdown>,
      );

      keyDown(document, 'Escape');

      expect(toggle(view.container).getAttribute('aria-expanded')).toBe('true');
    });

    it('closes it when it is told to', () => {
      const view = mount(
        <Dropdown title="Filters" defaultOpen closeOnEscape>
          x
        </Dropdown>,
      );

      keyDown(document, 'Escape');

      expect(toggle(view.container).getAttribute('aria-expanded')).toBe('false');
    });

    it('is not taken by a dropdown that is closed: the one below it gets it', () => {
      const view = mount(
        <>
          <Dropdown title="Under" defaultOpen closeOnEscape>
            x
          </Dropdown>
          <Dropdown title="Over" closeOnEscape>
            x
          </Dropdown>
        </>,
      );
      const [under] = [
        ...view.container.querySelectorAll<HTMLButtonElement>('button[aria-expanded]'),
      ];

      keyDown(document, 'Escape');

      expect(under.getAttribute('aria-expanded')).toBe('false');
    });

    it('leaves the Escape to a popup over it that is closed with it', () => {
      const view = mount(
        <>
          <Dropdown title="Filters" defaultOpen closeOnEscape>
            x
          </Dropdown>
          <Dropdown title="Over" defaultOpen closeOnEscape>
            x
          </Dropdown>
        </>,
      );
      const [under, over] = [
        ...view.container.querySelectorAll<HTMLButtonElement>('button[aria-expanded]'),
      ];

      keyDown(document, 'Escape');

      expect(under.getAttribute('aria-expanded')).toBe('true');
      expect(over.getAttribute('aria-expanded')).toBe('false');
    });

    it('does not hide the Escape from the ones below when it does not listen for it', () => {
      const view = mount(
        <>
          <Dropdown title="Under" defaultOpen closeOnEscape>
            x
          </Dropdown>
          <Dropdown title="Over" defaultOpen>
            x
          </Dropdown>
        </>,
      );
      const [under] = [
        ...view.container.querySelectorAll<HTMLButtonElement>('button[aria-expanded]'),
      ];

      keyDown(document, 'Escape');

      expect(under.getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('the look', () => {
    it('pushes the content down by default, and floats it over the page when it is told to', () => {
      const pushing = mount(<Dropdown title="A">x</Dropdown>);
      const floating = mount(
        <Dropdown title="B" isAbsolute>
          x
        </Dropdown>,
      );

      expect(required(pushing.container.firstElementChild, 'a').className).toContain('static');
      expect(panel(pushing.container).className).not.toContain('absolute');
      expect(required(floating.container.firstElementChild, 'b').className).toContain('relative');
      expect(panel(floating.container).className).toContain('absolute');
    });

    it('has a shadow and rounded corners only when asked for', () => {
      const plain = mount(<Dropdown title="A">x</Dropdown>);
      const fancy = mount(
        <Dropdown title="B" showShadow isRounded>
          x
        </Dropdown>,
      );

      expect(panel(plain.container).className).not.toContain('shadow');
      expect(panel(plain.container).className).not.toContain('rounded-lg');
      expect(panel(fancy.container).className).toContain('shadow');
      expect(panel(fancy.container).className).toContain('rounded-lg');
    });

    it('has the class of the app on the outside', () => {
      const view = mount(
        <Dropdown title="A" className="mine">
          x
        </Dropdown>,
      );

      expect(required(view.container.firstElementChild, 'dropdown').className).toContain('mine');
    });

    it('stops the slide for a person who asked for less motion', () => {
      const view = mount(<Dropdown title="A">x</Dropdown>);

      expect(panel(view.container).className).toContain('motion-reduce:transition-none');
    });
  });

  it('is the same in StrictMode', () => {
    const view = mount(
      <Dropdown title="Filters" closeOnEscape>
        x
      </Dropdown>,
      { strict: true },
    );

    click(toggle(view.container));
    expect(toggle(view.container).getAttribute('aria-expanded')).toBe('true');

    keyDown(document, 'Escape');

    expect(toggle(view.container).getAttribute('aria-expanded')).toBe('false');
  });

  // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest.
  it('does not compile without a title or content', () => {
    const check = () => {
      // @ts-expect-error it needs a title
      <Dropdown>x</Dropdown>;
      // @ts-expect-error and a content
      <Dropdown title="x" />;
    };

    expect(check).toBeTypeOf('function');
  });
});
