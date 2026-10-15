// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { click, required } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { type IRadio, Radio } from './Radio.js';

const OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

const radiosOf = (container: HTMLElement) => [...container.querySelectorAll('input')];
const marker = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[aria-hidden="true"]');

describe('Radio', () => {
  afterEach(unmountAll);

  describe('the group', () => {
    it('is a radio group with a name, and each option is a radio', () => {
      const view = mount(
        <Radio value="male" onChange={vi.fn()} options={OPTIONS} label="Gender" />,
      );
      const group = required(view.container.querySelector('[role="radiogroup"]'), 'the group');

      expect(group.getAttribute('aria-label')).toBe('Gender');
      expect(radiosOf(view.container).map((radio) => radio.type)).toEqual([
        'radio',
        'radio',
        'radio',
      ]);
      expect(view.container.textContent).toBe('MaleFemaleOther');
    });

    it('has no name of its own when it is not given one', () => {
      const view = mount(<Radio value="male" onChange={vi.fn()} options={OPTIONS} />);

      expect(view.container.querySelector('[role="radiogroup"]')?.hasAttribute('aria-label')).toBe(
        false,
      );
    });

    it('puts every radio of a group in the same group, so the arrow keys move between them', () => {
      const view = mount(<Radio value="male" onChange={vi.fn()} options={OPTIONS} />);
      const names = new Set(radiosOf(view.container).map((radio) => radio.name));

      expect(names.size).toBe(1);
      expect([...names][0]).not.toBe('');
    });

    it('does not mix two groups on one page (they used to share the name "radio")', () => {
      const view = mount(
        <>
          <Radio value="male" onChange={vi.fn()} options={OPTIONS} />
          <Radio value="female" onChange={vi.fn()} options={OPTIONS} />
        </>,
      );
      const [first, , , fourth] = radiosOf(view.container);

      expect(first.name).not.toBe(fourth.name);
    });

    it('uses the name it is given', () => {
      const view = mount(<Radio value="" onChange={vi.fn()} options={OPTIONS} name="gender" />);

      expect(radiosOf(view.container).every((radio) => radio.name === 'gender')).toBe(true);
    });
  });

  describe('the choice', () => {
    it('is the option that has the value', () => {
      const view = mount(<Radio value="female" onChange={vi.fn()} options={OPTIONS} />);

      expect(radiosOf(view.container).map((radio) => radio.checked)).toEqual([false, true, false]);
    });

    it('is none when the value is not one of the options', () => {
      const view = mount(<Radio value="nobody" onChange={vi.fn()} options={OPTIONS} />);

      expect(radiosOf(view.container).some((radio) => radio.checked)).toBe(false);
      expect(marker(view.container)).toBeNull(); // no marker on nothing
    });

    it('is made by a click on an option, which gets its value', () => {
      const onChange = vi.fn();
      const view = mount(<Radio value="male" onChange={onChange} options={OPTIONS} />);

      click(required(radiosOf(view.container)[2], 'the last option'));

      expect(onChange).toHaveBeenCalledWith('other');
    });

    it('is made by a click on the words of an option', () => {
      const onChange = vi.fn();
      const view = mount(<Radio value="male" onChange={onChange} options={OPTIONS} />);
      const words = required([...view.container.querySelectorAll('label')][1], 'the label');

      click(words);

      expect(onChange).toHaveBeenCalledWith('female');
    });

    it('follows the value of the app', () => {
      const Harness = () => {
        const [value, setValue] = useState('male');

        return <Radio value={value} onChange={setValue} options={OPTIONS} />;
      };
      const view = mount(<Harness />);

      click(required(radiosOf(view.container)[1], 'the second'));

      expect(radiosOf(view.container).map((radio) => radio.checked)).toEqual([false, true, false]);
    });

    it('can be any content, not only text', () => {
      const view = mount(
        <Radio
          value="a"
          onChange={vi.fn()}
          options={[
            { label: <b data-testid="bold">Alpha</b>, value: 'a' },
            { label: 'Beta', value: 'b' },
          ]}
        />,
      );

      expect(view.container.querySelector('[data-testid="bold"]')?.textContent).toBe('Alpha');
    });
  });

  describe('the marker', () => {
    it('is as wide as an option and moves to the chosen one', () => {
      const view = mount(<Radio value="other" onChange={vi.fn()} options={OPTIONS} />);
      const bar = required(marker(view.container), 'the marker');

      expect(bar.style.width).toBe(`${String(100 / 3)}%`);
      expect(bar.style.transform).toBe('translateX(200%)');
    });

    it('is on the first option for the first value', () => {
      const view = mount(<Radio value="male" onChange={vi.fn()} options={OPTIONS} />);

      expect(marker(view.container)?.style.transform).toBe('translateX(0%)');
    });

    it('does not move for a person who asked for less motion', () => {
      const view = mount(<Radio value="male" onChange={vi.fn()} options={OPTIONS} />);

      expect(marker(view.container)?.className.split(/\s+/)).toContain(
        'motion-reduce:transition-none',
      );
    });
  });

  describe('disabled', () => {
    it('disables every radio, which cannot be chosen', () => {
      const onChange = vi.fn();
      const view = mount(<Radio value="male" onChange={onChange} options={OPTIONS} disabled />);

      expect(radiosOf(view.container).every((radio) => radio.disabled)).toBe(true);

      click(required(radiosOf(view.container)[1], 'the second'));

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('the error', () => {
    it('marks the group as invalid and describes it by the message, which is an alert', () => {
      const view = mount(
        <Radio value="" onChange={vi.fn()} options={OPTIONS} error="Choose one" label="Gender" />,
      );
      const group = required(view.container.querySelector('[role="radiogroup"]'), 'the group');
      const message = required(view.container.querySelector('[role="alert"]'), 'the message');

      expect(group.getAttribute('aria-invalid')).toBe('true');
      expect(group.getAttribute('aria-describedby')).toBe(message.id);
    });

    it('says nothing without a message', () => {
      const view = mount(<Radio value="" onChange={vi.fn()} options={OPTIONS} />);
      const group = required(view.container.querySelector('[role="radiogroup"]'), 'the group');

      expect(group.hasAttribute('aria-invalid')).toBe(false);
      expect(group.hasAttribute('aria-describedby')).toBe(false);
    });
  });

  describe('its looks', () => {
    it('takes its classes where they belong', () => {
      const view = mount(
        <Radio
          value=""
          onChange={vi.fn()}
          options={OPTIONS}
          className="bar"
          containerClassName="wrap"
        />,
      );

      expect(view.container.firstElementChild?.className).toContain('wrap');
      expect(view.container.querySelector('[role="radiogroup"]')?.className).toContain('bar');
    });

    it('shows a ring that is drawn around the option that has the keyboard', () => {
      const view = mount(<Radio value="" onChange={vi.fn()} options={OPTIONS} />);
      const label = required(view.container.querySelector('label'), 'an option');

      expect(label.className.split(/\s+/)).toContain('has-focus-visible:outline-2');
      expect(label.className.split(/\s+/)).not.toContain('outline-hidden');
    });

    it('makes the chosen one bold', () => {
      const view = mount(<Radio value="female" onChange={vi.fn()} options={OPTIONS} />);
      const [male, female] = [...view.container.querySelectorAll('label')];

      expect(female.className).toContain('font-semibold');
      expect(male.className).not.toContain('font-semibold');
    });
  });

  it('is the same in StrictMode', () => {
    const view = mount(<Radio value="male" onChange={vi.fn()} options={OPTIONS} />, {
      strict: true,
    });

    expect(radiosOf(view.container)).toHaveLength(3);
  });

  it('does not divide by zero when there are no options', () => {
    const view = mount(<Radio value="" onChange={vi.fn()} options={[]} />);

    expect(radiosOf(view.container)).toHaveLength(0);
    expect(marker(view.container)).toBeNull();
  });

  // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest.
  it('does not compile without a value, a way to change it or the options', () => {
    const check = () => {
      const props: IRadio = { value: 'a', onChange: () => undefined, options: [] };

      // @ts-expect-error the value of the choice is needed
      <Radio onChange={props.onChange} options={props.options} />;
      // @ts-expect-error and a way to hear a choice
      <Radio value="a" options={[]} />;
      // @ts-expect-error the value of an option is text
      <Radio value="a" onChange={() => undefined} options={[{ label: 'x', value: 1 }]} />;
    };

    expect(check).toBeTypeOf('function');
  });
});
