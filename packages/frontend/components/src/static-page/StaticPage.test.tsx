// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { required } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import {
  Checklist,
  EmailUsAction,
  HighlightNote,
  InfoCard,
  InfoCardGrid,
  LastUpdatedBadge,
  NumberedSteps,
  StaticPageCTA,
  StaticPageHeader,
  StaticPageLayout,
  StaticPageSection,
} from './StaticPage.js';

const first = (container: HTMLElement) =>
  required(container.firstElementChild, 'the first element');

describe('StaticPageLayout', () => {
  afterEach(unmountAll);

  it('puts what it is given in a column', () => {
    const view = mount(
      <StaticPageLayout>
        <p>Content</p>
      </StaticPageLayout>,
    );

    expect(first(view.container).textContent).toBe('Content');
    expect(first(view.container).className.split(/\s+/)).toEqual(
      expect.arrayContaining(['mx-auto', 'max-w-4xl', 'flex-col']),
    );
  });
});

describe('StaticPageHeader', () => {
  afterEach(unmountAll);

  it('has the title as the heading of the page, and the description under it', () => {
    const view = mount(
      <StaticPageHeader
        icon="solar:info-circle-linear"
        title="About us"
        description="Who we are"
      />,
    );
    const title = required(view.container.querySelector('h1'), 'the heading');

    expect(title.textContent).toBe('About us');
    expect(view.container.querySelectorAll('h1')).toHaveLength(1);
    expect(required(view.container.querySelector('p'), 'the description').textContent).toBe(
      'Who we are',
    );
  });

  it('is a header element', () => {
    const view = mount(<StaticPageHeader icon="x" title="T" description="D" />);

    expect(first(view.container).tagName).toBe('HEADER');
  });

  it('keeps the icon out of the way of a screen reader', () => {
    const view = mount(
      <StaticPageHeader icon="solar:info-circle-linear" title="T" description="D" />,
    );
    const circle = required(view.container.querySelector('header > span'), 'the circle');

    expect(circle.getAttribute('aria-hidden')).toBe('true');
  });

  it('can have a description that is more than text', () => {
    const view = mount(
      <StaticPageHeader
        icon="x"
        title="T"
        description={
          <>
            Read the <a href="/terms">terms</a>
          </>
        }
      />,
    );

    expect(view.container.querySelector('p a')?.getAttribute('href')).toBe('/terms');
  });

  it('shows what is under it (meta) after the description', () => {
    const view = mount(
      <StaticPageHeader
        icon="x"
        title="T"
        description="D"
        meta={<em data-testid="meta">now</em>}
      />,
    );

    expect(first(view.container).lastElementChild?.getAttribute('data-testid')).toBe('meta');
  });

  it('has no meta without it', () => {
    const view = mount(<StaticPageHeader icon="x" title="T" description="D" />);

    expect(first(view.container).children).toHaveLength(3);
  });
});

