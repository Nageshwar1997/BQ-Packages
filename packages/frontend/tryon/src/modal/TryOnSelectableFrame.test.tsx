// @vitest-environment jsdom
import type { TTryOnSelection } from '@beautinique/frontend-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { click, required } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import TryOnApplyBar from './TryOnApplyBar.js';
import TryOnSelectableFrame from './TryOnSelectableFrame.js';

const buttonNamed = (name: string) =>
  required(
    [...document.querySelectorAll('button')].find((button) => button.textContent === name),
    `the button ${name}`,
  );

describe('TryOnApplyBar', () => {
  afterEach(() => {
    unmountAll();
  });

  it('has a Cancel and an Apply', () => {
    mount(<TryOnApplyBar onCancel={vi.fn()} onApply={vi.fn()} canApply />);

    expect([...document.querySelectorAll('button')].map((button) => button.textContent)).toEqual([
      'Cancel',
      'Apply',
    ]);
  });

  it('cancels with Cancel and applies with Apply, each once', () => {
    const onCancel = vi.fn();
    const onApply = vi.fn();

    mount(<TryOnApplyBar onCancel={onCancel} onApply={onApply} canApply />);

    click(buttonNamed('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onApply).not.toHaveBeenCalled();

    click(buttonNamed('Apply'));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('cannot apply when there is nothing to apply, but can still cancel', () => {
    const onCancel = vi.fn();
    const onApply = vi.fn();

    mount(<TryOnApplyBar onCancel={onCancel} onApply={onApply} canApply={false} />);

    expect(buttonNamed('Apply').disabled).toBe(true);
    expect(buttonNamed('Cancel').disabled).toBe(false);

    click(buttonNamed('Apply'));
    expect(onApply).not.toHaveBeenCalled();

    click(buttonNamed('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('TryOnSelectableFrame', () => {
  const selection: TTryOnSelection = { category: 'LIP', subCategory: 'MATTE' };

  beforeEach(() => {
    window.innerHeight = 900;
  });

  afterEach(() => {
    unmountAll();
    document.body.replaceChildren();
  });

  const frame = (props: Partial<Parameters<typeof TryOnSelectableFrame>[0]> = {}) => (
    <TryOnSelectableFrame
      enabled
      selection={selection}
      onSelect={vi.fn()}
      onCancel={vi.fn()}
      onApply={vi.fn()}
      {...props}
    >
      <p data-testid="try-on">the try-on</p>
    </TryOnSelectableFrame>
  );

  it('is not there when it is not enabled: what the shopper sees is the try-on and nothing else', () => {
    const view = mount(frame({ enabled: false }));

    expect(view.container.innerHTML).toBe('<p data-testid="try-on">the try-on</p>');
    expect(document.querySelector('[role="group"]')).toBeNull();
    expect(document.querySelector('button')).toBeNull();
  });

  it('puts the fields above the try-on and Cancel / Apply under it, when it is enabled', () => {
    mount(frame());

    const parts = [
      ...document.querySelectorAll('[role="group"], [data-testid="try-on"], button:not([role])'),
    ].map((part) =>
      part.getAttribute('role') === 'group'
        ? 'fields'
        : part.textContent === 'the try-on'
          ? 'try-on'
          : part.textContent,
    );

    expect(parts).toEqual(['fields', 'try-on', 'Cancel', 'Apply']);
  });

  it('gives the try-on the room that is left', () => {
    const view = mount(frame());
    const room = required(view.container.querySelector('[data-testid="try-on"]')?.parentElement);

    expect(room.className).toContain('flex-1');
    expect(room.className).toContain('min-h-0');
  });

  it('can apply when there is a selection, and cannot when there is none', () => {
    mount(frame());
    expect(buttonNamed('Apply').disabled).toBe(false);

    unmountAll();
    mount(frame({ selection: undefined }));
    expect(buttonNamed('Apply').disabled).toBe(true);
  });

  it('passes Cancel and Apply to the app', () => {
    const onCancel = vi.fn();
    const onApply = vi.fn();

    mount(frame({ onCancel, onApply }));
    click(buttonNamed('Cancel'));
    click(buttonNamed('Apply'));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('shows what is selected in its fields, and passes a new choice to the app', () => {
    const onSelect = vi.fn();

    mount(frame({ onSelect }));
    expect(document.querySelector('button[role="combobox"]')?.textContent).toContain('Lips');

    click(required(document.querySelector('button[role="combobox"]')));
    click(
      required(
        [...document.querySelectorAll('[role="option"]')].find(
          (option) => option.textContent === 'Hair',
        ),
      ),
    );

    expect(onSelect).toHaveBeenCalledWith({ category: 'HAIR', subCategory: 'COLOR' });
  });
});
