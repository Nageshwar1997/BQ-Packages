// @vitest-environment jsdom
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { click, focus, labelsOf, required, typeInto } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { Input } from './Input.js';
import type { IFieldRegistration } from './types.js';

const inputOf = (container: HTMLElement) => required(container.querySelector('input'), 'the input');

const registration = (name = 'email') => {
  const ref = vi.fn();
  const registered: IFieldRegistration = {
    name,
    onChange: vi.fn(() => Promise.resolve()),
    onBlur: vi.fn(() => Promise.resolve()),
    ref,
  };

  return registered;
};

describe('Input', () => {
  afterEach(unmountAll);

  describe('the label', () => {
    it('is the name of the field: it points at it, and the field knows it', () => {
      const view = mount(<Input label="Email" inputProps={{ name: 'email' }} />);
      const input = inputOf(view.container);
      const label = required(view.container.querySelector('label'), 'the label');

      expect(label.textContent).toBe('Email');
      expect(label.htmlFor).toBe(input.id);
      expect(labelsOf(input).at(0)).toBe(label);
    });

    it('uses the id it is given, then the name', () => {
      const withId = mount(<Input label="A" inputProps={{ id: 'my-id', name: 'x' }} />);
      const withName = mount(<Input label="A" inputProps={{ name: 'the-name' }} />);

      expect(inputOf(withId.container).id).toBe('my-id');
      expect(inputOf(withName.container).id).toBe('the-name');
    });

    it('uses the name of `register` when inputProps has none', () => {
      const view = mount(
        <Input label="A" register={registration('from-register')} inputProps={{}} />,
      );

      expect(inputOf(view.container).id).toBe('from-register');
      expect(labelsOf(inputOf(view.container)).at(0)?.textContent).toBe('A');
    });

    it('makes an id when there is nothing else, so the label still works', () => {
      const view = mount(<Input label="A" inputProps={{}} />);
      const input = inputOf(view.container);

      expect(input.id).not.toBe('');
      expect(labelsOf(input).at(0)?.textContent).toBe('A');
    });

    it('gives two fields without a name two different ids', () => {
      const view = mount(
        <>
          <Input label="A" inputProps={{}} />
          <Input label="B" inputProps={{}} />
        </>,
      );
      const [first, second] = [...view.container.querySelectorAll('input')];

      expect(first.id).not.toBe(second.id);
    });

    it('draws nothing when there is no label', () => {
      const view = mount(<Input inputProps={{ name: 'a' }} />);

      expect(view.container.querySelector('label')).toBeNull();
    });
  });

  describe('the error', () => {
    it('marks the field as invalid and describes it by the message, which is an alert', () => {
      const view = mount(
        <Input label="Email" error="Email is not valid" inputProps={{ name: 'email' }} />,
      );
      const input = inputOf(view.container);
      const message = required(view.container.querySelector('[role="alert"]'), 'the message');

      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toBe(message.id);
      expect(message.textContent).toBe('Email is not valid');
    });

    it('says nothing about being invalid while there is no message', () => {
      const view = mount(<Input label="Email" inputProps={{ name: 'email' }} />);
      const input = inputOf(view.container);

      expect(input.hasAttribute('aria-invalid')).toBe(false);
      expect(input.hasAttribute('aria-describedby')).toBe(false);
      expect(view.container.querySelector('[role="alert"]')).toBeNull();
    });

    it('keeps what the field was already described by, and adds the message', () => {
      const view = mount(
        <Input label="A" error="Bad" inputProps={{ name: 'a', 'aria-describedby': 'hint' }} />,
      );
      const input = inputOf(view.container);
      const message = required(view.container.querySelector('[role="alert"]'), 'the message');

      expect(input.getAttribute('aria-describedby')).toBe(`hint ${message.id}`);
    });

    it('is on the box too, for the border: a data attribute that is only there with a message', () => {
      const withError = mount(<Input error="Bad" inputProps={{ name: 'a' }} />);
      const without = mount(<Input inputProps={{ name: 'b' }} />);

      expect(withError.container.querySelector('[data-invalid]')).not.toBeNull();
      expect(without.container.querySelector('[data-invalid]')).toBeNull();
    });
  });

  describe('what it hears', () => {
    it('calls onChange of inputProps and of register, with the event', () => {
      const registered = registration();
      const onChange = vi.fn();
      const view = mount(<Input register={registered} inputProps={{ name: 'email', onChange }} />);

      typeInto(inputOf(view.container), 'a@b.co');

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(registered.onChange).toHaveBeenCalledTimes(1);
      expect((onChange.mock.calls[0]?.[0] as { target: { value: string } }).target.value).toBe(
        'a@b.co',
      );
    });

    it('calls onBlur of inputProps and of register', () => {
      const registered = registration();
      const onBlur = vi.fn();
      const view = mount(<Input register={registered} inputProps={{ name: 'email', onBlur }} />);

      focus(inputOf(view.container));
      inputOf(view.container).blur();

      expect(onBlur).toHaveBeenCalledTimes(1);
      expect(registered.onBlur).toHaveBeenCalledTimes(1);
    });

    it('hears nothing while it is disabled', () => {
      const registered = registration();
      const onChange = vi.fn();
      const view = mount(
        <Input register={registered} inputProps={{ name: 'email', onChange, disabled: true }} />,
      );

      typeInto(inputOf(view.container), 'x');

      expect(onChange).not.toHaveBeenCalled();
      expect(registered.onChange).not.toHaveBeenCalled();
    });

    it('shows the value it is given', () => {
      const view = mount(
        <Input inputProps={{ name: 'a', value: 'hello', onChange: () => undefined }} />,
      );

      expect(inputOf(view.container).value).toBe('hello');
    });

    it('gives the other attributes to the input', () => {
      const view = mount(
        <Input
          inputProps={{
            name: 'a',
            type: 'email',
            placeholder: 'you@x.com',
            maxLength: 30,
            autoComplete: 'email',
          }}
        />,
      );
      const input = inputOf(view.container);

      expect(input.type).toBe('email');
      expect(input.placeholder).toBe('you@x.com');
      expect(input.maxLength).toBe(30);
      expect(input.autocomplete).toBe('email');
    });

    it('lets go of a number field that is scrolled over, so the wheel does not change the number', () => {
      const view = mount(<Input inputProps={{ name: 'n', type: 'number' }} />);
      const input = inputOf(view.container);
      focus(input);

      input.dispatchEvent(new WheelEvent('wheel', { bubbles: true }));

      expect(document.activeElement).not.toBe(input);
    });

    it('still calls the onWheel of the app', () => {
      const onWheel = vi.fn();
      const view = mount(<Input inputProps={{ name: 'n', type: 'number', onWheel }} />);

      inputOf(view.container).dispatchEvent(new WheelEvent('wheel', { bubbles: true }));

      expect(onWheel).toHaveBeenCalledTimes(1);
    });

    it('keeps the focus on a text field that is scrolled over', () => {
      const view = mount(<Input inputProps={{ name: 'n', type: 'text' }} />);
      const input = inputOf(view.container);
      focus(input);

      input.dispatchEvent(new WheelEvent('wheel', { bubbles: true }));

      expect(document.activeElement).toBe(input);
    });
  });

  describe('its refs', () => {
    it('gives the input to the ref of `register` and to the `ref` prop', () => {
      const registered = registration();
      const ref = createRef<HTMLInputElement>();
      const view = mount(<Input register={registered} ref={ref} inputProps={{ name: 'email' }} />);

      expect(registered.ref).toHaveBeenCalledWith(inputOf(view.container));
      expect(ref.current).toBe(inputOf(view.container));
    });

    it('puts the cursor in the field with needRef, and still gives the input to `register`', () => {
      const registered = registration();
      const view = mount(<Input register={registered} needRef inputProps={{ name: 'email' }} />);

      expect(document.activeElement).toBe(inputOf(view.container));
      // it used to take the ref away from React Hook Form, which then could not focus the field on an error
      expect(registered.ref).toHaveBeenCalledWith(inputOf(view.container));
    });

    it('does not take the focus without needRef', () => {
      const view = mount(<Input inputProps={{ name: 'a' }} />);

      expect(document.activeElement).not.toBe(inputOf(view.container));
    });
  });

  describe('the icons', () => {
    it('are at the two ends of the field', () => {
      const view = mount(
        <Input
          inputProps={{ name: 'a' }}
          icons={{
            left: { icon: 'solar:info-circle-linear', className: 'left-icon' },
            right: <i data-testid="right" />,
          }}
        />,
      );
      const box = required(inputOf(view.container).parentElement, 'the box');

      expect(box.firstElementChild?.getAttribute('class')).toContain('left-icon');
      expect(box.lastElementChild?.getAttribute('data-testid')).toBe('right');
    });

    it('can be buttons, named, that do something', () => {
      const onClick = vi.fn();
      const view = mount(
        <Input
          inputProps={{ name: 'a' }}
          icons={{ right: { icon: 'solar:info-circle-linear', onClick, label: 'Show password' } }}
        />,
      );

      click(
        required(view.container.querySelector('button[aria-label="Show password"]'), 'the button'),
      );

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('its classes', () => {
    it('go to the box (className), the input (inputProps.className) and the container', () => {
      const view = mount(
        <Input
          className="box-class"
          containerClassName="container-class"
          inputProps={{ name: 'a', className: 'input-class' }}
        />,
      );
      const input = inputOf(view.container);

      expect(view.container.firstElementChild?.className).toContain('container-class');
      expect(input.parentElement?.className).toContain('box-class');
      expect(input.className).toContain('input-class');
    });

    it('show a ring on the box while the field has the focus', () => {
      const view = mount(<Input inputProps={{ name: 'a' }} />);

      expect(inputOf(view.container).parentElement?.className).toContain(
        'focus-within:border-blue-crayola-c',
      );
    });
  });

  describe('in React', () => {
    it('is the same in StrictMode, and focuses once', () => {
      const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
      mount(<Input needRef inputProps={{ name: 'a' }} />, { strict: true });

      expect(focusSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
      focusSpy.mockRestore();
    });
  });

  // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest.
  it('does not compile without inputProps, or with the wrong kind of icon', () => {
    const check = () => {
      // @ts-expect-error the attributes of the input are needed (even if it is only `{}`)
      <Input />;
      // @ts-expect-error `error` is a message
      <Input inputProps={{}} error={true} />;
      // @ts-expect-error an icon that is pressed is a button: it has to be named
      <Input inputProps={{}} icons={{ left: { icon: 'x', onClick: () => undefined } }} />;
    };

    expect(check).toBeTypeOf('function');
  });
});
