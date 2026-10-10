import {
  Button,
  runUploadsInToast,
  ToastContainer,
  toaster,
  Tooltip,
  withProgressToast,
} from '@beautinique/frontend-components';
import { useState } from 'react';

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const files = (count: number, kilobytes: number) =>
  Array.from(
    { length: count },
    (_, index) => new File([new Uint8Array(kilobytes * 1024)], `${String(index)}.png`),
  );

/** An upload that takes `ms`, reporting its progress on the way; fails at `failAt` (0 to 1) if given. */
const fakeUpload = async (
  onProgress: (event: { loaded: number; total: number }) => void,
  size: number,
  ms: number,
  failAt?: number,
) => {
  const steps = 20;

  for (let step = 1; step <= steps; step += 1) {
    await wait(ms / steps);
    onProgress({ loaded: Math.round((size * step) / steps), total: size });

    if (failAt && step / steps >= failAt) throw new Error('File is too large');
  }
};

const CONTENT_FIELDS = {
  description: 'Description',
  additional: 'Additional info',
  ingredients: 'Ingredients',
  instructions: 'Instructions',
} as const;

const runContentUploads = (failIngredients: boolean) => {
  const sets: Record<string, File[]> = {
    description: files(3, 300),
    ingredients: files(2, 200),
    instructions: files(1, 500),
  };
  const durations: Record<string, number> = {
    description: 5000,
    ingredients: 3000,
    instructions: 7000,
  };

  return runUploadsInToast({
    title: 'Please wait...',
    description: 'Uploading content images...',
    uploads: Object.entries(CONTENT_FIELDS).map(([id, label]) => ({
      id,
      label,
      files: sets[id] ?? [],
    })),
    run: (id, progress) => {
      if (!progress) return Promise.resolve();

      const size = (sets[id] ?? []).reduce((total, file) => total + file.size, 0);

      return progress.run((onProgress) =>
        fakeUpload(
          onProgress,
          size,
          durations[id] ?? 1000,
          failIngredients && id === 'ingredients' ? 0.5 : undefined,
        ),
      );
    },
  }).catch(() => undefined);
};

const PATTERNS = ['primary', 'secondary', 'tertiary', 'outline', 'transparent'] as const;
const PLACEMENTS = ['top', 'bottom', 'left', 'right'] as const;

