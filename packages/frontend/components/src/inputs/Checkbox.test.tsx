// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { click, labelsOf, required } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { Checkbox } from './Checkbox.js';
import type { IFieldRegistration } from './types.js';

const inputOf = (container: HTMLElement) =>
  required(container.querySelector('input'), 'the switch');

const registration = (): IFieldRegistration => ({
  name: 'terms',
  onChange: vi.fn(() => Promise.resolve()),
  onBlur: vi.fn(() => Promise.resolve()),
  ref: vi.fn(),
});

describe('Checkbox', () => {
  afterEach(unmountAll);

  describe('as a switch', () => {
    it('is a checkbox that says it is a switch', () => {
      const view = mount(<Checkbox checkboxProps={{ name: 'terms' }} />);
      const input = inputOf(view.container);

      expect(input.type).toBe('checkbox');
      expect(input.getAttribute('role')).toBe('switch');
    });

    it('cannot be made another type', () => {
      const view = mount(
        <Checkbox checkboxProps={{ name: 'terms', ...({ type: 'text' } as object) }} />,
      );

      expect(inputOf(view.container).type).toBe('checkbox');
    });

    it('is switched by a click on it, and tells the app', () => {
      const onChange = vi.fn();
      const view = mount(<Checkbox checkboxProps={{ name: 'terms', onChange }} />);
      const input = inputOf(view.container);

      click(input);

      expect(input.checked).toBe(true);
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('is switched by a click on the track', () => {
      const view = mount(<Checkbox checkboxProps={{ name: 'terms' }} />);
      const track = required(view.container.querySelector('label'), 'the track');

      click(track);

      expect(inputOf(view.container).checked).toBe(true);
    });

    it('shows the state it is given', () => {
      const view = mount(
        <Checkbox checkboxProps={{ name: 'terms', checked: true, onChange: () => undefined }} />,
      );

      expect(inputOf(view.container).checked).toBe(true);
    });

    it('draws its track as decoration, for assistive technology to skip', () => {
      const view = mount(<Checkbox checkboxProps={{ name: 'terms' }} />);

      expect(view.container.querySelector('span[aria-hidden="true"]')).not.toBeNull();
    });

    it('has a ring for the keyboard that is drawn, and does not move for a person who asked for less motion', () => {
      const view = mount(<Checkbox checkboxProps={{ name: 'terms' }} />);
      const track = required(view.container.querySelector('span[aria-hidden="true"]'), 'the track');
      const classes = track.className.split(/\s+/);

      expect(classes).toContain('peer-focus-visible:outline-2');
      expect(classes).not.toContain('outline-hidden');
      expect(classes).toContain('motion-reduce:transition-none');
    });
  });

  describe('the words', () => {
    it('are the label of the switch: they name it, and a click on them switches it', () => {
      const view = mount(<Checkbox content="Remember me" checkboxProps={{ name: 'remember' }} />);
      const input = inputOf(view.container);
      const words = labelsOf(input).find((label) => label.textContent === 'Remember me');

      expect(words).toBeDefined();

      click(required(words, 'the words'));

      expect(input.checked).toBe(true);
    });

    it('can be an element, with a link in it', () => {
      const view = mount(
        <Checkbox
          content={
            <>
              I accept the <a href="/terms">terms</a>
            </>
          }
          checkboxProps={{ name: 'terms' }}
        />,
      );

      expect(view.container.querySelector('a')?.getAttribute('href')).toBe('/terms');
      expect(labelsOf(inputOf(view.container)).at(1)?.textContent).toBe('I accept the terms');
    });

    it.each([[undefined], [null], [''], [false]])('are not drawn when they are %j', (content) => {
      const view = mount(<Checkbox content={content} checkboxProps={{ name: 'terms' }} />);

      expect(labelsOf(inputOf(view.container))).toHaveLength(1); // only the track
    });
  });

  describe('the error', () => {
    it('makes the switch invalid, described by the message, which is an alert', () => {
      const view = mount(<Checkbox error="You have to accept" checkboxProps={{ name: 'terms' }} />);
      const input = inputOf(view.container);
      const message = required(view.container.querySelector('[role="alert"]'), 'the message');

      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toBe(message.id);
    });

    it('says nothing without a message', () => {
      const view = mount(<Checkbox checkboxProps={{ name: 'terms' }} />);

      expect(inputOf(view.container).hasAttribute('aria-invalid')).toBe(false);
    });
  });

  describe('what it hears', () => {
    it('calls onChange of register and of checkboxProps', () => {
      const registered = registration();
      const onChange = vi.fn();
      const view = mount(
        <Checkbox register={registered} checkboxProps={{ name: 'terms', onChange }} />,
      );

      click(inputOf(view.container));

      expect(registered.onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('calls onBlur of register and of checkboxProps', () => {
      const registered = registration();
      const onBlur = vi.fn();
      const view = mount(
        <Checkbox register={registered} checkboxProps={{ name: 'terms', onBlur }} />,
      );
      const input = inputOf(view.container);

      input.focus();
      input.blur();

      expect(registered.onBlur).toHaveBeenCalledTimes(1);
      expect(onBlur).toHaveBeenCalledTimes(1);
    });

    it('hears nothing while it is disabled', () => {
      const registered = registration();
      const onChange = vi.fn();
      const view = mount(
        <Checkbox
          register={registered}
          checkboxProps={{ name: 'terms', onChange, disabled: true }}
        />,
      );

      click(inputOf(view.container));

      expect(onChange).not.toHaveBeenCalled();
      expect(registered.onChange).not.toHaveBeenCalled();
    });

    it('gives the input to the ref of `register`', () => {
      const registered = registration();
      const view = mount(<Checkbox register={registered} checkboxProps={{ name: 'terms' }} />);

      expect(registered.ref).toHaveBeenCalledWith(inputOf(view.container));
    });
  });

  describe('the label of the id', () => {
    it('uses the id, then the name, then one made here', () => {
      const withId = mount(<Checkbox content="A" checkboxProps={{ id: 'my-id', name: 'x' }} />);
      const withName = mount(<Checkbox content="A" checkboxProps={{ name: 'the-name' }} />);
      const neither = mount(<Checkbox content="A" checkboxProps={{}} />);

      expect(inputOf(withId.container).id).toBe('my-id');
      expect(inputOf(withName.container).id).toBe('the-name');
      expect(inputOf(neither.container).id).not.toBe('');
      expect(labelsOf(inputOf(neither.container)).at(1)?.textContent).toBe('A');
    });
  });

  describe('the tooltip', () => {
    it('is not there unless it is asked for, even when the pointer is over the switch', () => {
      const view = mount(
        <Checkbox checkboxProps={{ name: 'terms' }} tooltip={{ title: 'Hint' }} />,
      );

      hover(required(view.container.querySelector('label'), 'the track'));

      expect(document.querySelector('[role="tooltip"]')).toBeNull();
    });

    it('opens on the switch when it is required', () => {
      const view = mount(
        <Checkbox checkboxProps={{ name: 'terms' }} tooltip={{ title: 'Hint', required: true }} />,
      );

      hover(required(view.container.querySelector('label'), 'the track'));

      expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('Hint');
    });
  });

  it('takes its classes where they belong', () => {
    const view = mount(
      <Checkbox
        className="track-class"
        containerClassName="container-class"
        checkboxProps={{ name: 'a' }}
      />,
    );

    expect(view.container.firstElementChild?.className).toContain('container-class');
    expect(view.container.querySelector('span[aria-hidden="true"]')?.className).toContain(
      'track-class',
    );
  });
});

// The tooltip opens on the pointer entering what it wraps.
const hover = (element: Element) => {
  act(() => {
    element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  });
};
