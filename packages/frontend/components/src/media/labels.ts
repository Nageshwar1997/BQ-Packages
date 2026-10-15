export type TMediaResource = 'image' | 'video';

/** One picture or video of a gallery. */
export interface TMediaOption {
  type: TMediaResource;
  url: string;
}

/**
 * The words the media components say to assistive technology (and in the counter). They are English
 * by default; give the ones you change in the `labels` prop of any of the components.
 */
export interface IMediaLabels {
  /** The name of the whole gallery (and of the dialog that shows it). */
  gallery: string;
  /** The name of the row of thumbnails, once it scrolls. */
  thumbnails: string;
  /** What a thumbnail button says it does. */
  select: (item: TMediaOption, index: number, total: number) => string;
  /** The alternative text of the picture (the name of the video) that is shown big. */
  preview: (item: TMediaOption, index: number, total: number) => string;
  /** What the button that removes an item says. */
  remove: (item: TMediaOption, index: number) => string;
  previous: string;
  next: string;
  /** The close button of the dialog. */
  close: string;
  /** The "2 of 5" between the arrows, read out when it changes. */
  counter: (index: number, total: number) => string;
}

const position = (index: number, total: number) => `${String(index + 1)} of ${String(total)}`;

const KIND: Record<TMediaResource, string> = { image: 'Image', video: 'Video' };

/** The words used when the app gives none. */
export const MEDIA_LABELS: IMediaLabels = {
  gallery: 'Media gallery',
  thumbnails: 'Thumbnails',
  select: (item, index, total) => `Show ${item.type} ${position(index, total)}`,
  preview: (item, index, total) => `${KIND[item.type]} ${position(index, total)}`,
  remove: (item, index) => `Remove ${item.type} ${String(index + 1)}`,
  previous: 'Previous',
  next: 'Next',
  close: 'Close',
  counter: position,
};

/** The labels the app gave, with the default for each it left out. */
export const resolveLabels = (labels?: Partial<IMediaLabels>): IMediaLabels => ({
  gallery: labels?.gallery ?? MEDIA_LABELS.gallery,
  thumbnails: labels?.thumbnails ?? MEDIA_LABELS.thumbnails,
  select: labels?.select ?? MEDIA_LABELS.select,
  preview: labels?.preview ?? MEDIA_LABELS.preview,
  remove: labels?.remove ?? MEDIA_LABELS.remove,
  previous: labels?.previous ?? MEDIA_LABELS.previous,
  next: labels?.next ?? MEDIA_LABELS.next,
  close: labels?.close ?? MEDIA_LABELS.close,
  counter: labels?.counter ?? MEDIA_LABELS.counter,
});
