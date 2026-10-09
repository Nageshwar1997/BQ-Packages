// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getButtonCss } from '../lib/button.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { Button } from './Button.js';

const buttonOf = (container: HTMLElement) => {
  const button = container.querySelector('button');

  if (!button) throw new Error('There is no button');

  return button;
};

const classesOf = (container: HTMLElement) => buttonOf(container).className.split(/\s+/);

// An icon given as data is drawn at once (one that is only named has to be fetched first).
const PEN = { body: '<path d="M3 21l4-1L19 8l-3-3L4 17z"/>', width: 24, height: 24 };

// What every button wears, whatever its pattern.
const EVERY_BUTTON = [
  'group',
  'flex',
  'w-full',
  'cursor-pointer',
  'items-center',
  'justify-center',
  'gap-1',
  'rounded-lg',
  'px-4',
  'py-3',
  'text-sm',
  'leading-4',
  'transition-all',
  'duration-300',
  'disabled:cursor-not-allowed',
  'disabled:opacity-85',
  'lg:px-5',
  'lg:py-4',
  'xl:text-base',
];

describe('Button', () => {
  afterEach(() => {
    unmountAll();
  });

  it('shows its content and is a plain button by default', () => {
    const view = mount(<Button pattern="primary" content="Save" />);
    const button = buttonOf(view.container);

    expect(button.textContent).toBe('Save');
    expect(button.type).toBe('button'); // never submits a form by accident
  });

  it('does not turn the transparent button around, so its content stays the way up it is', () => {
    const view = mount(<Button pattern="transparent" content="Save" />);
    const button = buttonOf(view.container);

    expect(button.className).not.toContain('rotate');
    expect(button.className).not.toContain('shadow');
    expect(button.childNodes).toHaveLength(1);
    expect(button.firstChild?.nodeType).toBe(Node.TEXT_NODE); // the text, as it is
    expect(button.textContent).toBe('Save');
  });

  it('can be a submit button of another form', () => {
    const view = mount(
      <Button pattern="primary" content="Save" buttonProps={{ type: 'submit', form: 'profile' }} />,
    );

    expect(buttonOf(view.container).type).toBe('submit');
    expect(buttonOf(view.container).getAttribute('form')).toBe('profile');
  });

  it('wears the look of its pattern, then the classes it is given', () => {
    const view = mount(
      <Button
        pattern="outline"
        content="Edit"
        className="prop-class"
        buttonProps={{ className: 'button-props-class' }}
      />,
    );
    const classes = classesOf(view.container);

    expect(classes).toContain('border-primary'); // the pattern
    expect(classes).toContain('rounded-lg'); // what every button has
    expect(classes.indexOf('prop-class')).toBeGreaterThan(classes.indexOf('border-primary'));
    expect(classes.indexOf('button-props-class')).toBeGreaterThan(classes.indexOf('prop-class'));
  });

  describe('classes it is given', () => {
    it.each(['primary', 'secondary', 'tertiary', 'outline', 'transparent'] as const)(
      'drops none of its own %s classes when it is given none',
      (pattern) => {
        const view = mount(<Button pattern={pattern} content="Save" />);
        const classes = classesOf(view.container);

        for (const own of [...EVERY_BUTTON, ...getButtonCss(pattern).split(' ')]) {
          expect(classes, own).toContain(own);
        }
      },
    );

    it('win over the class of the button they clash with, without a `!`', () => {
      const view = mount(<Button pattern="primary" content="Save" className="rounded-md px-2" />);
      const classes = classesOf(view.container);

      expect(classes).toContain('rounded-md');
      expect(classes).not.toContain('rounded-lg');
      expect(classes).toContain('px-2');
      expect(classes).not.toContain('px-4');
    });

    it('leave the classes for other screen sizes alone', () => {
      const view = mount(<Button pattern="primary" content="Save" className="px-2" />);

      // `lg:px-5` is a different class from `px-2`: to change it too, the caller gives `lg:px-2`
      expect(classesOf(view.container)).toContain('lg:px-5');
    });

    it('win over the look of the pattern', () => {
      const view = mount(<Button pattern="primary" content="Save" className="text-red-500" />);
      const classes = classesOf(view.container);

      expect(classes).toContain('text-red-500');
      expect(classes).not.toContain('text-white');
    });

    it('keep both when they do not clash, and the ones in buttonProps win over `className`', () => {
      const view = mount(
        <Button
          pattern="primary"
          content="Save"
          className="uppercase rounded-md"
          buttonProps={{ className: 'rounded-xl' }}
        />,
      );
      const classes = classesOf(view.container);

      expect(classes).toContain('uppercase');
      expect(classes).toContain('rounded-xl');
      expect(classes).not.toContain('rounded-md');
      expect(classes).not.toContain('rounded-lg');
    });
  });

  it('passes the other button props on', () => {
    const view = mount(
      <Button
        pattern="primary"
        content="Save"
        buttonProps={{ 'aria-label': 'Save the form', title: 'Save' }}
      />,
    );

    expect(buttonOf(view.container).getAttribute('aria-label')).toBe('Save the form');
    expect(buttonOf(view.container).title).toBe('Save');
  });

  it('gives the button itself through `ref`', () => {
    let node: HTMLButtonElement | null = null;
    const view = mount(
      <Button
        pattern="primary"
        content="Save"
        ref={(button) => {
          node = button;
        }}
      />,
    );

    expect(node).toBe(buttonOf(view.container));
  });

  describe('with an icon only', () => {
    it('shows the icon and takes its name from `aria-label`', () => {
      const view = mount(
        <Button
          pattern="outline"
          content={{ icon: PEN }}
          buttonProps={{ 'aria-label': 'Edit category' }}
        />,
      );
      const button = buttonOf(view.container);

      expect(button.querySelector('svg')).not.toBeNull();
      expect(button.textContent).toBe('');
      expect(button.getAttribute('aria-label')).toBe('Edit category'); // what a screen reader reads
    });

    it('can take its name from another element, with `aria-labelledby`', () => {
      const view = mount(
        <Button
          pattern="outline"
          content={{ icon: 'solar:pen-linear' }}
          buttonProps={{ 'aria-labelledby': 'category-title' }}
        />,
      );

      expect(buttonOf(view.container).getAttribute('aria-labelledby')).toBe('category-title');
    });

    // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest:
    // if one of them compiled, its comment would be reported as unused and the check would fail.
    it('does not compile without a name', () => {
      // @ts-expect-error an icon alone has no name: `buttonProps` with a name is required
      const noButtonProps = <Button pattern="outline" content={{ icon: 'solar:pen-linear' }} />;
      // @ts-expect-error `buttonProps` is there, but it names nothing
      const noName = <Button pattern="outline" content={{ icon: 'x' }} buttonProps={{ title: 'Edit' }} />;

      expect([noButtonProps, noName]).toHaveLength(2);
    });
  });

  it('calls onClick when it is clicked', () => {
    const onClick = vi.fn();
    const view = mount(<Button pattern="primary" content="Save" buttonProps={{ onClick }} />);

    buttonOf(view.container).click();

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0]?.[0]).toMatchObject({ type: 'click' });
  });

  it('does nothing when it is disabled', () => {
    const onClick = vi.fn();
    const view = mount(
      <Button pattern="primary" content="Save" buttonProps={{ onClick, disabled: true }} />,
    );

    buttonOf(view.container).click();

    expect(buttonOf(view.container).disabled).toBe(true);
    expect(onClick).not.toHaveBeenCalled();
  });
});
