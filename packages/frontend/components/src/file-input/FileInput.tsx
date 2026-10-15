import { Icon } from '@iconify/react';
import { type ChangeEvent, type InputHTMLAttributes, useId, useMemo, useState } from 'react';

import {
  type IFieldBase,
  InputError,
  InputIcon,
  InputLabel,
  type TInputIcons,
} from '../inputs/index.js';
import {
  type IMediaLabels,
  MediaCarousel,
  MediaModal,
  type TMediaOption,
  type TMediaResource,
  type TPlayerProps,
} from '../media/index.js';
import { registerFileInputIcons } from './file-input-icons.js';
import { getMediaType as defaultGetMediaType } from './media-type.js';
import { useObjectUrls } from './useObjectUrls.js';

/** A file the person chose, or the address of one that is already saved. */
export type TFileInputValue = File | string;

/** The words on the field and the buttons. English by default. */
export interface IFileInputLabels extends IMediaLabels {
  /** What the field says for one file. */
  choose: string;
  /** What the field says when it takes several files. */
  chooseMany: string;
  /** The name of the tile that adds more files to the ones chosen. */
  addMore: string;
}

export interface IFileInput extends Omit<IFieldBase, 'error'> {
  /** The attributes of the `<input type="file">`; `value` is what is shown under the field. */
  fileInputProps: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> & {
    /** The file (or its address) or the list of them, to show a thumbnail for each. */
    value?: TFileInputValue | readonly TFileInputValue[];
  };
  /** An icon at each end of the field. One with an `onClick` is a button and needs a `label`. */
  icons?: TInputIcons;
  /**
   * What is wrong with each file, in the order of the files (`undefined` or `''` for one that is
   * fine). Each message is shown under the field, and the thumbnail of the file gets a red border.
   */
  errors?: readonly (string | undefined)[];
  /** Adds a button on each thumbnail that calls this with the index of its file. */
  handleRemove?: (index: number) => void;
  /** The class of the backdrop of the dialog that shows a file big. */
  mediaModalClassName?: string;
  /** The class of the row of thumbnails. */
  mediaCarouselClassName?: string;
  /** Says if a file or an address is a picture or a video. The default looks at the type and at the ending. */
  getMediaType?: (value: TFileInputValue) => TMediaResource;
  labels?: Partial<IFileInputLabels>;
  /** What to give the players of the videos, e.g. `getPoster` to ask a service for their posters. */
  playerProps?: TPlayerProps;
}

interface IPreview {
  /** The place of the file in the list the app gave. */
  index: number;
  media: TMediaOption;
}

const asList = (value: TFileInputValue | readonly TFileInputValue[] | undefined) => {
  if (value === undefined) return [];

  return typeof value === 'string' || value instanceof File ? [value] : value;
};

/**
 * A field to choose files, with a thumbnail under it for each file that is chosen. A thumbnail opens
 * the file big, in a dialog where the others can be browsed, and can have a button that removes it.
 *
 * - It is a real file input: the keyboard reaches it (it shows the focus on the field), and pressing
 *   the label or the field opens the browser's chooser. The same file can be chosen again (the input
 *   is emptied after each choice).
 * - The files are `value` (the app keeps them, as with any field); a text in the list is the address
 *   of a file that is already saved, shown as it is.
 * - The messages of `errors` are said as they show up, and the thumbnail of a file with a problem has a
 *   red border.
 */