export const App = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isRequired, setIsRequired] = useState(true);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('theme', next);
    setTheme(next);
  };

  return (
    <div className="bg-primary-invert text-primary min-h-dvh p-6">
      <ToastContainer />

      <div className="fixed right-1 bottom-1 z-10">
        <Tooltip title="No room below" description="So it opens above" placement="bottom">
          <button
            type="button"
            className="border-primary/30 bg-primary-invert rounded-md border px-3 py-1.5 text-xs"
          >
            corner
          </button>
        </Tooltip>
      </div>

      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">@beautinique/frontend-components</h1>
          <div className="w-40">
            <Button
              pattern="secondary"
              content={`Theme: ${theme}`}
              buttonProps={{ onClick: toggleTheme }}
            />
          </div>
        </header>

        <section className="flex flex-col gap-3" data-section="buttons">
          <h2 className="text-secondary text-sm font-semibold">Button</h2>
          <div className="flex flex-wrap gap-3">
            {PATTERNS.map((pattern) => (
              <div key={pattern} className="w-40">
                <Button pattern={pattern} content={pattern} />
              </div>
            ))}
            <div className="w-40">
              <Button pattern="primary" content="disabled" buttonProps={{ disabled: true }} />
            </div>
            <div className="w-40">
              <Button
                pattern="outline"
                content={{ icon: 'solar:pen-linear', className: 'size-4.5' }}
                buttonProps={{ 'aria-label': 'Edit (icon only, named for a screen reader)' }}
              />
            </div>
            <div className="w-40">
              <Button
                pattern="primary"
                content="rounded-full! px-10!"
                className="rounded-full! px-10! lg:px-10!"
              />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3" data-section="tooltips">
          <h2 className="text-secondary text-sm font-semibold">Tooltip</h2>
          <div className="flex flex-wrap gap-10 p-10">
            {PLACEMENTS.map((placement) => (
              <Tooltip
                key={placement}
                title={`Placement: ${placement}`}
                description="Hover or focus"
                placement={placement}
              >
                <button
                  type="button"
                  className="border-primary/30 rounded-md border px-3 py-1.5 text-sm"
                >
                  {placement}
                </button>
              </Tooltip>
            ))}
          </div>
          <p className="text-tertiary text-xs">
            The button in the bottom right corner of the window opens its tooltip below, where there
            is no room: it opens above instead, and is pushed in from the edge.
          </p>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(event) => {
                  setIsRequired(event.target.checked);
                }}
              />
              Tooltip required (type in the box, then untick: the text stays)
            </label>
            <Tooltip title="Only while required" required={isRequired}>
              <input
                className="border-primary/30 w-72 rounded-md border px-3 py-1.5 text-sm"
                placeholder="Type something here"
              />
            </Tooltip>
          </div>
        </section>

        <section className="flex flex-col gap-3" data-section="toasts">
          <h2 className="text-secondary text-sm font-semibold">Toast</h2>
          <div className="flex flex-wrap gap-3">
            <div className="w-44">
              <Button
                pattern="outline"
                content="Success"
                buttonProps={{
                  onClick: () =>
                    toaster.success({ title: 'Saved', description: 'Your changes were saved.' }),
                }}
              />
            </div>
            <div className="w-44">
              <Button
                pattern="outline"
                content="Error"
                buttonProps={{
                  onClick: () =>
                    toaster.error({ title: 'Failed', description: 'Something went wrong.' }),
                }}
              />
            </div>
            <div className="w-44">
              <Button
                pattern="outline"
                content="Warning"
                buttonProps={{
                  onClick: () =>
                    toaster.warning({ title: 'Careful', description: 'This cannot be undone.' }),
                }}
              />
            </div>
            <div className="w-44">
              <Button
                pattern="outline"
                content="Default"
                buttonProps={{
                  onClick: () =>
                    toaster.default({
                      title: 'Heads up',
                      description: 'A plain toast, with nothing to say about success or failure.',
                    }),
                }}
              />
            </div>
            <div className="w-44">
              <Button
                pattern="outline"
                content="Custom"
                buttonProps={{
                  onClick: () =>
                    toaster.custom({
                      type: 'custom',
                      children: (
                        <p className="text-secondary text-xs md:text-sm">
                          A custom toast: any <strong>React content</strong> goes here.
                        </p>
                      ),
                    }),
                }}
              />
            </div>
            <div className="w-44">
              <Button
                pattern="outline"
                content="Loading (15 s)"
                buttonProps={{
                  onClick: () => {
                    const id = toaster.loading({
                      title: 'Please wait...',
                      description: 'Working on it',
                    });

                    setTimeout(() => {
                      toaster.remove(id);
                    }, 15000);
                  },
                }}
              />
            </div>
            <div className="w-44">
              <Button
                pattern="outline"
                content="Progress (6 s)"
                buttonProps={{
                  onClick: () =>
                    void withProgressToast({
                      title: 'Please wait...',
                      description: 'Uploading image...',
                      request: (onProgress) => fakeUpload(onProgress, 1000, 6000),
                    }),
                }}
              />
            </div>
            <div className="w-44">
              <Button
                pattern="outline"
                content="Uploads (all succeed)"
                buttonProps={{ onClick: () => void runContentUploads(false) }}
              />
            </div>
            <div className="w-44">
              <Button
                pattern="outline"
                content="Uploads (one fails)"
                buttonProps={{ onClick: () => void runContentUploads(true) }}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
