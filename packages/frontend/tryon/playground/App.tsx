import { TRY_ON_MAP } from '@beautinique/frontend-constants';
import type { TTryOnCategory, TTryOnSelection } from '@beautinique/frontend-types';
import { TryOnModal as LazyTryOnModal } from '@beautinique/frontend-tryon';
import { TRYON_CATEGORY_OPTIONS } from '@beautinique/frontend-tryon/constants';
import { TryOnModal as EagerTryOnModal } from '@beautinique/frontend-tryon/modal';
import { useState } from 'react';

// What a page of an app does with the try-on: a shopper gets the category and subcategory the product
// has; whoever sets the product up gets a modal in which they can change both (`selectable`) and
// "Apply" gives the choice back. Every prop of the modal can be changed here.

const PRODUCT_SHADES = [
  { name: 'Rose', hexColor: '#C2185B' },
  { name: 'Coral', hexColor: '#E8613C' },
  { name: 'Berry', hexColor: '#7B1E4B' },
  { name: 'Nude', hexColor: '#C48B6B' },
];

const field =
  'rounded-lg border border-primary/20 bg-primary-invert px-3 py-2 text-sm text-primary';
const button =
  'rounded-lg border border-primary/20 bg-secondary-invert px-4 py-2 text-sm font-medium text-primary hover:border-blue-crayola-c';

export const App = () => {
  const [category, setCategory] = useState<TTryOnCategory>('LIP');
  const [subCategory, setSubCategory] = useState<string>(TRY_ON_MAP.LIP[0]);
  const [hasSelection, setHasSelection] = useState(true);
  const [withShades, setWithShades] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [selectable, setSelectable] = useState(false);
  const [entry, setEntry] = useState<'lazy' | 'eager'>('lazy');
  const [assets, setAssets] = useState<'local' | 'cdn'>('local');
  const [uploadErrors, setUploadErrors] = useState<'inline' | 'callback'>('inline');
  const [applied, setApplied] = useState<TTryOnSelection | null>(null);
  const [closes, setCloses] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const Modal = entry === 'lazy' ? LazyTryOnModal : EagerTryOnModal;
  const tryOn = hasSelection ? ({ category, subCategory } as TTryOnSelection) : undefined;

  const open = (isSelectable: boolean) => {
    setSelectable(isSelectable);
    setIsOpen(true);
  };

  return (
    <main className="bg-primary-invert text-primary mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Try-on playground</h1>

      <section className="flex flex-wrap items-end gap-3" aria-label="What the page passes">
        <label className="flex flex-col gap-1 text-xs">
          Category
          <select
            className={field}
            value={category}
            onChange={(event) => {
              const next = event.target.value as TTryOnCategory;

              setCategory(next);
              setSubCategory(TRY_ON_MAP[next][0]);
            }}
          >
            {TRYON_CATEGORY_OPTIONS.map(({ category: value, title }) => (
              <option key={value} value={value}>
                {title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Subcategory
          <select
            className={field}
            value={subCategory}
            onChange={(event) => {
              setSubCategory(event.target.value);
            }}
          >
            {TRY_ON_MAP[category].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={hasSelection}
            onChange={(event) => {
              setHasSelection(event.target.checked);
            }}
          />
          the product has a try-on
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={withShades}
            onChange={(event) => {
              setWithShades(event.target.checked);
            }}
          />
          the product has colour variants
        </label>
      </section>

      <section
        className="flex flex-wrap items-end gap-3"
        aria-label="How the page uses the package"
      >
        <label className="flex flex-col gap-1 text-xs">
          Import
          <select
            className={field}
            value={entry}
            onChange={(event) => {
              setEntry(event.target.value as 'lazy' | 'eager');
            }}
          >
            <option value="lazy">root (loads the engines when opened)</option>
            <option value="eager">/modal (in the bundle)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Files
          <select
            className={field}
            value={assets}
            onChange={(event) => {
              setAssets(event.target.value as 'local' | 'cdn');
            }}
          >
            <option value="local">the assets package of this repo (/)</option>
            <option value="cdn">the CDN (needs the package published)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          A turned down photo
          <select
            className={field}
            value={uploadErrors}
            onChange={(event) => {
              setUploadErrors(event.target.value as 'inline' | 'callback');
            }}
          >
            <option value="inline">shown by the modal</option>
            <option value="callback">told to onUploadError</option>
          </select>
        </label>
      </section>

      <section className="flex flex-wrap gap-3">
        <button
          type="button"
          className={button}
          onClick={() => {
            open(false);
          }}
        >
          Open as a shopper
        </button>
        <button
          type="button"
          className={button}
          onClick={() => {
            open(true);
          }}
        >
          Open to set up a product (selectable)
        </button>
      </section>

      <section className="text-sm" aria-label="What happened">
        <p data-testid="applied">
          Applied: {applied ? `${applied.category} / ${applied.subCategory}` : 'nothing yet'}
        </p>
        <p data-testid="closes">Closed {closes} times</p>
        {uploadError && <p data-testid="upload-error">onUploadError: {uploadError}</p>}
      </section>

      <Modal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setCloses((count) => count + 1);
        }}
        tryOn={tryOn}
        shades={withShades ? PRODUCT_SHADES : []}
        assets={assets === 'local' ? { baseUrl: '/' } : undefined}
        selectable={selectable}
        onApply={setApplied}
        onUploadError={
          uploadErrors === 'callback'
            ? (error) => {
                setUploadError(`${error.title} - ${error.description}`);
              }
            : undefined
        }
      />
    </main>
  );
};