export const FileInput = ({
  label = '',
  className = '',
  containerClassName = '',
  mediaModalClassName = '',
  mediaCarouselClassName = '',
  errors = [],
  handleRemove,
  fileInputProps,
  icons,
  getMediaType = defaultGetMediaType,
  labels,
  playerProps,
}: IFileInput) => {
  registerFileInputIcons();

  const {
    value,
    onChange,
    placeholder,
    disabled,
    multiple,
    accept,
    id: givenId,
    ...inputProps
  } = fileInputProps;
  const baseId = useId();
  const id = givenId ?? fileInputProps.name ?? `${baseId}-field`;
  const errorsId = `${id}-errors`;
  const text = {
    choose: labels?.choose ?? 'Choose file',
    chooseMany: labels?.chooseMany ?? 'Choose files',
    addMore: labels?.addMore ?? 'Add more files',
  };

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const values = useMemo(() => asList(value), [value]);
  const files = useMemo(() => values.filter((item) => item instanceof File), [values]);
  const urls = useObjectUrls(files);

  // A file has its thumbnail once it has an address; its place in the list is kept for the app.
  const previews = useMemo(
    () =>
      values.flatMap<IPreview>((item, index) => {
        const url = typeof item === 'string' ? item : urls.get(item);

        return url === undefined ? [] : [{ index, media: { type: getMediaType(item), url } }];
      }),
    [values, urls, getMediaType],
  );
  const media = useMemo(() => previews.map((preview) => preview.media), [previews]);
  const messages = errors.flatMap((error, index) => (error ? [{ error, index }] : []));
  const hasErrors = messages.length > 0;

  // The dialog is closed when the file it was opened on is no longer there.
  if (openIndex !== null && openIndex >= previews.length) setOpenIndex(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;

    onChange?.(event);
    // emptied, so the same file can be chosen again
    event.target.value = '';
  };

  return (
    <div className={`flex max-w-full min-w-0 flex-col gap-1.5 ${containerClassName}`}>
      <div className="relative">
        <InputLabel htmlFor={id}>{label}</InputLabel>
        <div
          data-invalid={hasErrors ? '' : undefined}
          className={`border-primary/10 bg-smoke-eerie focus-within:border-blue-crayola-c has-focus-visible:border-blue-crayola-c data-invalid:border-red-c group flex items-center justify-between gap-3 rounded-lg border px-3 ${className}`}
        >
          <InputIcon icon={icons?.left} />
          <label
            htmlFor={id}
            className={`text-primary/30 min-w-0 flex-1 truncate py-2 text-[13px] xl:py-3 ${
              disabled ? 'cursor-not-allowed' : 'cursor-pointer'
            } ${inputProps.className ?? ''}`}
          >
            {placeholder ?? (multiple ? text.chooseMany : text.choose)}
            <input
              {...inputProps}
              id={id}
              type="file"
              accept={accept ?? 'image/*'}
              multiple={multiple}
              disabled={disabled}
              aria-invalid={hasErrors ? true : undefined}
              aria-describedby={
                [inputProps['aria-describedby'], hasErrors ? errorsId : undefined]
                  .filter(Boolean)
                  .join(' ') || undefined
              }
              onChange={handleChange}
              className="sr-only"
            />
          </label>
          <InputIcon icon={icons?.right} />
        </div>
      </div>

      {hasErrors && (
        <div id={errorsId} className="space-y-1">
          {messages.map(({ error, index }) => (
            <InputError
              key={index}
              error={messages.length > 1 ? `${String(index + 1)}. ${error}` : error}
            />
          ))}
        </div>
      )}

      {previews.length > 0 && (
        <div className="border-primary/10 bg-smoke-eerie relative flex rounded-lg border">
          {multiple && (
            <div className="sticky left-0 mr-1 ml-2 flex items-center justify-start gap-3">
              <label
                htmlFor={id}
                className={`border-primary/50 bg-tertiary-invert hover:border-tertiary flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border shadow-xs transition-colors duration-300 md:size-16 lg:size-20 ${
                  disabled ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <span className="sr-only">{text.addMore}</span>
                <Icon
                  aria-hidden="true"
                  icon="solar:gallery-add-linear"
                  className="text-primary size-[40%]"
                />
              </label>
              <div
                aria-hidden="true"
                className="group bg-hr-line my-2 h-14 w-px shrink-0 md:h-16 lg:h-20"
              />
            </div>
          )}
          <MediaCarousel
            className={mediaCarouselClassName}
            gradientClassNames={{
              left: 'from-smoke-eerie rounded-l-[7px] z-2',
              right: 'from-smoke-eerie rounded-r-[7px] z-2',
            }}
            media={media}
            invalid={previews.map((preview) => !!errors.at(preview.index))}
            labels={labels}
            playerProps={playerProps}
            onClick={setOpenIndex}
            handleRemove={
              handleRemove &&
              ((position) => {
                const preview = previews.at(position);

                if (preview) handleRemove(preview.index);
              })
            }
          />
        </div>
      )}

      <MediaModal
        className={mediaModalClassName}
        media={media}
        isOpen={openIndex !== null}
        selected={openIndex}
        onClose={() => {
          setOpenIndex(null);
        }}
        labels={labels}
        playerProps={playerProps}
        handleRemove={
          handleRemove &&
          ((position) => {
            const preview = previews.at(position);

            if (preview) handleRemove(preview.index);
          })
        }
      />
    </div>
  );
};
