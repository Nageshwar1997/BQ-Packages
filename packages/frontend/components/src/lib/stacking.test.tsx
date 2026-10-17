// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ColorInput } from '../color-input/ColorInput.js';
import { HierarchySelect } from '../hierarchy-select/HierarchySelect.js';
import { Select } from '../inputs/Select.js';
import { ModalWrapper } from '../layout/ModalWrapper.js';
import { click, installResizeObserver, required } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';

/*
 * A field that opens a list draws it in the body (so no parent can cut it), and so the list is not in
 * the stacking of the modal its field is in: it is above the modal only if its own `z` says so. The
 * modal is `z-100`; the toasts are `z-999`. The list has a small `z-` of its own (`z-3`) and the app
 * that has a field in a modal raises it with the class name it can give (`optionsClassName`, and
 * `pickerClassName` for the colour picker): this is what that gives, and what it does not.
 */

/** The `z-` that applies: when a class name has two, Tailwind writes the bigger one last (see `z-order.test`). */
const zOf = (element: Element) => {
  const all = [...element.className.matchAll(/(?:^|\s)z-(\d+)(?=\s|$)/g)].map((match) =>
    Number(match[1]),
  );

  return all.length === 0 ? Number.NaN : Math.max(...all);
};

interface IFieldProps {
  /** The classes the app gives to the list. */
  raise?: string;
}

const Fields = {
  Select: ({ raise }: IFieldProps) => {
    const [value, setValue] = useState<string | number>('');

    return (
      <Select
        label="Fruit"
        options={[{ label: 'Apple', value: 'apple' }]}
        selectProps={{ value, onChange: setValue }}
        optionsClassName={raise}
      />
    );
  },
  HierarchySelect: ({ raise }: IFieldProps) => {
    const [value, setValue] = useState<string | number>('');

    return (
      <HierarchySelect
        label="Category"
        options={[{ label: 'Skin', value: 'skin' }]}
        selectProps={{ value, onChange: setValue }}
        optionsClassName={raise}
      />
    );
  },
  ColorInput: ({ raise }: IFieldProps) => {
    const [value, setValue] = useState<string | undefined>(undefined);

    return <ColorInput label="Colour" value={value} onChange={setValue} pickerClassName={raise} />;
  },
};

describe.each(Object.entries(Fields))('the list of the %s of a modal', (_name, Field) => {
  beforeEach(() => {
    // the colour picker watches its size
    installResizeObserver();
  });

  afterEach(() => {
    unmountAll();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  /** A field in a modal, opened: the backdrop of the modal and the list, which is fixed in the body. */
  const openInModal = (raise?: string) => {
    mount(
      <ModalWrapper isOpen onClose={() => undefined} label="Fixture">
        <Field raise={raise} />
      </ModalWrapper>,
    );

    const dialog = required(document.querySelector('[role="dialog"]'), 'the modal');
    const backdrop = required(dialog.parentElement, 'the backdrop of the modal');

    click(required(dialog.querySelector('button[aria-haspopup]'), 'the field'));

    // the layers that are fixed in the body and are not the modal (or in it): the list
    const lists = [...document.body.querySelectorAll<HTMLElement>('.fixed')].filter(
      (layer) => layer !== backdrop && !backdrop.contains(layer),
    );

    expect(lists).toHaveLength(1);

    return { backdrop, list: required(lists[0], 'the list') };
  };

  it('is above the modal when the app gives it a `z-` above the modal (z-110)', () => {
    const { backdrop, list } = openInModal('z-110');

    expect(zOf(backdrop)).toBe(100);
    expect(list.className).toContain('z-110');
    expect(zOf(list)).toBeGreaterThan(zOf(backdrop));
  });

  it('keeps the other classes the app gives it', () => {
    const { list } = openInModal('z-110 w-80');

    expect(list.className).toContain('w-80');
  });

  it('is not above the modal when the app gives it nothing: that is for the app to ask for', () => {
    const { backdrop, list } = openInModal();

    expect(zOf(list)).toBeLessThan(zOf(backdrop));
  });

  it('is below the toasts (z-999) with the `z-` that is asked for in the documentation, which have to stay on top of everything', () => {
    mount(<Field raise="z-110" />);
    click(required(document.querySelector('button[aria-haspopup]'), 'the field'));

    const list = required(
      [...document.body.querySelectorAll<HTMLElement>('.fixed')][0],
      'the list',
    );

    expect(zOf(list)).toBeLessThan(999);
  });
});
