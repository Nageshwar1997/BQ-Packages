// @vitest-environment node
import { compile } from 'tailwindcss';
import { describe, expect, it } from 'vitest';

/*
 * The lists of `Select`, `HierarchySelect` and the picker of `ColorInput` have `z-3` and the app raises
 * them by giving a class name (`z-110`). Two classes of the same property do not win by the order in
 * the `class` attribute but by the order Tailwind writes them in its CSS: the one that is written last
 * wins. This is what makes "a bigger `z-` is the one that applies" (the documentation of those props,
 * and `stacking.test`) true, so it is checked against Tailwind itself.
 */
const build = async (...classes: string[]) => {
  const compiler = await compile('@tailwind utilities;');

  return compiler.build(classes);
};

describe('the order Tailwind writes z- classes in', () => {
  it('writes the bigger z- after the smaller one, so the class the app gives wins over z-3', async () => {
    const css = await build('z-110', 'z-3');

    expect(css.indexOf('.z-110')).toBeGreaterThan(css.indexOf('.z-3'));
  });

  it('does it whatever the order of the names it is given', async () => {
    const css = await build('z-3', 'z-110');

    expect(css.indexOf('.z-110')).toBeGreaterThan(css.indexOf('.z-3'));
  });
});
