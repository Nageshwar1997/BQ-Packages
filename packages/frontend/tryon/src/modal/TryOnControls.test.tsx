// @vitest-environment jsdom
import { act, createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TRYON_MODE_MAP, TRYON_MODE_OPTIONS } from '../constants/index.js';
import { click, installResizeObserver, keyDown, required } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import BottomButtons from './BottomButtons.js';
import TryOnBottomSheet from './TryOnBottomSheet.js';
import TryOnCompareSlider, { COMPARE_KEY_STEP } from './TryOnCompareSlider.js';
import TryOnDock from './TryOnDock.js';
import TryOnModeSelect from './TryOnModeSelect.js';
import TryOnOverlay from './TryOnOverlay.js';
import TryOnRangeSlider from './TryOnRangeSlider.js';
import TryOnShadeSwatches from './TryOnShadeSwatches.js';
import TryOnSidebar from './TryOnSidebar.js';
import TryOnTopControls from './TryOnTopControls.js';

const buttons = () => [...document.querySelectorAll<HTMLButtonElement>('button')];
const buttonNamed = (name: string) =>
  required(
    buttons().find(
      (button) => button.getAttribute('aria-label') === name || button.textContent === name,
    ),
    `the button ${name}`,
  );

const buttonStartingWith = (text: string) =>
  required(
    buttons().find((button) => button.textContent.startsWith(text)),
    `the button ${text}`,
  );

beforeEach(() => {
  installResizeObserver();
});

