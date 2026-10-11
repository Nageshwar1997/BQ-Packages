// @vitest-environment jsdom
import { _api, addCollection } from '@iconify/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

import { mount, unmountAll } from '../test-utils/react.js';
import { type IStepperStep, Stepper } from './Stepper.js';

const STEPS: IStepperStep[] = [
  { title: 'Account', description: 'Create your account' },
  { title: 'Address', description: 'Where to deliver' },
  { title: 'Payment' },
  { title: 'Review', description: 'Check and place the order' },
];

const items = (container: HTMLElement) => [...container.querySelectorAll('li')];
const click = (element: Element | undefined) => {
  element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};

let apiRequests: string[] = [];
let realFetch: ReturnType<typeof _api.getFetch>;

describe('Stepper', () => {
  beforeEach(() => {
    realFetch = _api.getFetch();
    apiRequests = [];
    _api.setFetch((url) => {
      apiRequests.push(typeof url === 'string' ? url : url instanceof URL ? url.href : url.url);

      return Promise.reject(new TypeError('Failed to fetch'));
    });
  });

  afterEach(() => {
    unmountAll();
    if (realFetch) _api.setFetch(realFetch);
    vi.restoreAllMocks();
  });

  describe('structure', () => {
    it('is an ordered list with an item for every step, in order', () => {
      const view = mount(<Stepper steps={STEPS} activeStep={0} />);

      expect(view.container.querySelectorAll('ol')).toHaveLength(1);
      expect(items(view.container).map((li) => li.textContent)).toEqual([
        '1Account' + 'Create your account',
        '2Address' + 'Where to deliver',
        '3Payment',
        '4Review' + 'Check and place the order',
      ]);
    });

    it('names the list when it has a label, and says nothing when it has none', () => {
      const labelled = mount(<Stepper steps={STEPS} activeStep={0} label="Checkout progress" />);
      expect(labelled.container.querySelector('ol')?.getAttribute('aria-label')).toBe(
        'Checkout progress',
      );

      const plain = mount(<Stepper steps={STEPS} activeStep={0} />);
      expect(plain.container.querySelector('ol')?.hasAttribute('aria-label')).toBe(false);
    });

    it('lays the steps out in as many columns as there are steps', () => {
      const view = mount(<Stepper steps={STEPS} activeStep={0} />);
      const list = view.container.querySelector('ol');

      expect(list?.style.getPropertyValue('--steps-count')).toBe('4');
      expect(list?.className).toContain('md:grid-cols-[repeat(var(--steps-count),minmax(0,1fr))]');
    });

    it('accepts steps as a readonly array', () => {
      const steps = [{ title: 'One' }, { title: 'Two' }] as const;
      const view = mount(<Stepper steps={steps} activeStep={1} />);

      expect(items(view.container)).toHaveLength(2);
    });

    it('shows no list at all when there are no steps, and still shows the children', () => {
      const view = mount(
        <Stepper steps={[]} activeStep={0}>
          Nothing to do
        </Stepper>,
      );

      expect(view.container.querySelector('ol')).toBeNull();
      expect(view.container.textContent).toBe('Nothing to do');
    });

    it('is a div that gets the attributes it is given, and the classes after its own', () => {
      const view = mount(
        <Stepper steps={STEPS} activeStep={0} id="checkout" data-testid="s" className="p-0!" />,
      );
      const root = view.container.firstElementChild;

      expect(root?.tagName).toBe('DIV');
      expect(root?.id).toBe('checkout');
      expect(root?.getAttribute('data-testid')).toBe('s');
      expect(root?.className.split(/\s+/)).toContain('p-0!');
      expect(root?.className.indexOf('p-0!')).toBeGreaterThan(root?.className.indexOf('p-4') ?? 0);
    });

    it('does not give its own props to the page as attributes', () => {
      const view = mount(
        <Stepper steps={STEPS} activeStep={1} onStepClick={() => undefined} label="x" />,
      );
      const root = view.container.firstElementChild;

      for (const name of ['steps', 'activestep', 'onstepclick', 'label', 'completedlabel']) {
        expect(root?.hasAttribute(name), name).toBe(false);
      }
    });
  });

  describe('which step is current', () => {
    it('marks the steps before it completed, it active and the rest upcoming', () => {
      const view = mount(<Stepper steps={STEPS} activeStep={2} />);

      expect(items(view.container).map((li) => li.dataset.state)).toEqual([
        'completed',
        'completed',
        'active',
        'upcoming',
      ]);
    });

    it('tells assistive technology which step is current, and only one', () => {
      const view = mount(<Stepper steps={STEPS} activeStep={1} />);

      expect(items(view.container).map((li) => li.getAttribute('aria-current'))).toEqual([
        null,
        'step',
        null,
        null,
      ]);
    });

    it.each([
      [99, 3],
      [-4, 0],
      [Number.NaN, 0],
      [1.7, 1],
    ])('puts activeStep %s on step %s', (activeStep, expected) => {
      const view = mount(<Stepper steps={STEPS} activeStep={activeStep} />);

      expect(items(view.container).findIndex((li) => li.dataset.state === 'active')).toBe(expected);
    });

    it('moves the mark when activeStep changes', () => {
      const view = mount(<Stepper steps={STEPS} activeStep={0} />);
      view.rerender(<Stepper steps={STEPS} activeStep={3} />);

      expect(items(view.container).map((li) => li.dataset.state)).toEqual([
        'completed',
        'completed',
        'completed',
        'active',
      ]);
    });
  });

  describe('what is in the circle', () => {
    it('is the number of the step while it is active or upcoming', () => {
      const view = mount(<Stepper steps={STEPS} activeStep={1} />);
      const circles = items(view.container).map((li) =>
        li.querySelector('span[aria-hidden]:not(:empty)'),
      );

      expect(circles[1]?.textContent).toBe('2');
      expect(circles[2]?.textContent).toBe('3');
    });

    it('is a tick when the step is completed, which is bundled: it is not downloaded', () => {
      const view = mount(<Stepper steps={STEPS} activeStep={2} />);
      const [first, second, third] = items(view.container);

      expect(first.querySelector('svg')?.innerHTML).toContain('M4 12.9');
      expect(second.querySelector('svg')?.innerHTML).toContain('M4 12.9');
      expect(third.querySelector('svg')).toBeNull();
      expect(apiRequests).toEqual([]); // the API of Iconify was never asked
    });

    it('draws the tick as an svg that is decoration and as big as the icons of the steps', () => {
      const view = mount(<Stepper steps={STEPS} activeStep={1} />);
      const tick = items(view.container)[0]?.querySelector('svg');

      expect(tick?.getAttribute('viewBox')).toBe('0 0 24 24');
      expect(tick?.getAttribute('aria-hidden')).toBe('true');
      expect(tick?.getAttribute('class')?.split(/\s+/)).toContain('size-5');
    });

    it('is the icon of the step while it is not completed', () => {
      addCollection({
        prefix: 'test',
        width: 24,
        height: 24,
        icons: { user: { body: '<path d="M1 1h1"/>' } },
      });
      const view = mount(
        <Stepper steps={[{ title: 'A', icon: 'test:user' }, { title: 'B' }]} activeStep={0} />,
      );
      const [first, second] = items(view.container);

      expect(first.querySelector('svg')?.innerHTML).toContain('M1 1h1');
      expect(first.textContent).toBe('A'); // the icon replaces the number
      expect(second.querySelector('svg')).toBeNull();
    });

    it('is the tick, not its own icon, once the step is completed', () => {
      addCollection({
        prefix: 'test',
        width: 24,
        height: 24,
        icons: { user: { body: '<path d="M1 1h1"/>' } },
      });
      const view = mount(
        <Stepper steps={[{ title: 'A', icon: 'test:user' }, { title: 'B' }]} activeStep={1} />,
      );

      expect(items(view.container)[0]?.querySelector('svg')?.innerHTML).toContain('M4 12.9');
      expect(items(view.container)[0]?.querySelector('svg')?.innerHTML).not.toContain('M1 1h1');
    });

    // Iconify draws its icons in the browser only: on a server a placeholder is in their place.
    it('can be rendered on a server: the steps are there, the tick is drawn in the browser', () => {
      const html = renderToString(<Stepper steps={STEPS} activeStep={1} />);

      expect(html).toContain('<ol');
      expect(html).toContain('Account');
      expect(html).toContain('Completed');
    });
  });

  describe('what assistive technology gets', () => {
    it('hears that a step is completed, as the tick alone says nothing', () => {
      const view = mount(<Stepper steps={STEPS} activeStep={2} />);
      const [first, , third] = items(view.container);

      expect(first.querySelector('.sr-only')?.textContent).toBe('Completed: ');
      expect(third.querySelector('.sr-only')).toBeNull();
    });

    it('can be told another word for it', () => {
      const view = mount(<Stepper steps={STEPS} activeStep={1} completedLabel="Hecho" />);

      expect(items(view.container)[0]?.querySelector('.sr-only')?.textContent).toBe('Hecho: ');
    });

    it('hides the circles and the lines between the steps, which are only decoration', () => {
      const view = mount(<Stepper steps={STEPS} activeStep={1} />);
      const decoration = view.container.querySelectorAll('li span[aria-hidden="true"]');

      // for each step its circle, and a line for every step except the last
      expect(decoration).toHaveLength(STEPS.length + (STEPS.length - 1));
    });

    it('keeps the title and the description out of what is hidden', () => {
      const view = mount(<Stepper steps={STEPS} activeStep={1} />);

      for (const hidden of view.container.querySelectorAll('[aria-hidden="true"]')) {
        expect(hidden.textContent).not.toMatch(/Address|Where to deliver/);
      }
    });
  });

  describe('without onStepClick', () => {
    it('has no buttons: nothing in it does anything', () => {
      const view = mount(<Stepper steps={STEPS} activeStep={1} />);

      expect(view.container.querySelectorAll('button')).toHaveLength(0);
    });
  });

  describe('with onStepClick', () => {
    it('makes every step a button that is not a submit button', () => {
      const view = mount(<Stepper steps={STEPS} activeStep={1} onStepClick={() => undefined} />);
      const buttons = [...view.container.querySelectorAll('button')];

      expect(buttons).toHaveLength(4);
      for (const button of buttons) expect(button.type).toBe('button');
    });

    it('does not submit a form it is inside', () => {
      const onSubmit = vi.fn((event: Event) => {
        event.preventDefault();
      });
      const form = document.createElement('form');
      form.addEventListener('submit', onSubmit);
      document.body.append(form);
      const view = mount(<Stepper steps={STEPS} activeStep={1} onStepClick={() => undefined} />);
      form.append(view.container);

      click(view.container.querySelector('button') ?? undefined);

      expect(onSubmit).not.toHaveBeenCalled();
      form.remove();
    });

    it('gives the index of the step that was clicked, completed, current or upcoming', () => {
      const onStepClick = vi.fn();
      const view = mount(<Stepper steps={STEPS} activeStep={1} onStepClick={onStepClick} />);
      const buttons = [...view.container.querySelectorAll('button')];

      click(buttons[3]);
      click(buttons[0]);
      click(buttons[1]);

      expect(onStepClick.mock.calls).toEqual([[3], [0], [1]]);
    });

    it('does not call it for a step that is disabled, and shows it so', () => {
      const onStepClick = vi.fn();
      const steps: IStepperStep[] = [
        { title: 'A' },
        { title: 'B', disabled: true },
        { title: 'C' },
      ];
      const view = mount(<Stepper steps={steps} activeStep={0} onStepClick={onStepClick} />);
      const buttons = [...view.container.querySelectorAll('button')];

      expect(buttons.map((button) => button.disabled)).toEqual([false, true, false]);
      click(buttons[1]);
      expect(onStepClick).not.toHaveBeenCalled();
    });

    it('uses the latest onStepClick', () => {
      const first = vi.fn();
      const second = vi.fn();
      const view = mount(<Stepper steps={STEPS} activeStep={1} onStepClick={first} />);
      view.rerender(<Stepper steps={STEPS} activeStep={1} onStepClick={second} />);

      click(view.container.querySelector('button') ?? undefined);

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledWith(0);
    });

    it('shows where the keyboard is: a ring for `:focus-visible`', () => {
      const view = mount(<Stepper steps={STEPS} activeStep={1} onStepClick={() => undefined} />);
      const classes = view.container.querySelector('button')?.className.split(/\s+/) ?? [];

      expect(classes).toContain('focus-visible:outline-2');
      // `outline-hidden` sets `--tw-outline-style: none`, which `focus-visible:outline-2` uses: with
      // both, the ring is never drawn (seen in a real browser, jsdom cannot see it).
      expect(classes).not.toContain('outline-hidden');
    });
  });

  describe('children', () => {
    it('are shown under the steps', () => {
      const view = mount(
        <Stepper steps={STEPS} activeStep={0}>
          <p>The form</p>
        </Stepper>,
      );

      expect(view.container.querySelector('p')?.textContent).toBe('The form');
      expect(view.container.querySelector('ol')?.nextElementSibling).toBe(
        view.container.querySelector('p')?.parentElement,
      );
    });

    it('show the number 0, which is something', () => {
      const view = mount(
        <Stepper steps={STEPS} activeStep={0}>
          {0}
        </Stepper>,
      );

      expect(view.container.querySelector('.border-t')?.textContent).toBe('0');
    });

    it.each([[null], [undefined], [false], ['']])(
      'leave no empty box when they are %j',
      (child) => {
        const view = mount(
          <Stepper steps={STEPS} activeStep={0}>
            {child}
          </Stepper>,
        );

        expect(view.container.querySelector('.border-t')).toBeNull();
      },
    );
  });

  describe('steps with the same text', () => {
    it('can have the same title, with no warning from React', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const view = mount(
        <Stepper
          steps={[{ title: 'Step' }, { title: 'Step' }, { title: 'Step' }]}
          activeStep={1}
        />,
      );

      expect(items(view.container)).toHaveLength(3);
      expect(error).not.toHaveBeenCalled();
    });

    it('leaves a step with an empty description without a line for it', () => {
      const view = mount(<Stepper steps={[{ title: 'A', description: '' }]} activeStep={0} />);

      expect(items(view.container)[0]?.textContent).toBe('1A');
    });
  });

  describe('in React', () => {
    it('renders the same in StrictMode, with no warning', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const view = mount(
        <Stepper steps={STEPS} activeStep={2} onStepClick={() => undefined}>
          x
        </Stepper>,
        { strict: true },
      );

      expect(items(view.container)).toHaveLength(4);
      expect(error).not.toHaveBeenCalled();
    });

    it('survives its steps changing, in number and in order', () => {
      const view = mount(<Stepper steps={STEPS} activeStep={2} />);
      view.rerender(<Stepper steps={STEPS.slice(0, 2)} activeStep={2} />);

      expect(items(view.container).map((li) => li.dataset.state)).toEqual(['completed', 'active']);
      expect(view.container.querySelector('ol')?.style.getPropertyValue('--steps-count')).toBe('2');
    });
  });

  describe('looks', () => {
    it('draws the line after a step in the accent colour once the step is completed', () => {
      const view = mount(<Stepper steps={STEPS} activeStep={2} />);
      const lines = items(view.container).map((li) => li.querySelector('.absolute')?.className);

      expect(lines[0]).toContain('bg-accent-duo');
      expect(lines[1]).toContain('bg-accent-duo');
      expect(lines[2]).toContain('bg-primary/20'); // the way to a step that is still to come
      expect(lines[3]).toBeUndefined(); // after the last step there is no line
    });

    it('keeps the steps apart from one another in forced-colors mode (high contrast)', () => {
      const view = mount(<Stepper steps={STEPS} activeStep={1} />);
      const [done, now, next] = items(view.container).map(
        (li) => li.querySelector('.rounded-full')?.className ?? '',
      );

      expect(done).toContain('forced-colors:bg-[Highlight]');
      expect(now).toContain('forced-colors:border-4');
      expect(next).toContain('forced-colors:border-[GrayText]');
    });

    it('gives a completed, a current and a coming step a look of their own', () => {
      const view = mount(<Stepper steps={STEPS} activeStep={1} />);
      const [done, now, next] = items(view.container);
      // the look of every day: the classes for forced-colors mode (high contrast) come apart
      const everyDayLook = (li: Element | undefined, selector: string) =>
        (li?.querySelector(selector)?.className.split(/\s+/) ?? [])
          .filter((name) => !name.startsWith('forced-colors:'))
          .join(' ');
      const looksOf = (selector: string) =>
        new Set([done, now, next].map((li) => everyDayLook(li, selector)));

      expect(looksOf('.rounded-full').size).toBe(3); // the circle
      expect(looksOf('.line-clamp-1').size).toBe(3); // the title
    });

    it('does not move when the user asked for less motion', () => {
      const view = mount(<Stepper steps={STEPS} activeStep={1} />);

      const circle = items(view.container)[0]?.querySelector('.rounded-full');

      expect(circle?.className).toContain('motion-reduce:transition-none');
    });
  });

  // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest.
  it('does not compile with something a stepper cannot do', () => {
    const check = () => {
      // @ts-expect-error the steps are needed
      <Stepper activeStep={0} />;
      // @ts-expect-error and so is the step that is current
      <Stepper steps={STEPS} />;
      // @ts-expect-error activeStep is a number, not a title
      <Stepper steps={STEPS} activeStep="Address" />;
      // @ts-expect-error a step has to have a title
      <Stepper steps={[{ description: 'x' }]} activeStep={0} />;
      // @ts-expect-error a step is clicked with its index, not with an event
      <Stepper steps={STEPS} activeStep={0} onStepClick={(event: MouseEvent) => event} />;
      // @ts-expect-error `disabled` is a boolean
      <Stepper steps={[{ title: 'A', disabled: 'yes' }]} activeStep={0} />;
    };

    expect(check).toBeTypeOf('function');
  });
});
