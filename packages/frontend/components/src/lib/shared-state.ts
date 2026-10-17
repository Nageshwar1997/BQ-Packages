/**
 * State that has to be one for the whole page, although the code that uses it is copied into the file
 * of each entry of the package (and a page may even load two versions of the package): the stack of
 * the popups that are open, the traps that hold the focus, the dialogs that hold the page still.
 *
 * A `let` or an array at the top of a module is one *per copy*: a select (`/inputs`) and a modal
 * (`/layout`) would not see each other, and one Escape would close both. Here the state lives on
 * `globalThis`, under a name of this package, so every copy finds the same one; the first copy to ask
 * makes it.
 *
 * It is only changed by what a person does in the browser (opening, closing), never while rendering,
 * so sharing it between the requests of a server costs nothing.
 */
export const sharedState = <T extends object>(name: string, create: () => T): T => {
  const key = Symbol.for(`@beautinique/frontend-components:${name}`);
  const holder = globalThis as unknown as Record<symbol, T | undefined>;

  holder[key] ??= create();

  return holder[key];
};
