// @vitest-environment jsdom
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mount, unmountAll } from '../test-utils/react.js';
import { ScrollToTop } from './ScrollToTop.js';

const scrollIntoView = vi.fn();
let reduceMotion = false;

const addElement = (id: string) => {
  const element = document.createElement('div');
  element.id = id;
  document.body.append(element);

  return element;
};

describe('ScrollToTop', () => {
  beforeEach(() => {
    scrollIntoView.mockReset();
    reduceMotion = false;
    // jsdom has neither of the two
    Element.prototype.scrollIntoView = scrollIntoView;
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)' && reduceMotion,
      })),
    );
  });

  afterEach(() => {
    unmountAll();
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  it('draws nothing', () => {
    addElement('main');
    const view = mount(<ScrollToTop pathname="/" />);

    expect(view.container.innerHTML).toBe('');
  });

  describe('when the page is shown', () => {
    it('scrolls #main to its top, as the page was before', () => {
      const main = addElement('main');
      mount(<ScrollToTop pathname="/" />);

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: 'auto',
        block: 'start',
        inline: 'nearest',
      });
      expect(scrollIntoView.mock.contexts[0]).toBe(main);
    });

    it('scrolls the element it is told to', () => {
      addElement('main');
      const other = addElement('content');
      mount(<ScrollToTop pathname="/" id="content" />);

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView.mock.contexts[0]).toBe(other);
    });

    it('passes on how to scroll', () => {
      addElement('main');
      mount(<ScrollToTop pathname="/" behavior="smooth" block="center" inline="end" />);

      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
        inline: 'end',
      });
    });

    it('does nothing, and does not fail, when the page has no such element', () => {
      addElement('somewhere-else');

      expect(() => mount(<ScrollToTop pathname="/" />)).not.toThrow();
      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    it('does not scroll when the browser put the page back where it was and it was told to leave it', () => {
      addElement('main');
      mount(<ScrollToTop pathname="/cart" skipInitial />);

      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    it('scrolls once in StrictMode, which runs its effects twice', () => {
      addElement('main');
      mount(<ScrollToTop pathname="/" />, { strict: true });

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
    });

    it('does not touch the page when it is rendered on a server', () => {
      addElement('main');

      expect(renderToString(<ScrollToTop pathname="/" />)).toBe('');
      expect(scrollIntoView).not.toHaveBeenCalled();
    });
  });

  describe('when the path changes', () => {
    it('scrolls again, each time', () => {
      addElement('main');
      const view = mount(<ScrollToTop pathname="/" />);

      view.rerender(<ScrollToTop pathname="/cart" />);
      view.rerender(<ScrollToTop pathname="/checkout" />);

      expect(scrollIntoView).toHaveBeenCalledTimes(3);
    });

    it('scrolls after a change even if it was told to leave the first page alone', () => {
      addElement('main');
      const view = mount(<ScrollToTop pathname="/cart" skipInitial />);

      view.rerender(<ScrollToTop pathname="/checkout" skipInitial />);

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
    });

    it('scrolls when going back to a path it was at before', () => {
      addElement('main');
      const view = mount(<ScrollToTop pathname="/a" />);
      view.rerender(<ScrollToTop pathname="/b" />);
      view.rerender(<ScrollToTop pathname="/a" />);

      expect(scrollIntoView).toHaveBeenCalledTimes(3);
    });

    it('finds the element when it scrolls, not when it was first rendered', () => {
      const view = mount(<ScrollToTop pathname="/" />);
      expect(scrollIntoView).not.toHaveBeenCalled();

      const main = addElement('main');
      view.rerender(<ScrollToTop pathname="/next" />);

      expect(scrollIntoView.mock.contexts[0]).toBe(main);
    });
  });

  describe('when the path stays', () => {
    it('does not scroll when the page renders again', () => {
      addElement('main');
      const view = mount(<ScrollToTop pathname="/" />);

      view.rerender(<ScrollToTop pathname="/" />);
      view.rerender(<ScrollToTop pathname="/" />);

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['another id', { id: 'content' }],
      ['another behavior', { behavior: 'smooth' as const }],
      ['another block', { block: 'end' as const }],
      ['another inline', { inline: 'center' as const }],
    ])('does not scroll again for %s: it is the same page', (_name, change) => {
      addElement('main');
      addElement('content');
      const view = mount(<ScrollToTop pathname="/" />);

      view.rerender(<ScrollToTop pathname="/" {...change} />);

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
    });

    it('scrolls the way it is told from then on', () => {
      addElement('main');
      const view = mount(<ScrollToTop pathname="/" />);
      view.rerender(<ScrollToTop pathname="/" block="end" />);

      view.rerender(<ScrollToTop pathname="/next" block="end" />);

      expect(scrollIntoView).toHaveBeenLastCalledWith({
        behavior: 'auto',
        block: 'end',
        inline: 'nearest',
      });
    });
  });

  describe('for a person who asked for less motion', () => {
    it('does not animate a scroll that was asked to be smooth', () => {
      reduceMotion = true;
      addElement('main');
      mount(<ScrollToTop pathname="/" behavior="smooth" />);

      expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }));
    });

    it('animates it when they did not ask', () => {
      addElement('main');
      mount(<ScrollToTop pathname="/" behavior="smooth" />);

      expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
    });

    it('leaves the other behaviors as they are', () => {
      reduceMotion = true;
      addElement('main');
      mount(<ScrollToTop pathname="/" behavior="instant" />);

      expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'instant' }));
    });
  });

  // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest.
  it('does not compile with something it cannot do', () => {
    const check = () => {
      // @ts-expect-error it has to know the path
      <ScrollToTop />;
      // @ts-expect-error the path is a string
      <ScrollToTop pathname={1} />;
      // @ts-expect-error behavior is one of the browser's
      <ScrollToTop pathname="/" behavior="fast" />;
      // @ts-expect-error so is block
      <ScrollToTop pathname="/" block="top" />;
    };

    expect(check).toBeTypeOf('function');
  });
});
