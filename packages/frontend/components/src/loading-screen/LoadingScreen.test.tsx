// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { required } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { BEAUTY_FACTS } from './beauty-facts.js';
import { LoadingScreen } from './LoadingScreen.js';
import { Teddy } from './Teddy.js';
import { WakeUpProgress } from './WakeUpProgress.js';

const first = (container: HTMLElement) =>
  required(container.firstElementChild, 'the first element');

const FACTS = ['Fact one', 'Fact two', 'Fact three'];

describe('Teddy', () => {
  afterEach(unmountAll);

  it('is a picture with a name', () => {
    const view = mount(<Teddy />);

    expect(first(view.container).getAttribute('role')).toBe('img');
    expect(first(view.container).getAttribute('aria-label')).toBe('Loading Teddy');
  });

  it('can be given another name and other attributes', () => {
    const view = mount(<Teddy aria-label="Please wait" data-testid="bear" />);

    expect(first(view.container).getAttribute('aria-label')).toBe('Please wait');
    expect(first(view.container).getAttribute('data-testid')).toBe('bear');
  });

  it('is drawn by the parts that teddy.css styles', () => {
    const view = mount(<Teddy />);
    const classes = new Set(
      [...view.container.querySelectorAll('*')].flatMap((el) => [...el.classList]),
    );

    for (const part of [
      'article',
      'body',
      'head',
      'ear',
      'face',
      'eye',
      'nose',
      'mouth',
      'arm',
      'leg',
    ]) {
      expect(classes.has(part), part).toBe(true);
    }
  });
});

describe('WakeUpProgress', () => {
  afterEach(unmountAll);

  const SERVICES = ['user', 'product', 'media'];

  it('is a polite status', () => {
    const view = mount(<WakeUpProgress phase="gateway" services={SERVICES} awakeServices={[]} />);
    const status = required(view.container.querySelector('[role="status"]'), 'the status');

    expect(status.getAttribute('aria-live')).toBe('polite');
  });

  it('is waking the gateway first, and the services wait for it', () => {
    const view = mount(<WakeUpProgress phase="gateway" services={SERVICES} awakeServices={[]} />);

    expect(view.container.textContent).toContain('Waking up the gateway');
    expect(view.container.textContent).toContain('Services - waiting for the gateway');
    expect(view.container.querySelector('ul')).toBeNull();
  });

  it('says how many services have answered, and lists them', () => {
    const view = mount(
      <WakeUpProgress phase="services" services={SERVICES} awakeServices={['user']} />,
    );

    expect(view.container.textContent).toContain('Gateway is awake');
    expect(view.container.textContent).toContain('Waking up services (1/3)');
    expect([...view.container.querySelectorAll('li')].map((li) => li.textContent)).toEqual([
      'user (awake)',
      'product (waking up)',
      'media (waking up)',
    ]);
  });

  it('shows an awake service in another colour than one that is still waking up', () => {
    const view = mount(
      <WakeUpProgress phase="services" services={SERVICES} awakeServices={['user']} />,
    );
    const [awake, sleeping] = [...view.container.querySelectorAll('li')];

    expect(awake.className).toContain('text-primary-green');
    expect(sleeping.className).not.toContain('text-primary-green');
  });

  it('is done when everything is awake, and then lists nothing', () => {
    const view = mount(
      <WakeUpProgress phase="done" services={SERVICES} awakeServices={SERVICES} />,
    );

    expect(view.container.textContent).toContain('Gateway is awake');
    expect(view.container.textContent).toContain('Services are awake');
    expect(view.container.querySelector('ul')).toBeNull();
  });

  it('has an icon for each state, without a network, and the spinner stops for less motion', () => {
    const view = mount(<WakeUpProgress phase="services" services={SERVICES} awakeServices={[]} />);
    const icons = [...view.container.querySelectorAll('svg')];

    expect(icons).toHaveLength(2);
    expect(icons[1]?.getAttribute('class')).toContain('motion-reduce:animate-none');
  });

  it('writes a step that waits in the quiet colour, with the icon of a clock', () => {
    const waiting = mount(
      <WakeUpProgress phase="gateway" services={SERVICES} awakeServices={[]} />,
    );
    const done = mount(
      <WakeUpProgress phase="done" services={SERVICES} awakeServices={SERVICES} />,
    );
    const waitingIcon = [...waiting.container.querySelectorAll('svg')][1];
    const doneIcon = [...done.container.querySelectorAll('svg')][1];
    const waitingLabel = required(
      [...waiting.container.querySelectorAll('span')].find((span) =>
        span.textContent.includes('waiting for the gateway'),
      ),
      'the label of the step that waits',
    );

    expect(waitingLabel.className).toContain('text-primary/40');
    expect(waitingIcon.innerHTML).not.toBe(doneIcon.innerHTML);
    expect(waitingIcon.getAttribute('class')).toContain('text-primary/30');
  });

  it('works with no services', () => {
    const view = mount(<WakeUpProgress phase="services" services={[]} awakeServices={[]} />);

    expect(view.container.textContent).toContain('Waking up services (0/0)');
  });
});

