import { Icon } from '@iconify/react';
import { type ComponentProps, memo, useCallback, useEffect, useRef, useState } from 'react';

import { TOAST_TYPE } from '../lib/constants.js';
import type { IClassName } from '../types/component.js';
import { Button } from '../ui/Button.js';
import { registerToastIcons } from './toast-icons.js';
import { useToastStore } from './toast.store.js';
import type { IUploadItem, TToast, TToastItem, TUploadItemStatus } from './types.js';
import {
  getUploadItemFilesDone,
  getUploadItemPercent,
  getUploadsSummary,
  type IUploadsSummary,
} from './uploads.js';

// Bundles the icons the toasts use, so they also show without a network (see toast-icons.ts)
registerToastIcons();

const CircularProgress = ({ progress, ...props }: { progress: number } & ComponentProps<'svg'>) => {
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" {...props}>
      <circle
        cx="12"
        cy="12"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.15}
        strokeWidth="1.5"
      />
      <circle
        cx="12"
        cy="12"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 12 12)"
      />

      <text
        x="12"
        y="12"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="6"
        fontWeight="500"
        fill="currentColor"
      >
        {progress}%
      </text>
    </svg>
  );
};

const GREEN_RGB = 'var(--primary-green-rgb)';
const RED_RGB = 'var(--primary-red-rgb)';

const UPLOAD_ITEM_ICON: Record<TUploadItemStatus, { icon: string; rgb: string }> = {
  pending: { icon: 'solar:clock-circle-linear', rgb: 'var(--primary-rgb)' },
  uploading: { icon: 'beautinique:loading-spin', rgb: 'var(--primary-rgb)' },
  success: { icon: 'solar:check-circle-linear', rgb: GREEN_RGB },
  error: { icon: 'solar:danger-triangle-linear', rgb: RED_RGB },
};

/** The colour of an uploads toast follows how its uploads are doing. */
const uploadsRgb = ({ isSettled, failed }: IUploadsSummary) => {
  if (!isSettled) return 'var(--primary-rgb)';

  return failed > 0 ? RED_RGB : GREEN_RGB;
};

const uploadsSummaryText = ({ filesDone, filesTotal, failed, isSettled }: IUploadsSummary) => {
  if (!isSettled) return `${String(filesDone)} of ${String(filesTotal)} uploaded`;
  if (failed === 0) return filesTotal === 1 ? 'Uploaded' : `All ${String(filesTotal)} uploaded`;

  return `${String(filesDone)} of ${String(filesTotal)} uploaded, ${String(failed)} failed`;
};

/** While uploading the title is the caller's (e.g. "Please wait..."); once over it says how it went. */
const uploadsHeading = (title: string, { failed, isSettled }: IUploadsSummary, uploads: number) => {
  if (!isSettled) return title;
  if (failed === 0) return 'Upload complete';

  return failed === uploads ? 'Upload failed' : 'Some uploads failed';
};

