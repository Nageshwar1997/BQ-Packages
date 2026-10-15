// @vitest-environment jsdom
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { focus, labelsOf, required, typeInto } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import type { IFieldRegistration } from './types.js';
import { Textarea } from './Textarea.js';

const areaOf = (container: HTMLElement) =>
  required(container.querySelector('textarea'), 'the textarea');

const registration = (): IFieldRegistration<HTMLTextAreaElement> => ({
  name: 'notes',
  onChange: vi.fn(() => Promise.resolve()),
  onBlur: vi.fn(() => Promise.resolve()),
  ref: vi.fn(),
});

describe('Textarea', () => {
  afterEach(unmountAll);

  it('is five rows tall unless it is told another height', () => {
    const plain = mount(<Textarea textAreaProps={{ name: 'a' }} />);
    const tall = mount(<Textarea textAreaProps={{ name: 'b', rows: 12 }} />);

    expect(areaOf(plain.container).rows).toBe(5);
    expect(areaOf(tall.container).rows).toBe(12);
  });

  it('has a label that is its name, tied to it through the id', () => {
    const view = mount(<Textarea label="Notes" textAreaProps={{ name: 'notes' }} />);
    const area = areaOf(view.container);

    expect(area.id).toBe('notes');
    expect(labelsOf(area).at(0)?.textContent).toBe('Notes');
  });

  it('is invalid and described by the message while there is an error', () => {
    const view = mount(
      <Textarea label="Notes" error="Too short" textAreaProps={{ name: 'notes' }} />,
    );
    const area = areaOf(view.container);
    const message = required(view.container.querySelector('[role="alert"]'), 'the message');

    expect(area.getAttribute('aria-invalid')).toBe('true');
    expect(area.getAttribute('aria-describedby')).toBe(message.id);
    expect(message.textContent).toBe('Too short');
  });

  it('says nothing about errors without a message', () => {
    const view = mount(<Textarea textAreaProps={{ name: 'notes' }} />);

    expect(areaOf(view.container).hasAttribute('aria-invalid')).toBe(false);
    expect(view.container.querySelector('[role="alert"]')).toBeNull();
  });

  it('calls onChange and onBlur of textAreaProps and of register', () => {
    const registered = registration();
    const onChange = vi.fn();
    const onBlur = vi.fn();
    const view = mount(
      <Textarea register={registered} textAreaProps={{ name: 'notes', onChange, onBlur }} />,
    );
    const area = areaOf(view.container);

    typeInto(area, 'hello');
    focus(area);
    area.blur();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(registered.onChange).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(registered.onBlur).toHaveBeenCalledTimes(1);
  });

  it('hears nothing while it is disabled', () => {
    const onChange = vi.fn();
    const view = mount(<Textarea textAreaProps={{ name: 'a', onChange, disabled: true }} />);

    typeInto(areaOf(view.container), 'x');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('gives the textarea to the ref of `register` and to `ref`, and puts the cursor in it with needRef', () => {
    const registered = registration();
    const ref = createRef<HTMLTextAreaElement>();
    const view = mount(
      <Textarea register={registered} ref={ref} needRef textAreaProps={{ name: 'notes' }} />,
    );
    const area = areaOf(view.container);

    expect(registered.ref).toHaveBeenCalledWith(area);
    expect(ref.current).toBe(area);
    expect(document.activeElement).toBe(area);
  });

  it('goes tall with the user: it can be resized up and down', () => {
    const view = mount(<Textarea textAreaProps={{ name: 'a' }} />);

    expect(areaOf(view.container).className.split(/\s+/)).toContain('resize-y');
  });

  it('puts the classes where they belong, after its own', () => {
    const view = mount(
      <Textarea
        className="box-class"
        containerClassName="container-class"
        textAreaProps={{ name: 'a', className: 'area-class' }}
      />,
    );
    const area = areaOf(view.container);

    expect(view.container.firstElementChild?.className).toContain('container-class');
    expect(area.parentElement?.className).toContain('box-class');
    expect(area.className).toContain('area-class');
  });

  it('shows the value it is given', () => {
    const view = mount(
      <Textarea textAreaProps={{ name: 'a', value: 'some notes', onChange: () => undefined }} />,
    );

    expect(areaOf(view.container).value).toBe('some notes');
  });
});