describe('LastUpdatedBadge', () => {
  afterEach(unmountAll);

  it('says the date in a time element, with the machine form of it', () => {
    const view = mount(<LastUpdatedBadge date="2026-10-15" />);
    const time = required(view.container.querySelector('time'), 'the time');

    expect(view.container.textContent).toBe('Last updated Oct 15, 2026');
    expect(time.getAttribute('datetime')).toBe('2026-10-15');
    expect(time.textContent).toBe('Oct 15, 2026');
  });

  it('takes a date object and a number of milliseconds too', () => {
    const date = mount(<LastUpdatedBadge date={new Date(Date.UTC(2025, 0, 2))} />);
    const number = mount(<LastUpdatedBadge date={Date.UTC(2024, 11, 31)} />);

    expect(date.container.textContent).toContain('Jan 2, 2025');
    expect(number.container.textContent).toContain('Dec 31, 2024');
  });

  it('writes the day of the date in UTC, wherever the page is drawn', () => {
    const view = mount(<LastUpdatedBadge date="2026-10-15T23:59:59Z" />);

    expect(view.container.querySelector('time')?.getAttribute('datetime')).toBe('2026-10-15');
    expect(view.container.textContent).toContain('Oct 15, 2026');
  });

  it('can say another word before the date, and write it in another language', () => {
    const view = mount(<LastUpdatedBadge date="2026-10-15" label="Reviewed" locale="de-DE" />);

    expect(view.container.textContent).toBe('Reviewed 15.10.2026');
  });

  it('draws nothing for a date that is not one', () => {
    const view = mount(<LastUpdatedBadge date="not a date" />);

    expect(view.container.innerHTML).toBe('');
  });

  it('keeps its icon out of the way of a screen reader', () => {
    const view = mount(<LastUpdatedBadge date="2026-10-15" />);

    expect(view.container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('StaticPageSection', () => {
  afterEach(unmountAll);

  it('is a section named by its heading', () => {
    const view = mount(
      <StaticPageSection title="Our values">
        <p>Text</p>
      </StaticPageSection>,
    );
    const heading = required(view.container.querySelector('h2'), 'the heading');

    expect(first(view.container).tagName).toBe('SECTION');
    expect(heading.textContent).toBe('Our values');
    expect(first(view.container).getAttribute('aria-labelledby')).toBe(heading.id);
    expect(view.container.querySelector('p')?.textContent).toBe('Text');
  });

  it('has no heading, and no name, without a title', () => {
    const view = mount(
      <StaticPageSection>
        <p>Text</p>
      </StaticPageSection>,
    );

    expect(view.container.querySelector('h2')).toBeNull();
    expect(first(view.container).hasAttribute('aria-labelledby')).toBe(false);
  });

  it('gives each section its own heading id', () => {
    const view = mount(
      <>
        <StaticPageSection title="One">x</StaticPageSection>
        <StaticPageSection title="Two">x</StaticPageSection>
      </>,
    );
    const ids = [...view.container.querySelectorAll('h2')].map((heading) => heading.id);

    expect(new Set(ids).size).toBe(2);
  });

  it('keeps a gap between its parts unless it is told another class', () => {
    const plain = mount(<StaticPageSection title="A">x</StaticPageSection>);
    const told = mount(
      <StaticPageSection title="B" className="gap-8">
        x
      </StaticPageSection>,
    );

    expect(first(plain.container).className).toContain('gap-4');
    expect(first(told.container).className).toContain('gap-8');
    expect(first(told.container).className).not.toContain('gap-4');
  });
});

describe('InfoCard and InfoCardGrid', () => {
  afterEach(unmountAll);

  it('has a heading and a text, and an icon that is not read out', () => {
    const view = mount(
      <InfoCard icon="solar:info-circle-linear" title="Fast" description="In two days" />,
    );

    expect(view.container.querySelector('h3')?.textContent).toBe('Fast');
    expect(view.container.querySelector('p')?.textContent).toBe('In two days');
    expect(view.container.querySelector('span')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('puts the cards in a grid of two columns, or three', () => {
    const items = [
      { icon: 'a', title: 'One', description: 'd' },
      { icon: 'b', title: 'Two', description: 'd' },
      { icon: 'c', title: 'Three', description: 'd' },
    ];
    const two = mount(<InfoCardGrid items={items} />);
    const three = mount(<InfoCardGrid items={items} columns={3} />);

    expect(first(two.container).className).toContain('sm:grid-cols-2');
    expect(first(three.container).className).toContain('sm:grid-cols-3');
    expect(first(three.container).className).not.toContain('sm:grid-cols-2');
    expect(two.container.querySelectorAll('h3')).toHaveLength(3);
  });

  it('gives each card all it is told', () => {
    const view = mount(
      <InfoCardGrid items={[{ icon: 'a', title: 'One', description: 'First text' }]} />,
    );

    expect(view.container.textContent).toContain('First text');
  });

  it('draws nothing in the grid without items', () => {
    const view = mount(<InfoCardGrid items={[]} />);

    expect(first(view.container).children).toHaveLength(0);
  });
});

describe('Checklist', () => {
  afterEach(unmountAll);

  it('is a list, a row for each statement', () => {
    const view = mount(<Checklist items={['First', 'Second']} />);

    expect(view.container.querySelector('ul')).not.toBeNull();
    expect([...view.container.querySelectorAll('li')].map((item) => item.textContent)).toEqual([
      'First',
      'Second',
    ]);
  });

  it('has a green check unless it is told another icon and colour, and the icon is not read out', () => {
    const plain = mount(<Checklist items={['A']} />);
    const told = mount(
      <Checklist items={['A']} icon="solar:danger-triangle-linear" iconClassName="text-red-c" />,
    );

    expect(plain.container.querySelector('svg')?.getAttribute('class')).toContain(
      'text-primary-green',
    );
    expect(plain.container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(told.container.querySelector('svg')?.getAttribute('class')).toContain('text-red-c');
    expect(told.container.querySelector('svg')?.getAttribute('class')).not.toContain(
      'text-primary-green',
    );
  });

  it('has the icon of a check, not of a warning, by default', () => {
    const check = mount(<Checklist items={['A']} />);
    const warning = mount(<Checklist items={['A']} icon="solar:danger-triangle-linear" />);

    expect(check.container.querySelector('svg')?.innerHTML).not.toBe(
      warning.container.querySelector('svg')?.innerHTML,
    );
  });
});

describe('HighlightNote', () => {
  afterEach(unmountAll);

  it('is a note named by its title', () => {
    const view = mount(<HighlightNote title="Careful">Read this first</HighlightNote>);
    const note = first(view.container);
    const title = required(view.container.querySelector('p'), 'the title');

    expect(note.getAttribute('role')).toBe('note');
    expect(note.getAttribute('aria-labelledby')).toBe(title.id);
    expect(title.textContent).toBe('Careful');
    expect(view.container.textContent).toContain('Read this first');
  });

  it('has a warning icon unless it is told another, and the icon is not read out', () => {
    const plain = mount(<HighlightNote title="T">x</HighlightNote>);
    const told = mount(
      <HighlightNote title="T" icon="solar:check-circle-linear">
        x
      </HighlightNote>,
    );

    expect(plain.container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(plain.container.querySelector('svg')?.innerHTML).not.toBe(
      told.container.querySelector('svg')?.innerHTML,
    );
  });

  it('gives each note its own title id', () => {
    const view = mount(
      <>
        <HighlightNote title="One">x</HighlightNote>
        <HighlightNote title="Two">x</HighlightNote>
      </>,
    );
    const ids = [...view.container.querySelectorAll('p[id]')].map((title) => title.id);

    expect(new Set(ids).size).toBe(2);
  });
});

describe('NumberedSteps', () => {
  afterEach(unmountAll);

  const steps = [
    { title: 'Order', description: 'Choose what you like' },
    { title: 'Pay', description: 'Safely' },
    { title: 'Wait', description: 'Two days' },
  ];

  it('is an ordered list that stays a list, with a row for each step', () => {
    const view = mount(<NumberedSteps steps={steps} />);
    const list = required(view.container.querySelector('ol'), 'the list');

    expect(list.getAttribute('role')).toBe('list');
    expect(list.querySelectorAll('li')).toHaveLength(3);
  });

  it('numbers the steps from 1, in a badge that is not read out (the list says the place)', () => {
    const view = mount(<NumberedSteps steps={steps} />);
    const badges = [...view.container.querySelectorAll('li > span')];

    expect(badges.map((badge) => badge.textContent)).toEqual(['1', '2', '3']);
    expect(badges.every((badge) => badge.getAttribute('aria-hidden') === 'true')).toBe(true);
  });

  it('says the title and the description of each step', () => {
    const view = mount(<NumberedSteps steps={steps} />);
    const second = required(view.container.querySelectorAll('li')[1], 'the second step');

    expect(second.textContent).toContain('Pay');
    expect(second.textContent).toContain('Safely');
  });
});

describe('StaticPageCTA', () => {
  afterEach(unmountAll);

  const render = (props: Partial<Parameters<typeof StaticPageCTA>[0]> = {}) =>
    mount(
      <StaticPageCTA
        title="Get in touch"
        description="We reply in a day"
        actions={<button type="button">Write</button>}
        {...props}
      />,
    );

  it('is a section named by its heading, with a text and the actions', () => {
    const view = render();
    const heading = required(view.container.querySelector('h2'), 'the heading');

    expect(first(view.container).tagName).toBe('SECTION');
    expect(first(view.container).getAttribute('aria-labelledby')).toBe(heading.id);
    expect(heading.textContent).toBe('Get in touch');
    expect(view.container.textContent).toContain('We reply in a day');
    expect(view.container.querySelector('button')?.textContent).toBe('Write');
  });

  it('puts the text and the actions side by side from sm: up, unless it is told to stack them', () => {
    const row = render();
    const stack = render({ layout: 'stack' });
    const rowBox = required(row.container.querySelector('section > div'), 'the row');
    const stackBox = required(stack.container.querySelector('section > div'), 'the stack');

    expect(rowBox.className).toContain('sm:flex-row');
    expect(stackBox.className).not.toContain('sm:flex-row');
  });

  it('shows a footer after them, when it has one', () => {
    const view = render({ footer: <small data-testid="footer">fine print</small> });

    expect(first(view.container).lastElementChild?.getAttribute('data-testid')).toBe('footer');
  });

  it('takes a class after its own', () => {
    const view = render({ className: 'mine' });

    expect(first(view.container).className).toMatch(/p-4 sm:p-6 mine$/);
  });
});

describe('EmailUsAction', () => {
  afterEach(unmountAll);

  it('is a link that writes to the address, which is also its text', () => {
    const view = mount(<EmailUsAction email="hello@example.com" />);
    const link = first(view.container);

    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('mailto:hello@example.com');
    expect(link.textContent).toBe('hello@example.com');
  });

  it('can say another text', () => {
    const view = mount(<EmailUsAction email="hello@example.com">Write to us</EmailUsAction>);

    expect(first(view.container).textContent).toBe('Write to us');
    expect(first(view.container).getAttribute('href')).toBe('mailto:hello@example.com');
  });

  it('keeps its icon out of the way of a screen reader', () => {
    const view = mount(<EmailUsAction email="a@b.c" />);

    expect(view.container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows the focus', () => {
    const view = mount(<EmailUsAction email="a@b.c" />);

    expect(first(view.container).className).toContain('focus-visible:outline-2');
  });
});

describe('StaticPage in StrictMode, and the types', () => {
  afterEach(unmountAll);

  it('is the same in StrictMode', () => {
    const view = mount(
      <StaticPageLayout>
        <StaticPageHeader
          icon="x"
          title="T"
          description="D"
          meta={<LastUpdatedBadge date="2026-10-15" />}
        />
        <StaticPageSection title="S">
          <NumberedSteps steps={[{ title: 'a', description: 'b' }]} />
        </StaticPageSection>
      </StaticPageLayout>,
      { strict: true },
    );

    expect(view.container.querySelectorAll('h1')).toHaveLength(1);
    expect(view.container.querySelectorAll('h2')).toHaveLength(1);
  });

  // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest.
  it('does not compile without what each part needs', () => {
    const check = () => {
      // @ts-expect-error the header needs an icon, a title and a description
      <StaticPageHeader title="T" />;
      // @ts-expect-error a date is needed
      <LastUpdatedBadge />;
      // @ts-expect-error a note has a title
      <HighlightNote>x</HighlightNote>;
      // @ts-expect-error the address is needed
      <EmailUsAction />;
      // @ts-expect-error two or three columns
      <InfoCardGrid items={[]} columns={4} />;
      // @ts-expect-error a closing block has actions
      <StaticPageCTA title="T" description="D" />;
    };

    expect(check).toBeTypeOf('function');
  });
});
