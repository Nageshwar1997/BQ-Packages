// @vitest-environment jsdom
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { required } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { InputError } from './InputError.js';
import { InputIcon } from './InputIcon.js';
import { InputLabel } from './InputLabel.js';

const first = (container: HTMLElement) =>
  required(container.firstElementChild, 'the first element');
const click = (element: Element) => {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};

describe('InputLabel', () => {
  afterEach(unmountAll);

  it('says its text, for the field it is htmlFor', () => {
    const view = mount(<InputLabel htmlFor="email">Email</InputLabel>);
    const label = first(view.container) as HTMLLabelElement;

    expect(label.tagName).toBe('LABEL');
    expect(label.textContent).toBe('Email');
    expect(label.htmlFor).toBe('email');
  });

  it('is a pointer over a field and a plain cursor over nothing', () => {
    const linked = mount(<InputLabel htmlFor="a">A</InputLabel>);
    const alone = mount(<InputLabel>A</InputLabel>);

    expect(first(linked.container).className).toContain('cursor-pointer');
    expect(first(alone.container).className).toContain('cursor-default');
    expect(first(alone.container).hasAttribute('for')).toBe(false); // not `for=""`
  });

  it.each([[null], [undefined], [false], [''], [true]])('draws nothing for %j', (children) => {
    const view = mount(<InputLabel htmlFor="a">{children}</InputLabel>);

    expect(view.container.innerHTML).toBe('');
  });

  it('draws the number 0', () => {
    const view = mount(<InputLabel>{0}</InputLabel>);

    expect(view.container.textContent).toBe('0');
  });

  it('takes its classes and attributes after its own', () => {
    const view = mount(
      <InputLabel className="z-2" id="l" onClick={() => undefined}>
        A
      </InputLabel>,
    );
    const label = first(view.container);

    expect(label.className.endsWith(' z-2')).toBe(true);
    expect(label.id).toBe('l');
  });
});

describe('InputError', () => {
  afterEach(unmountAll);

  it('says the message as an alert, so it is read when it appears', () => {
    const view = mount(<InputError error="Email is not valid" />);
    const message = first(view.container);

    expect(message.getAttribute('role')).toBe('alert');
    expect(message.textContent).toBe('Email is not valid');
  });

  it.each([[''], [undefined]])('draws nothing for %j', (error) => {
    const view = mount(<InputError error={error} />);

    expect(view.container.innerHTML).toBe('');
  });

  it('has an id the field can point at', () => {
    const view = mount(<InputError id="email-error" error="x" />);

    expect(first(view.container).id).toBe('email-error');
  });

  it('draws its icon without a network', () => {
    const view = mount(<InputError error="x" />);

    expect(view.container.querySelector('svg')?.innerHTML.length).toBeGreaterThan(10);
  });

  it('takes its classes after its own, and keeps the lines of a message with several', () => {
    const view = mount(<InputError error={'one\ntwo'} className="mt-2" />);
    const message = first(view.container);

    expect(message.className.endsWith(' mt-2')).toBe(true);
    expect(message.querySelector('span')?.className).toContain('whitespace-pre-line');
  });

  it('is on a server too, as text', () => {
    expect(renderToString(<InputError error="Bad" />)).toContain('Bad');
  });
});

describe('InputIcon', () => {
  afterEach(unmountAll);

  it('draws nothing without an icon', () => {
    const view = mount(<InputIcon />);

    expect(view.container.innerHTML).toBe('');
  });

  it('draws an element as it is', () => {
    const view = mount(<InputIcon icon={<b data-testid="mine">x</b>} />);

    expect(view.container.querySelector('[data-testid="mine"]')?.textContent).toBe('x');
  });

  it('draws an icon of Iconify as a picture that is hidden from assistive technology', () => {
    const view = mount(
      <InputIcon icon={{ icon: 'solar:info-circle-linear', className: 'size-4' }} />,
    );
    const svg = required(view.container.querySelector('svg'), 'the icon');

    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('class')?.split(/\s+/)).toEqual(
      expect.arrayContaining(['shrink-0', 'size-4']),
    );
    expect(view.container.querySelector('button')).toBeNull();
  });

  describe('with an onClick', () => {
    it('is a button with a name, and the icon inside it', () => {
      const view = mount(
        <InputIcon
          icon={{
            icon: 'solar:info-circle-linear',
            onClick: () => undefined,
            label: 'Show password',
          }}
        />,
      );
      const button = required(view.container.querySelector('button'), 'the button');

      expect(button.type).toBe('button');
      expect(button.getAttribute('aria-label')).toBe('Show password');
      expect(button.querySelector('svg')).not.toBeNull();
    });

    it('calls onClick when it is pressed', () => {
      const onClick = vi.fn();
      const view = mount(
        <InputIcon icon={{ icon: 'solar:info-circle-linear', onClick, label: 'Clear' }} />,
      );

      click(required(view.container.querySelector('button'), 'the button'));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('cannot be pressed while it is disabled', () => {
      const onClick = vi.fn();
      const view = mount(
        <InputIcon
          icon={{ icon: 'solar:info-circle-linear', onClick, label: 'Clear', disabled: true }}
        />,
      );
      const button = required(
        view.container.querySelector<HTMLButtonElement>('button'),
        'the button',
      );

      click(button);

      expect(button.disabled).toBe(true);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('has a ring for the keyboard that is drawn', () => {
      const view = mount(
        <InputIcon
          icon={{ icon: 'solar:info-circle-linear', onClick: () => undefined, label: 'x' }}
        />,
      );
      const classes = required(
        view.container.querySelector('button'),
        'the button',
      ).className.split(/\s+/);

      expect(classes).toContain('focus-visible:outline-2');
      expect(classes).not.toContain('outline-hidden'); // it would hide the ring (see Stepper)
    });

    it('does not put `label` or `disabled` on the picture', () => {
      const view = mount(
        <InputIcon
          icon={{ icon: 'solar:info-circle-linear', onClick: () => undefined, label: 'Clear' }}
        />,
      );
      const svg = required(view.container.querySelector('svg'), 'the icon');

      expect(svg.hasAttribute('label')).toBe(false);
      expect(svg.hasAttribute('onclick')).toBe(false);
    });
  });

  // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest.
  it('does not compile with a button that has no name', () => {
    const check = () => {
      // @ts-expect-error an icon with an onClick is a button: it has to be named
      <InputIcon icon={{ icon: 'solar:info-circle-linear', onClick: () => undefined }} />;
      // @ts-expect-error `label` is for the icons that do something
      <InputIcon icon={{ icon: 'solar:info-circle-linear', label: 'x' }} />;
    };

    expect(check).toBeTypeOf('function');
  });
});
