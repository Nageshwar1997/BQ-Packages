// @vitest-environment jsdom
import type { TTryOnSelection } from '@beautinique/frontend-types';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerTryOnIcons } from '../icons/try-on-icons.js';
import { mount, unmountAll } from '../test-utils/react.js';
import TryOnEmptyState from './TryOnEmptyState.js';

describe('TryOnEmptyState', () => {
  beforeEach(() => {
    // the modal registers its icons when it renders; this is the part of it that is looked at alone
    registerTryOnIcons();
  });

  afterEach(() => {
    unmountAll();
    document.body.replaceChildren();
  });

  it('shows the heading and the sentence, with an icon that is not read out', () => {
    const view = mount(<TryOnEmptyState tryOn={undefined} selectable={false} />);

    const [title, description] = [...view.container.querySelectorAll('p')];

    expect(title?.textContent).toBe('Try-On not available');
    expect(description?.textContent).toBe('This product has no Try-On configured yet.');
    expect(view.container.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });

  it('asks for a choice when the modal can be set up', () => {
    const view = mount(<TryOnEmptyState tryOn={undefined} selectable />);

    expect(view.container.textContent).toContain('Choose what to try on');
    expect(view.container.textContent).toContain(
      'Choose a category and a subcategory above to start.',
    );
  });

  it('says "coming soon" for a category it has no stage for', () => {
    const view = mount(
      <TryOnEmptyState
        tryOn={{ category: 'BODY', subCategory: 'TATTOO' } as unknown as TTryOnSelection}
        selectable={false}
      />,
    );

    expect(view.container.textContent).toContain('Coming soon');
    expect(view.container.textContent).toContain('Try-on for BODY is coming soon.');
  });
});