afterEach(() => {
  unmountAll();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('TryOnModeSelect', () => {
  it('offers the two ways to try, by name and by what they do', () => {
    mount(<TryOnModeSelect onSelect={vi.fn()} />);

    for (const { title, description } of TRYON_MODE_OPTIONS) {
      expect(document.body.textContent).toContain(title);
      expect(document.body.textContent).toContain(description);
    }
    expect(buttons()).toHaveLength(2);
  });

  it('tells the mode that was chosen', () => {
    const onSelect = vi.fn();

    mount(<TryOnModeSelect onSelect={onSelect} />);
    click(buttonStartingWith('Upload Photo'));
    click(buttonStartingWith('Try it Live'));

    expect(onSelect).toHaveBeenNthCalledWith(1, TRYON_MODE_MAP.UPLOAD);
    expect(onSelect).toHaveBeenNthCalledWith(2, TRYON_MODE_MAP.LIVE);
  });

  it('says that the photos stay in the browser', () => {
    mount(<TryOnModeSelect onSelect={vi.fn()} />);

    expect(document.body.textContent).toContain("aren't uploaded or stored");
  });
});

describe('TryOnShadeSwatches', () => {
  const SHADES = [
    { name: 'Rose', hexColor: '#C2185B' },
    { name: 'Coral', hexColor: '#E8613C' },
  ];
  const swatches = (props: Partial<React.ComponentProps<typeof TryOnShadeSwatches>> = {}) => (
    <TryOnShadeSwatches shades={SHADES} appliedColor={null} onSelect={vi.fn()} {...props} />
  );

  it('shows nothing when the product has no shade', () => {
    const view = mount(swatches({ shades: [] }));

    expect(view.container.innerHTML).toBe('');
  });

  it('says how many shades there are, and asks to tap one while none is applied', () => {
    mount(swatches());

    expect(document.body.textContent).toContain('Shades (2)');
    expect(document.body.textContent).toContain('Tap a shade to apply');
  });

  it('names the shade that is applied', () => {
    mount(swatches({ appliedColor: '#E8613C' }));

    expect(document.body.textContent).toContain('Coral');
    expect(document.body.textContent).not.toContain('Tap a shade to apply');
  });

  it('says what pressing does: apply a shade, or remove the one that is applied', () => {
    mount(swatches({ appliedColor: '#C2185B' }));

    expect(buttons().map((button) => button.getAttribute('aria-label'))).toEqual([
      'Remove Rose',
      'Apply Coral',
    ]);
  });

  it('applies a shade with its colour, and takes the applied one away with null', () => {
    const onSelect = vi.fn();

    mount(swatches({ onSelect, appliedColor: '#C2185B' }));
    click(buttonNamed('Apply Coral'));
    click(buttonNamed('Remove Rose'));

    expect(onSelect).toHaveBeenNthCalledWith(1, '#E8613C');
    expect(onSelect).toHaveBeenNthCalledWith(2, null);
  });

  it('draws each swatch in the colour of its shade', () => {
    mount(swatches());

    expect(buttons().map((button) => button.style.backgroundColor)).toEqual([
      'rgb(194, 24, 91)',
      'rgb(232, 97, 60)',
    ]);
  });

  it('cannot be pressed while it is disabled', () => {
    const onSelect = vi.fn();

    mount(swatches({ onSelect, disabled: true }));
    click(buttonNamed('Apply Rose'));

    expect(buttons().every((button) => button.disabled)).toBe(true);
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('TryOnTopControls', () => {
  const controls = (props: Partial<React.ComponentProps<typeof TryOnTopControls>> = {}) => (
    <TryOnTopControls
      compareProps={{ active: false, disabled: false, onClick: vi.fn() }}
      resetProps={{ disabled: false, onClick: vi.fn() }}
      downloadProps={{ disabled: false, onClick: vi.fn() }}
      fullscreenProps={{ active: false, disabled: false, onClick: vi.fn() }}
      {...props}
    />
  );

  it('is a toolbar with a name', () => {
    mount(controls());

    const toolbar = required(document.querySelector('[role="toolbar"]'));

    expect(toolbar.getAttribute('aria-label')).toBe('Try-On actions');
  });

  it('has the four actions, each with a name and a title', () => {
    mount(controls());

    expect(buttons().map((button) => button.getAttribute('aria-label'))).toEqual([
      'Compare before/after',
      'Reset applied makeup',
      'Download snapshot',
      'Full screen',
    ]);
    expect(buttons().every((button) => button.title === button.getAttribute('aria-label'))).toBe(
      true,
    );
  });

  it('says it is pressed only for the two that stay on (compare, full screen), not for reset and download', () => {
    mount(controls({ compareProps: { active: true, disabled: false, onClick: vi.fn() } }));

    expect(buttonNamed('Compare before/after').getAttribute('aria-pressed')).toBe('true');
    expect(buttonNamed('Full screen').getAttribute('aria-pressed')).toBe('false');
    expect(buttonNamed('Reset applied makeup').hasAttribute('aria-pressed')).toBe(false);
    expect(buttonNamed('Download snapshot').hasAttribute('aria-pressed')).toBe(false);
  });

  it('keeps the same name while it is on: the state is in aria-pressed, not said twice', () => {
    mount(controls({ fullscreenProps: { active: true, disabled: false, onClick: vi.fn() } }));

    expect(buttonNamed('Full screen').getAttribute('aria-pressed')).toBe('true');
  });

  it('has no full screen button where the browser cannot do it', () => {
    mount(controls({ fullscreenProps: undefined }));

    expect(buttons().map((button) => button.getAttribute('aria-label'))).not.toContain(
      'Full screen',
    );
  });

  it('calls the action of the button that is pressed', () => {
    const compare = vi.fn();
    const reset = vi.fn();
    const download = vi.fn();
    const fullscreen = vi.fn();

    mount(
      controls({
        compareProps: { active: false, disabled: false, onClick: compare },
        resetProps: { disabled: false, onClick: reset },
        downloadProps: { disabled: false, onClick: download },
        fullscreenProps: { active: false, disabled: false, onClick: fullscreen },
      }),
    );
    click(buttonNamed('Download snapshot'));
    click(buttonNamed('Reset applied makeup'));

    expect(download).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(compare).not.toHaveBeenCalled();
    expect(fullscreen).not.toHaveBeenCalled();
  });

  it('cannot press what is disabled, one by one', () => {
    const reset = vi.fn();

    mount(
      controls({
        compareProps: { active: false, disabled: true, onClick: vi.fn() },
        resetProps: { disabled: true, onClick: reset },
      }),
    );
    click(buttonNamed('Reset applied makeup'));

    expect(buttonNamed('Compare before/after').disabled).toBe(true);
    expect(buttonNamed('Download snapshot').disabled).toBe(false);
    expect(reset).not.toHaveBeenCalled();
  });
});

describe('TryOnDock', () => {
  const dock = (props: Partial<React.ComponentProps<typeof TryOnDock>> = {}) => (
    <TryOnDock {...props}>
      <p data-testid="inside">the shades</p>
    </TryOnDock>
  );

  it('is open at first, with its handle saying so and pointing at what it opens', () => {
    mount(dock());

    const handle = buttonNamed('Shades');
    const content = required(document.getElementById(handle.getAttribute('aria-controls') ?? ''));

    expect(handle.getAttribute('aria-expanded')).toBe('true');
    expect(content.contains(document.querySelector('[data-testid="inside"]'))).toBe(true);
    expect(content.hasAttribute('inert')).toBe(false);
  });

  it('closes with its handle, and keeps what is in it mounted (nothing loses its state) but out of reach', () => {
    mount(dock());

    click(buttonNamed('Shades'));

    const handle = buttonNamed('Shades');
    const content = required(document.getElementById(handle.getAttribute('aria-controls') ?? ''));

    expect(handle.getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('[data-testid="inside"]')).not.toBeNull();
    expect(content.hasAttribute('inert')).toBe(true);

    click(handle);
    expect(handle.getAttribute('aria-expanded')).toBe('true');
    expect(content.hasAttribute('inert')).toBe(false);
  });

  it('shows the applied colour on the handle only while it is closed', () => {
    const dot = () => document.querySelector<HTMLElement>('button [aria-hidden="true"][style]');

    mount(dock({ appliedColor: '#C2185B' }));
    expect(dot()).toBeNull();

    click(buttonNamed('Shades'));
    expect(dot()?.style.backgroundColor).toBe('rgb(194, 24, 91)');
  });

  it('shows no dot when no colour is applied', () => {
    mount(dock({ appliedColor: null }));
    click(buttonNamed('Shades'));

    expect(document.querySelector('button [aria-hidden="true"][style]')).toBeNull();
  });

  it('is hidden outright while comparing (it would sit on the drag surface), and keeps its state', () => {
    const view = mount(dock({ hidden: true }));

    expect(view.container.firstElementChild?.className).toContain('hidden');

    view.rerender(dock({ hidden: false }));
    expect(view.container.firstElementChild?.className.split(' ')).not.toContain('hidden');
  });
});

describe('TryOnOverlay', () => {
  it('tells what is going on, politely, when nothing is wrong', () => {
    mount(<TryOnOverlay icon="solar:camera-linear" title="Waiting" description="A moment." />);

    const status = required(document.querySelector('[role="status"]'));

    expect(status.textContent).toContain('Waiting');
    expect(status.textContent).toContain('A moment.');
    expect(document.querySelector('[role="alert"]')).toBeNull();
    expect(buttons()).toHaveLength(0);
  });

  it('tells an error at once, as an alert, with a button to try again', () => {
    const onClick = vi.fn();

    mount(
      <TryOnOverlay
        icon="solar:danger-triangle-linear"
        title="Could not start"
        description="Check the camera."
        action={{ label: 'Retry', onClick }}
      />,
    );

    expect(document.querySelector('[role="alert"]')?.textContent).toContain('Could not start');
    expect(document.querySelector('[role="status"]')).toBeNull();

    click(buttonNamed('Retry'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('TryOnBottomSheet', () => {
  const sheet = (props: Partial<React.ComponentProps<typeof TryOnBottomSheet>> = {}) => (
    <TryOnBottomSheet isOpen onClose={vi.fn()} title="Choose a Model" {...props}>
      <button type="button">inside</button>
    </TryOnBottomSheet>
  );
  const dialog = () => required(document.querySelector<HTMLElement>('[role="dialog"]'));

  it('is a dialog that has the name of its title', () => {
    mount(sheet());

    expect(dialog().getAttribute('aria-label')).toBe('Choose a Model');
    expect(dialog().getAttribute('aria-modal')).toBe('true');
  });

  it('is out of reach while it is closed: no Tab stop and nothing for a screen reader', () => {
    mount(sheet({ isOpen: false }));

    expect(dialog().hasAttribute('inert')).toBe(true);
    expect(dialog().getAttribute('aria-modal')).toBe('false');
  });

  it('is within reach when it is open', () => {
    mount(sheet());

    expect(dialog().hasAttribute('inert')).toBe(false);
  });

  it('closes with its close button, and with a press on what is behind it', () => {
    const onClose = vi.fn();

    mount(sheet({ onClose }));
    click(buttonNamed('Close'));
    click(required(document.querySelector('[aria-hidden="true"].fixed')));

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('closes with Escape, and keeps the Escape from closing the whole try-on under it', () => {
    const onClose = vi.fn();
    const reachedPage = vi.fn();

    mount(sheet({ onClose }));
    window.addEventListener('keydown', reachedPage);
    keyDown(document, 'Escape');
    window.removeEventListener('keydown', reachedPage);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(reachedPage).not.toHaveBeenCalled();
  });

  it('does not take Escape while it is closed: it belongs to the try-on then', () => {
    const onClose = vi.fn();
    const reachedPage = vi.fn();

    mount(sheet({ isOpen: false, onClose }));
    window.addEventListener('keydown', reachedPage);
    keyDown(document, 'Escape');
    window.removeEventListener('keydown', reachedPage);

    expect(onClose).not.toHaveBeenCalled();
    expect(reachedPage).toHaveBeenCalledTimes(1);
  });

  it('listens for Escape only while it is open, and stops when it is removed', () => {
    const onClose = vi.fn();
    const view = mount(sheet({ onClose }));

    view.unmount();
    keyDown(document, 'Escape');

    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('BottomButtons', () => {
  const bar = (props: Partial<React.ComponentProps<typeof BottomButtons>> = {}) => (
    <BottomButtons
      mode={TRYON_MODE_MAP.LIVE}
      step="tryon"
      isTryOnReady
      onModeToggle={vi.fn()}
      onModelsClick={vi.fn()}
      {...props}
    />
  );

  it('offers the other mode: upload while it is live, live while it is upload', () => {
    const view = mount(bar({ mode: TRYON_MODE_MAP.LIVE }));
    expect(buttons().map((button) => button.textContent)).toEqual(['Try Upload', 'Models']);

    view.rerender(bar({ mode: TRYON_MODE_MAP.UPLOAD }));
    expect(buttons().map((button) => button.textContent)).toEqual(['Try Live', 'Models']);
  });

  it('switches to the other mode when it is pressed', () => {
    const onModeToggle = vi.fn();

    const view = mount(bar({ mode: TRYON_MODE_MAP.LIVE, onModeToggle }));
    click(buttonNamed('Try Upload'));
    view.rerender(bar({ mode: TRYON_MODE_MAP.UPLOAD, onModeToggle }));
    click(buttonNamed('Try Live'));

    expect(onModeToggle).toHaveBeenNthCalledWith(1, TRYON_MODE_MAP.UPLOAD);
    expect(onModeToggle).toHaveBeenNthCalledWith(2, TRYON_MODE_MAP.LIVE);
  });

  it('opens the sheet of models', () => {
    const onModelsClick = vi.fn();

    mount(bar({ onModelsClick }));
    click(buttonNamed('Models'));

    expect(onModelsClick).toHaveBeenCalledWith('models');
  });

  it('cannot open the models while the try-on is not ready yet (there is nothing to put them on)', () => {
    const onModelsClick = vi.fn();

    mount(bar({ onModelsClick, step: 'tryon', isTryOnReady: false }));
    click(buttonNamed('Models'));

    expect(buttonNamed('Models').disabled).toBe(true);
    expect(onModelsClick).not.toHaveBeenCalled();
  });

  it.each(['select', 'instructions'] as const)(
    'can open the models at the step %s, ready or not',
    (step) => {
      mount(bar({ step, isTryOnReady: false }));

      expect(buttonNamed('Models').disabled).toBe(false);
    },
  );
});

describe('TryOnRangeSlider', () => {
  const slider = (props: Partial<React.ComponentProps<typeof TryOnRangeSlider>> = {}) => (
    <TryOnRangeSlider value={0.5} min={0} max={1} color="#C2185B" onChange={vi.fn()} {...props} />
  );
  const input = () =>
    required(document.querySelector<HTMLInputElement>('input[type="range"]'), 'the slider');

  it('is a slider with a name, between the bounds it was given', () => {
    mount(slider({ value: 0.4, min: 0.2, max: 0.8 }));

    expect(input().getAttribute('aria-label')).toBe('Shade intensity');
    expect(input().min).toBe('0.2');
    expect(input().max).toBe('0.8');
    expect(input().value).toBe('0.4');
  });

  it('shows the position as a plain 0-100 reading, however the bounds of the finish are tuned', () => {
    const view = mount(slider({ value: 0.2, min: 0.2, max: 0.8 }));
    expect(document.body.textContent).toContain('0%');

    view.rerender(slider({ value: 0.5, min: 0.2, max: 0.8 }));
    expect(document.body.textContent).toContain('50%');

    view.rerender(slider({ value: 0.8, min: 0.2, max: 0.8 }));
    expect(document.body.textContent).toContain('100%');
  });

  it('reads 0% when the bounds are the same number (nothing to divide by)', () => {
    mount(slider({ value: 0.5, min: 0.5, max: 0.5 }));

    expect(document.body.textContent).toContain('0%');
  });

  it('gives the new value as a number', () => {
    const onChange = vi.fn();

    mount(slider({ onChange }));
    act(() => {
      const target = input();
      // the value is set the way a person's input does it, so React sees the change
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
        target,
        '0.75',
      );
      target.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledWith(0.75);
  });

  it('is painted with the colour of the shade, from none to all of it', () => {
    mount(slider({ color: '#C2185B' }));

    // from none of it to all of it (jsdom writes the colours as rgba)
    expect(input().style.background).toContain('rgba(194, 24, 91, 0)');
    expect(input().style.background).toContain('rgb(194, 24, 91)');
  });

  it('cannot be moved while it is disabled', () => {
    mount(slider({ disabled: true }));

    expect(input().disabled).toBe(true);
  });
});

describe('TryOnCompareSlider', () => {
  let frames: FrameRequestCallback[] = [];

  beforeEach(() => {
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback);

      return frames.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  const flush = () => {
    const pending = frames;

    frames = [];
    act(() => {
      for (const frame of pending) frame(0);
    });
  };

  const slider = (onDrag = vi.fn(), canvas: HTMLCanvasElement | null = null) => {
    mount(<TryOnCompareSlider canvas={canvas} onDrag={onDrag} />);

    return required(document.querySelector<HTMLElement>('[role="slider"]'), 'the slider');
  };
  const now = (element: HTMLElement) => Number(element.getAttribute('aria-valuenow'));

  describe('for assistive technology', () => {
    it('is a slider with a name, from 0 to 100, in the middle at first', () => {
      const element = slider();

      expect(element.getAttribute('aria-label')).toBe('Compare before and after');
      expect(element.getAttribute('aria-orientation')).toBe('horizontal');
      expect(element.getAttribute('aria-valuemin')).toBe('0');
      expect(element.getAttribute('aria-valuemax')).toBe('100');
      expect(now(element)).toBe(50);
      expect(element.getAttribute('aria-valuetext')).toBe('50% before, 50% after');
      expect(element.tabIndex).toBe(0);
    });
  });

  describe('with the keyboard', () => {
    it('moves with the arrows, and tells the app after the next frame', () => {
      const onDrag = vi.fn();
      const element = slider(onDrag);

      keyDown(element, 'ArrowRight');
      expect(now(element)).toBe(55);
      expect(onDrag).not.toHaveBeenCalled(); // the redraw is for the next frame

      flush();
      expect(onDrag).toHaveBeenCalledTimes(1);
      expect(onDrag).toHaveBeenCalledWith(0.5 + COMPARE_KEY_STEP);

      keyDown(element, 'ArrowLeft');
      keyDown(element, 'ArrowLeft');
      expect(now(element)).toBe(45);
    });

    it('moves up and down like right and left', () => {
      const element = slider();

      keyDown(element, 'ArrowUp');
      expect(now(element)).toBe(55);
      keyDown(element, 'ArrowDown');
      keyDown(element, 'ArrowDown');
      expect(now(element)).toBe(45);
    });

    it('goes four times as far with Shift, and twice with Page Up and Page Down', () => {
      const element = slider();

      keyDown(element, 'ArrowRight', { shiftKey: true });
      expect(now(element)).toBe(70);

      keyDown(element, 'PageDown');
      expect(now(element)).toBe(60);

      keyDown(element, 'PageUp');
      keyDown(element, 'PageUp');
      expect(now(element)).toBe(80);
    });

    it('goes to the ends with Home and End, and stops there', () => {
      const element = slider();

      keyDown(element, 'End');
      expect(now(element)).toBe(100);
      keyDown(element, 'ArrowRight');
      expect(now(element)).toBe(100);

      keyDown(element, 'Home');
      expect(now(element)).toBe(0);
      keyDown(element, 'ArrowLeft', { shiftKey: true });
      expect(now(element)).toBe(0);
    });

    it('gives the position in the text for a screen reader', () => {
      const element = slider();

      keyDown(element, 'Home');

      expect(element.getAttribute('aria-valuetext')).toBe('0% before, 100% after');
    });

    it('keeps the key from scrolling the page for the keys it takes, and leaves the others alone', () => {
      const element = slider();
      const taken = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
      });
      const left = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });

      act(() => {
        element.dispatchEvent(taken);
        element.dispatchEvent(left);
      });

      expect(taken.defaultPrevented).toBe(true);
      expect(left.defaultPrevented).toBe(false);
      expect(now(element)).toBe(55);
    });

    it('tells the app once for a run of keys in the same frame, with the latest position', () => {
      const onDrag = vi.fn();
      const element = slider(onDrag);

      keyDown(element, 'ArrowRight');
      keyDown(element, 'ArrowRight');
      keyDown(element, 'ArrowRight');
      flush();

      expect(onDrag).toHaveBeenCalledTimes(1);
      expect(onDrag.mock.calls[0]?.[0]).toBeCloseTo(0.65);
    });
  });

  describe('with the pointer', () => {
    const press = (element: HTMLElement, clientX: number) => {
      element.getBoundingClientRect = () => new DOMRect(0, 0, 200, 100);
      element.setPointerCapture = vi.fn();
      element.hasPointerCapture = vi.fn(() => true);

      act(() => {
        element.dispatchEvent(
          Object.assign(new MouseEvent('pointerdown', { bubbles: true, clientX }), {
            pointerId: 1,
          }),
        );
      });
    };

    it('puts the divider where the pointer is, as a fraction of the picture', () => {
      const onDrag = vi.fn();
      const element = slider(onDrag);

      press(element, 50);
      flush();

      expect(now(element)).toBe(25);
      expect(onDrag).toHaveBeenCalledWith(0.25);
    });

    it('stays inside the picture when the pointer is outside it', () => {
      const element = slider();

      press(element, 5000);
      expect(now(element)).toBe(100);

      press(element, -300);
      expect(now(element)).toBe(0);
    });
  });

  it('does not ask for another frame when it is removed in the middle of a drag', () => {
    const cancel = vi.fn();

    vi.stubGlobal('cancelAnimationFrame', cancel);
    mount(<TryOnCompareSlider canvas={null} onDrag={vi.fn()} />);
    keyDown(required(document.querySelector('[role="slider"]')), 'ArrowRight');
    unmountAll();

    expect(cancel).toHaveBeenCalled();
  });
});

describe('TryOnSidebar', () => {
  const sidebar = (props: Partial<React.ComponentProps<typeof TryOnSidebar>> = {}) => (
    <TryOnSidebar
      category="LIP"
      mode={TRYON_MODE_MAP.LIVE}
      onModeToggle={vi.fn()}
      cameraVideoRef={createRef<HTMLVideoElement>()}
      cameraReady={false}
      previewImageUrl={null}
      onModelSelect={vi.fn()}
      {...props}
    />
  );

  it('has a group of the two modes, with the one that is on pressed', () => {
    mount(sidebar({ mode: TRYON_MODE_MAP.UPLOAD }));

    const group = required(document.querySelector('[role="group"]'));

    expect(group.getAttribute('aria-label')).toBe('Try-On mode');
    expect(buttonNamed('Try it Live').getAttribute('aria-pressed')).toBe('false');
    expect(buttonNamed('Upload Photo').getAttribute('aria-pressed')).toBe('true');
  });

  it('switches mode when one is pressed, even the one that is on (a way to start over)', () => {
    const onModeToggle = vi.fn();

    mount(sidebar({ onModeToggle, mode: TRYON_MODE_MAP.LIVE }));
    click(buttonNamed('Upload Photo'));
    click(buttonNamed('Try it Live'));

    expect(onModeToggle).toHaveBeenNthCalledWith(1, TRYON_MODE_MAP.UPLOAD);
    expect(onModeToggle).toHaveBeenNthCalledWith(2, TRYON_MODE_MAP.LIVE);
  });

  it('shows the camera in a small blurred video while it is live and the camera is on', () => {
    mount(sidebar({ mode: TRYON_MODE_MAP.LIVE, cameraReady: true }));

    expect(document.querySelector('video')).not.toBeNull();
  });

  it('shows no video before the camera is on, nor in upload', () => {
    const view = mount(sidebar({ mode: TRYON_MODE_MAP.LIVE, cameraReady: false }));
    expect(document.querySelector('video')).toBeNull();

    view.rerender(sidebar({ mode: TRYON_MODE_MAP.UPLOAD, cameraReady: true }));
    expect(document.querySelector('video')).toBeNull();
  });

  it('shows the photo in a small blurred picture in upload', () => {
    mount(sidebar({ mode: TRYON_MODE_MAP.UPLOAD, previewImageUrl: 'blob:mine' }));

    const preview = required(document.querySelector<HTMLImageElement>('img[alt="Model preview"]'));

    expect(preview.src).toBe('blob:mine');
  });

  it('has the models of the category, and can be told to keep them still', () => {
    mount(sidebar({ modelsDisabled: true }));

    const models = buttons().filter((button) =>
      (button.getAttribute('aria-label') ?? '').startsWith('Try on with'),
    );

    expect(models).toHaveLength(6);
    expect(models.every((button) => button.disabled)).toBe(true);
  });
});