describe('LoadingScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    unmountAll();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const fact = (container: HTMLElement) => container.querySelector('p')?.textContent;

  it('covers the window, with the bear in the middle unless something else is given', () => {
    const view = mount(<LoadingScreen facts={FACTS} />);

    expect(first(view.container).className.split(/\s+/)).toEqual(
      expect.arrayContaining(['fixed', 'inset-0', 'z-100']),
    );
    expect(view.container.querySelector('[aria-label="Loading Teddy"]')).not.toBeNull();
  });

  it('shows what it is given instead of the bear, and without the dark glow behind it', () => {
    const view = mount(
      <LoadingScreen facts={FACTS}>
        <div data-testid="mine">mine</div>
      </LoadingScreen>,
    );

    expect(view.container.querySelector('[data-testid="mine"]')).not.toBeNull();
    expect(view.container.querySelector('[aria-label="Loading Teddy"]')).toBeNull();
    expect(first(view.container).className).not.toContain('radial-gradient');
  });

  it('shows the bear when the children are nothing at all (false, null)', () => {
    const withFalse = mount(<LoadingScreen facts={FACTS}>{false}</LoadingScreen>);
    const withNull = mount(<LoadingScreen facts={FACTS}>{null}</LoadingScreen>);

    expect(withFalse.container.querySelector('[aria-label="Loading Teddy"]')).not.toBeNull();
    expect(withNull.container.querySelector('[aria-label="Loading Teddy"]')).not.toBeNull();
  });

  it('has the glow behind the bear', () => {
    const view = mount(<LoadingScreen facts={FACTS} />);

    expect(first(view.container).className).toContain('radial-gradient');
  });

  it('says "Loading" to a screen reader, or what it is told', () => {
    const plain = mount(<LoadingScreen facts={FACTS} />);
    const other = mount(<LoadingScreen facts={FACTS} label="Cargando" />);

    expect(plain.container.querySelector('[role="status"]')?.textContent).toBe('Loading');
    expect(other.container.querySelector('[role="status"]')?.textContent).toBe('Cargando');
  });

  describe('the facts', () => {
    it('starts with one of them, chosen at random', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);
      const view = mount(<LoadingScreen facts={FACTS} />);

      expect(fact(view.container)).toBe('Fact three');
    });

    it('changes the fact every five seconds, never to the same one', () => {
      const view = mount(<LoadingScreen facts={FACTS} />);
      const seen = [fact(view.container)];

      for (let round = 0; round < 6; round += 1) {
        act(() => {
          vi.advanceTimersByTime(5000);
        });
        seen.push(fact(view.container));
      }

      for (let index = 1; index < seen.length; index += 1) {
        expect(seen[index], `change ${String(index)}`).not.toBe(seen[index - 1]);
      }
    });

    it('changes it every five seconds unless told another time', () => {
      const view = mount(<LoadingScreen facts={FACTS} />);
      const before = fact(view.container);

      // looked at often: with only two facts to show, a wrong time could come back to the same one
      for (const step of [1000, 1000, 1000, 1000, 999]) {
        act(() => {
          vi.advanceTimersByTime(step);
        });
        expect(fact(view.container)).toBe(before);
      }

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(fact(view.container)).not.toBe(before);
    });

    it('goes on with a new time when it is given one', () => {
      const view = mount(<LoadingScreen facts={FACTS} interval={1000} />);
      const before = fact(view.container);

      view.rerender(<LoadingScreen facts={FACTS} interval={3000} />);
      for (const step of [1000, 1000, 999]) {
        act(() => {
          vi.advanceTimersByTime(step);
        });
        expect(fact(view.container)).toBe(before);
      }

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(fact(view.container)).not.toBe(before);
    });

    it('changes it after the time it is told', () => {
      const view = mount(<LoadingScreen facts={FACTS} interval={1000} />);
      const before = fact(view.container);

      act(() => {
        vi.advanceTimersByTime(999);
      });
      expect(fact(view.container)).toBe(before);

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(fact(view.container)).not.toBe(before);
    });

    it('is not announced when it changes', () => {
      const view = mount(<LoadingScreen facts={FACTS} />);

      expect(view.container.querySelector('p')?.getAttribute('aria-live')).toBe('off');
    });

    it('stays when there is only one, and shows nothing when there is none', () => {
      const one = mount(<LoadingScreen facts={['Only']} />);
      const none = mount(<LoadingScreen facts={[]} />);

      act(() => {
        vi.advanceTimersByTime(20_000);
      });

      expect(fact(one.container)).toBe('Only');
      expect(none.container.querySelector('p')).toBeNull();
    });

    it('can be any content, not only text', () => {
      const view = mount(<LoadingScreen facts={[<b key="b">Bold fact</b>]} />);

      expect(view.container.querySelector('p b')?.textContent).toBe('Bold fact');
    });

    it('stops changing when it is removed', () => {
      const view = mount(<LoadingScreen facts={FACTS} />);

      view.unmount();

      expect(vi.getTimerCount()).toBe(0);
    });

    it('keeps one timer in StrictMode', () => {
      mount(<LoadingScreen facts={FACTS} />, { strict: true });

      expect(vi.getTimerCount()).toBe(1);
    });

    it('stays inside the facts when the list gets shorter', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);
      const view = mount(<LoadingScreen facts={FACTS} />);

      view.rerender(<LoadingScreen facts={['Only']} />);

      expect(fact(view.container)).toBe('Only');
    });
  });

  it('has the facts of beauty of the apps unless it is given others', () => {
    const view = mount(<LoadingScreen />);

    expect(BEAUTY_FACTS.length).toBeGreaterThan(30);
    expect(fact(view.container)?.length).toBeGreaterThan(20);
  });

  it('takes its class after its own', () => {
    const view = mount(<LoadingScreen facts={FACTS} className="bg-black!" />);

    expect(first(view.container).className.endsWith(' bg-black!')).toBe(true);
  });
});

describe('BEAUTY_FACTS', () => {
  afterEach(unmountAll);

  it('are nodes, not html that is set as it is', () => {
    expect(BEAUTY_FACTS.every((item) => typeof item !== 'string')).toBe(true);
  });

  it('highlight the words that stand out with the accent utility', () => {
    const first = BEAUTY_FACTS[0];
    const view = mount(<p>{first}</p>);

    expect(view.container.querySelector('.gradient-text-accent')?.textContent).toBe(
      '"Clean Beauty"',
    );
  });
});
