// @vitest-environment jsdom
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';

import { required } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { LoadingPage } from './LoadingPage.js';
import { LoadingRings } from './LoadingRings.js';
import { LoadingText } from './LoadingText.js';

const first = (container: HTMLElement) =>
  required(container.firstElementChild, 'the first element');

describe('LoadingText', () => {
  afterEach(unmountAll);

  it('says "Loading" unless it is told another word', () => {
    const plain = mount(<LoadingText />);
    const other = mount(<LoadingText text="Saving" />);

    expect(plain.container.textContent).toBe('Loading');
    expect(other.container.textContent).toBe('Saving');
  });

  it('is a status that a screen reader reads, and the shine on the letters is hidden from it', () => {
    const view = mount(<LoadingText text="Saving" />);
    const shine = required(view.container.querySelector('[data-text]'), 'the shine');

    expect(first(view.container).getAttribute('role')).toBe('status');
    expect(view.container.querySelector('.sr-only')?.textContent).toBe('Saving');
    expect(shine.getAttribute('aria-hidden')).toBe('true');
    expect(shine.getAttribute('data-text')).toBe('Saving');
  });

  it('makes the shine last longer for a longer word, and at least a second', () => {
    const short = mount(<LoadingText text="Hi" />);
    const long = mount(<LoadingText text={'x'.repeat(50)} />);
    const durationOf = (container: HTMLElement) =>
      required(
        container.querySelector<HTMLElement>('[data-text]'),
        'the shine',
      ).style.getPropertyValue('--loading-text-duration');

    expect(durationOf(short.container)).toBe('1s');
    expect(durationOf(long.container)).toBe('4s');
  });

  it('takes its class after its own', () => {
    const view = mount(<LoadingText className="mt-2" />);

    expect(first(view.container).className).toBe('w-fit mt-2');
  });
});

describe('LoadingRings', () => {
  afterEach(unmountAll);

  it('has three rings, hidden from assistive technology, and the word under them', () => {
    const view = mount(<LoadingRings text="Please wait" />);
    const rings = required(
      view.container.querySelector('[aria-hidden="true"].relative'),
      'the rings',
    );

    expect(rings.children).toHaveLength(3);
    expect(view.container.textContent).toBe('Please wait');
    expect(view.container.querySelector('[role="status"]')).not.toBeNull();
  });

  it('says "Loading" without a text', () => {
    const view = mount(<LoadingRings />);

    expect(view.container.textContent).toBe('Loading');
  });

  it('gives each ring its own turn in space, side of the border and delay', () => {
    const view = mount(<LoadingRings />);
    const rings = [
      ...required(view.container.querySelector('[aria-hidden="true"].relative'), 'the rings')
        .children,
    ] as HTMLElement[];

    expect(rings.map((ring) => ring.style.getPropertyValue('--z'))).toEqual([
      '0deg',
      '90deg',
      '180deg',
    ]);
    expect(rings.map((ring) => ring.style.getPropertyValue('--rx'))).toEqual([
      '45deg',
      '55deg',
      '40deg',
    ]);
    expect(rings.map((ring) => ring.style.animationDelay)).toEqual(['0s', '-0.5s', '-1s']);
    expect(rings.map((ring) => ring.style.borderColor)).toEqual(['red', 'green', 'blue']);
    expect(rings[0]?.style.borderBottomWidth).toBe('0.6vmin');
    expect(rings[1]?.style.borderRightWidth).toBe('0.6vmin');
    expect(rings[2]?.style.borderTopWidth).toBe('0.6vmin');
  });

  it('stops turning for a person who asked for less motion', () => {
    const view = mount(<LoadingRings />);
    const ring = required(
      view.container.querySelector('[aria-hidden="true"].relative')?.firstElementChild,
      'a ring',
    );

    expect(ring.className.split(/\s+/)).toContain('motion-reduce:animate-none');
    expect(ring.className).toContain('animate-[ring-spin_2s_linear_infinite]');
  });

  it('takes its class after its own', () => {
    const view = mount(<LoadingRings className="min-h-40" />);

    expect(first(view.container).className.endsWith(' min-h-40')).toBe(true);
  });

  it('is on a server too', () => {
    expect(renderToString(<LoadingRings text="Wait" />)).toContain('Wait');
  });
});

describe('LoadingPage', () => {
  afterEach(unmountAll);

  it('covers the whole window with the rings in the middle', () => {
    const view = mount(<LoadingPage text="Loading profile" />);
    const classes = first(view.container).className.split(/\s+/);

    expect(classes).toEqual(
      expect.arrayContaining(['fixed', 'inset-0', 'items-center', 'justify-center']),
    );
    expect(view.container.textContent).toBe('Loading profile');
  });

  it('says "Loading" without a text, and takes its class after its own', () => {
    const view = mount(<LoadingPage className="bg-black!" />);

    expect(view.container.textContent).toBe('Loading');
    expect(first(view.container).className.endsWith(' bg-black!')).toBe(true);
  });
});
