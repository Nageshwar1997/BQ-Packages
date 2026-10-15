import { Icon } from '@iconify/react';

import { hasContent } from '../lib/content.js';
import type { IClassName, ITitleDescription } from '../types/component.js';
import { Divider, GradientText } from '../ui/index.js';
import { registerLayoutIcons } from './layout-icons.js';
import { LoadingRings } from './LoadingRings.js';

type TDescribedStatus = ITitleDescription &
  IClassName & {
    status: 'error' | 'empty' | 'success';
    /** A line under the message. */
    divider?: boolean;
  };

interface ILoadingStatus extends IClassName {
  status: 'loading';
  /** The word under the rings. @default 'Loading....' */
  text?: string;
}

export type TApiStatus = TDescribedStatus | ILoadingStatus;

const STATUS_ICON: Record<TDescribedStatus['status'], string> = {
  error: 'solar:danger-triangle-linear',
  success: 'solar:check-circle-linear',
  empty: 'solar:folder-error-linear',
};

/**
 * What a request that is not finished or not good says, in the middle of the place where its result
 * would be: rings while it loads, and an icon with a title and a description when it failed
 * (`status="error"`, said to a screen reader as an alert), came back empty or worked.
 */
export const ApiStatus = ({ className = '', ...props }: TApiStatus) => {
  registerLayoutIcons();

  return (
    <div
      className={`m-auto flex h-full min-h-60 w-full flex-col items-center justify-center gap-2 p-4 ${className}`}
    >
      {props.status === 'loading' ? (
        <LoadingRings text={props.text ?? 'Loading....'} />
      ) : (
        <div
          role={props.status === 'error' ? 'alert' : 'status'}
          className="flex flex-col items-center justify-center gap-2"
        >
          <div className="bg-primary/5 grid size-8 place-items-center rounded-full p-2 md:size-10">
            <Icon icon={STATUS_ICON[props.status]} className="text-silver-jet size-full shrink-0" />
          </div>

          {hasContent(props.title) && (
            <GradientText type="silver" className="text-sm text-shadow-sm sm:text-base md:text-lg">
              {props.title}
            </GradientText>
          )}
          {hasContent(props.description) && (
            <div className="text-silver-jet text-center text-xs leading-6 font-normal sm:text-sm">
              {props.description}
            </div>
          )}
          {props.divider === true && <Divider className="mt-1" />}
        </div>
      )}
    </div>
  );
};