const UploadRow = ({ item }: { item: IUploadItem }) => {
  const percent = getUploadItemPercent(item);
  const { icon, rgb } = UPLOAD_ITEM_ICON[item.status];

  return (
    <li data-status={item.status} className="flex items-center gap-1.5 md:gap-2">
      <Icon
        icon={icon}
        className="size-3.5 shrink-0 md:size-4"
        style={{ color: `rgb(${rgb})`, opacity: item.status === 'pending' ? 0.4 : 1 }}
      />

      <span className="text-primary w-20 shrink-0 truncate text-[9px] md:w-28 md:text-xs">
        {item.label}
      </span>

      <div
        role="progressbar"
        aria-label={`${item.label} upload`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="bg-primary/10 h-1 min-w-0 flex-1 overflow-hidden rounded-full"
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${String(percent)}%`, backgroundColor: `rgb(${rgb})` }}
        />
      </div>

      <span className="text-tertiary w-8 shrink-0 text-right text-[9px] tabular-nums md:text-xs">
        {getUploadItemFilesDone(item)}/{item.fileSizes.length}
      </span>
    </li>
  );
};

interface IUploadsBodyProps {
  title: string;
  description?: string;
  items: IUploadItem[];
  summary: IUploadsSummary;
  rgb: string;
}

const UploadsBody = ({ title, description, items, summary, rgb }: IUploadsBodyProps) => (
  <div className="flex min-w-0 flex-1 flex-col gap-1.5" aria-live="polite">
    <div className="flex flex-col gap-0.5">
      <p className="line-clamp-1 text-xs font-semibold md:text-sm" style={{ color: `rgb(${rgb})` }}>
        {uploadsHeading(title, summary, items.length)}
      </p>

      {description && (
        <p className="text-tertiary line-clamp-1 text-[9px]/3 md:text-xs">{description}</p>
      )}

      <p className="text-tertiary text-[9px]/3 tabular-nums md:text-xs">
        {uploadsSummaryText(summary)}
      </p>
    </div>

    {items.length > 1 && (
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <UploadRow key={item.id} item={item} />
        ))}
      </ul>
    )}
  </div>
);

const cardConfig = (type: TToast['type']) => {
  switch (type) {
    case TOAST_TYPE.success:
      return { iconName: 'solar:check-circle-linear', rgb: GREEN_RGB };
    case TOAST_TYPE.error:
      return { iconName: 'solar:danger-triangle-linear', rgb: RED_RGB };
    case TOAST_TYPE.warning:
      return { iconName: 'solar:danger-triangle-linear', rgb: 'var(--primary-yellow-rgb)' };
    case TOAST_TYPE.progress:
    case TOAST_TYPE.uploads:
      return { iconName: '', rgb: 'var(--primary-rgb)' };
    case TOAST_TYPE.loading:
      return { iconName: 'beautinique:loading-spin', rgb: 'var(--primary-rgb)' };
    case TOAST_TYPE.default:
    case TOAST_TYPE.custom:
    default:
      return { iconName: 'solar:info-circle-outline', rgb: 'var(--primary-rgb)' };
  }
};

const ToasterItem = (props: TToastItem & IClassName) => {
  const {
    className = '',
    type,
    icon,
    buttonProps,
    isClosable = true,
    autoClose = true,
    closeTimer = 5000,
  } = props;

  const remove = useToastStore((s) => s.remove);

  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // An uploads toast stays while anything is still uploading, then closes by itself (later when
  // something failed, so it can be read).
  const uploadsSummary = props.type === TOAST_TYPE.uploads ? getUploadsSummary(props.items) : null;
  const isUploadsSettled = uploadsSummary?.isSettled ?? false;

  let resolvedAutoClose = autoClose;
  let resolvedIsClosable = isClosable;
  let resolvedCloseTimer = closeTimer;

  if (TOAST_TYPE.loading === type || TOAST_TYPE.progress === type) {
    resolvedAutoClose = false;
    resolvedIsClosable = false;
  } else if (uploadsSummary) {
    resolvedAutoClose = isUploadsSettled;
    resolvedIsClosable = isUploadsSettled;
    resolvedCloseTimer = uploadsSummary.failed > 0 ? 8000 : 2500;
  }

  const config = uploadsSummary
    ? { iconName: '', rgb: uploadsRgb(uploadsSummary) }
    : cardConfig(type);

  const handleClose = useCallback(() => {
    setVisible(false);

    timeoutRef.current = setTimeout(() => {
      setMounted(false);
      remove(props.id);
    }, 300);
  }, [remove, props.id]);

  useEffect(() => {
    const enterTimer = setTimeout(() => {
      setVisible(true);
    }, 50);

    let autoTimer: ReturnType<typeof setTimeout> | null = null;

    if (resolvedAutoClose) {
      autoTimer = setTimeout(() => {
        handleClose();
      }, resolvedCloseTimer);
    }

    return () => {
      clearTimeout(enterTimer);
      if (autoTimer) clearTimeout(autoTimer);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [resolvedAutoClose, resolvedCloseTimer, handleClose]);

  if (!mounted) return null;

  const isCustom = type === TOAST_TYPE.custom;

  return (
    <div
      className={`rounded-xl border-2 transition-all duration-300 ease-in-out ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      } ${className}`}
      style={{
        borderColor: `rgba(${config.rgb}, 0.2)`,
        boxShadow: `0 10px 10px 0px rgba(${config.rgb}, 0.1)`,
      }}
    >
      <div className="bg-secondary-invert flex w-full items-center gap-2 rounded-[10.25px] p-1.5 md:p-2.5 lg:p-3 [&>svg]:size-5 [&>svg]:shrink-0 [&>svg]:md:size-6 [&>svg]:lg:size-7">
        {icon ??
          (props.type === TOAST_TYPE.progress ? (
            <CircularProgress
              progress={props.progress}
              style={{ strokeColor: `rgb(${config.rgb})` }}
            />
          ) : uploadsSummary ? (
            <CircularProgress
              progress={uploadsSummary.percent}
              style={{ color: `rgb(${config.rgb})` }}
            />
          ) : (
            <Icon icon={config.iconName} style={{ color: `rgb(${config.rgb})` }} />
          ))}

        {props.type === TOAST_TYPE.uploads && uploadsSummary ? (
          <UploadsBody
            title={props.title}
            description={props.description}
            items={props.items}
            summary={uploadsSummary}
            rgb={config.rgb}
          />
        ) : (
          <div className="flex flex-1 items-center justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              {!isCustom && 'title' in props && (
                <p
                  className="line-clamp-1 text-xs font-semibold md:text-sm"
                  style={{ color: `rgb(${config.rgb})` }}
                >
                  {props.title}
                </p>
              )}

              {!isCustom && 'description' in props && (
                <p className="text-tertiary line-clamp-2 text-[9px]/3 whitespace-pre-line md:text-xs">
                  {props.description}
                </p>
              )}
              {isCustom && 'children' in props && props.children}
            </div>

            {buttonProps && type !== TOAST_TYPE.loading && type !== TOAST_TYPE.progress && (
              <Button
                {...buttonProps}
                content={buttonProps.content ?? 'Try Again'}
                pattern={buttonProps.pattern ?? 'secondary'}
                className={`w-fit! rounded-md! px-2! py-1! pt-1.5! text-[10px] whitespace-nowrap md:text-xs! ${buttonProps.className ?? ''}`}
              />
            )}
          </div>
        )}

        {resolvedIsClosable && (
          <Icon
            icon="lucide:x"
            className="text-primary cursor-pointer md:size-5"
            onClick={handleClose}
          />
        )}
      </div>
    </div>
  );
};

/*
 * The store changes only the toast that was updated (the others keep the same object), and a toast
 * that is uploading is updated many times a second. With `memo` the toasts that did not change
 * are not rendered again for each of those updates.
 */
export const Toaster = memo(ToasterItem);

export const ToastContainer = () => {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="base:max-w-sm fixed right-2 bottom-2 z-999 flex w-full max-w-xs flex-col gap-2 sm:max-w-md md:right-4 md:bottom-4 md:max-w-lg lg:right-8 lg:bottom-8 lg:max-w-xl">
      {toasts.map((toast) => (
        <Toaster key={toast.id} {...toast} id={toast.id} />
      ))}
    </div>
  );
};
