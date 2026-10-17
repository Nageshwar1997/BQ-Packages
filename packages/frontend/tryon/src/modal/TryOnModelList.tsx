import { ScrollableGradientContainer } from '@beautinique/frontend-components';
import type { TTryOnCategory } from '@beautinique/frontend-types';
import { Icon } from '@iconify/react';

import { TRY_ON_CATEGORY_MAP } from '@beautinique/frontend-constants';
import { resolveTryOnAssetUrl } from '../constants/assets.js';
import {
  TRYON_MODE_MAP,
  TRYON_MODEL_IMAGES_FACE,
  TRYON_MODEL_IMAGES_HAIR,
  TRYON_MODEL_IMAGES_HAND,
} from '../constants/index.js';
import type { TTryOnMode } from '../types/index.js';
import { useTryOnAssets } from './TryOnAssetsContext.js';

// `/images/tryon/models/(face/hand/hair)/Central-Indian.webp` -> "Central Indian" - every button below used to
// share the exact same generic `alt="Model"`/no aria-label, so a screen reader announced every
// single one identically ("Model, button") with no way to tell them apart. The filenames
// themselves already carry a real, human-readable label (see the `TRYON_MODEL_IMAGES_*` sets) -
// deriving from that instead of hardcoding a parallel label list means it can never drift out of
// sync with the actual asset filenames.
const getModelLabel = (url: string): string => {
  const fileName = url.split('/').at(-1) ?? url;
  return fileName.replace(/\.\w+$/, '').replaceAll('-', ' ');
};

// LIP/FACE/EYE all track the same face mesh, so they share the face photo set - HAIR and NAIL get
// their own dedicated sets instead (a face photo has no hand in it for NAIL to detect, and isn't
// framed to show full hair length the way HAIR's own set is - see TRYON_MODEL_IMAGES_HAIR/
// TRYON_MODEL_IMAGES_HAND's own comment in constants/tryon-constants/index.ts). Written as a real
// `switch` (not a lookup object) so a 6th category added to `TTryOnCategory` without a case here
// is a TS error at the `never` default, not a silent fallback to the wrong photo set.
const getModelImages = (category: TTryOnCategory): string[] => {
  switch (category) {
    case TRY_ON_CATEGORY_MAP.HAIR:
      return TRYON_MODEL_IMAGES_HAIR;
    case TRY_ON_CATEGORY_MAP.NAIL:
      return TRYON_MODEL_IMAGES_HAND;
    case TRY_ON_CATEGORY_MAP.LIP:
    case TRY_ON_CATEGORY_MAP.FACE:
    case TRY_ON_CATEGORY_MAP.EYE:
      return TRYON_MODEL_IMAGES_FACE;
    default: {
      const exhaustiveCheck: never = category;
      throw new Error(`Unhandled TTryOnCategory: ${String(exhaustiveCheck)}`);
    }
  }
};

interface ITryOnModelListProps {
  // Vertical for the desktop sidebar (TryOnSidebar.tsx); horizontal for the mobile "Models"
  // bottom sheet (TryOnBottomSheet.tsx via TryOnModal) - same list, same styling either way.
  direction: 'horizontal' | 'vertical';
  category: TTryOnCategory;
  mode: TTryOnMode;
  previewImageUrl: string | null;
  onModelSelect: (url: string) => void;
  disabled?: boolean;
  className?: string;
}

const TryOnModelList = ({
  direction,
  category,
  mode,
  previewImageUrl,
  onModelSelect,
  disabled = false,
  className = '',
}: ITryOnModelListProps) => {
  const assets = useTryOnAssets();

  return (
    <ScrollableGradientContainer
      direction={direction}
      label="Models"
      className={`[&>div]:gap-2.5 ${direction === 'vertical' ? '[&>div]:justify-start' : 'py-1'} ${disabled ? 'opacity-50' : ''} ${className}`}
    >
      {getModelImages(category).map((path) => {
        // the constants hold paths inside the assets package; the address is made from `assets`
        const url = resolveTryOnAssetUrl(path, assets);
        const label = getModelLabel(path);
        const selected = mode === TRYON_MODE_MAP.UPLOAD && previewImageUrl === url;

        return (
          <button
            key={path}
            type="button"
            aria-label={`Try on with the ${label} model`}
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => {
              onModelSelect(url);
            }}
            className={`group relative aspect-square shrink-0 cursor-pointer overflow-hidden rounded-2xl border-2 transition-all duration-300 focus-visible:-outline-offset-1 disabled:cursor-not-allowed ${
              direction === 'horizontal' ? 'size-20 sm:size-24' : ''
            } ${
              selected
                ? 'border-blue-crayola-c shadow-secondary-btn'
                : 'border-primary/10 hover:border-primary/40 hover:shadow-md'
            }`}
          >
            <img
              src={url}
              alt={label}
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Name caption - the `aria-label` above already carries it for assistive tech, this is
              just so a sighted shopper can tell the (visually similar) photos apart too. */}
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 truncate bg-linear-to-t from-black/70 to-transparent px-1.5 pt-4 pb-1 text-center text-[10px] leading-none font-medium text-white"
            >
              {label}
            </span>
            {selected && (
              <span
                aria-hidden
                className="bg-blue-crayola-c absolute top-1 right-1 flex size-5 items-center justify-center rounded-full text-white shadow-md"
              >
                <Icon icon="solar:check-read-linear" className="size-3.5" />
              </span>
            )}
          </button>
        );
      })}
    </ScrollableGradientContainer>
  );
};

export default TryOnModelList;
