// @vitest-environment node
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const sourceCss = readFileSync(new URL('../source.css', import.meta.url), 'utf8');

// Without this line Tailwind never sees the class names inside the package and the components come
// out unstyled (the playground has a page that shows it), so it is checked here.
describe('source.css', () => {
  it('tells Tailwind to look for class names in dist', () => {
    expect(sourceCss).toMatch(/^@source '\.\/dist';$/m);
  });
});
