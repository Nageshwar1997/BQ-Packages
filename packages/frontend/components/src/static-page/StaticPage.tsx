import { Icon } from '@iconify/react';
import { type ReactNode, useId } from 'react';

import type { IChildren, IClassName } from '../types/component.js';
import { GradientText } from '../ui/index.js';
import { registerStaticPageIcons } from './static-page-icons.js';

/*
 * The parts of a page that is only content (company, legal and information pages): a header, some
 * sections, and a closing call to action, in the same column. The headings are real headings
 * (the page `h1`, each section `h2`, each card `h3`), the lists are lists, and the icons are decoration
 * that assistive technology skips. The icons are given by name: they come from the Iconify API unless
 * the app has them registered.
 */

/** The column all the parts sit in. */
export const StaticPageLayout = ({ children }: IChildren) => (
  <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14">
    {children}
  </div>
);

export interface IStaticPageHeader {
  /** An icon of Iconify, in a circle above the title. */
  icon: string;
  /** The title of the page: it is the `h1`. */
  title: string;
  description: ReactNode;
  /** Something under the description, e.g. `LastUpdatedBadge`. */
  meta?: ReactNode;
}

export const StaticPageHeader = ({ icon, title, description, meta }: IStaticPageHeader) => (
  <header className="flex flex-col items-center gap-4 text-center">
    <span
      aria-hidden="true"
      className="bg-accent-duo flex size-16 items-center justify-center rounded-full shadow-lg sm:size-20"
    >
      <Icon icon={icon} className="size-8 text-white sm:size-10" />
    </span>
    <GradientText
      as="h1"
      type="accent"
      text={title}
      className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl"
    />
    <p className="text-secondary max-w-2xl text-sm sm:text-base">{description}</p>
    {meta}
  </header>
);

export interface ILastUpdatedBadge {
  /** When the page was changed. */
  date: Date | string | number;
  /** @default 'Last updated' */
  label?: string;
  /** The language of the date. It is fixed (not the one of the machine) so a server and a browser write the same. @default 'en-US' */
  locale?: string;
}

/**
 * "Last updated 15 Oct 2026", with the date in a `<time>`. The day is the day of the date in UTC, so
 * it does not depend on where the page is drawn.
 */
export const LastUpdatedBadge = ({
  date,
  label = 'Last updated',
  locale = 'en-US',
}: ILastUpdatedBadge) => {
  registerStaticPageIcons();

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) return null;

  return (
    <span className="text-primary/50 flex items-center gap-1 text-xs sm:text-sm">
      <Icon aria-hidden="true" icon="solar:calendar-mark-linear" className="size-3.5" />
      {label}{' '}
      <time dateTime={value.toISOString().slice(0, 10)}>
        {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(value)}
      </time>
    </span>
  );
};

export interface IStaticPageSection extends IClassName {
  /** The heading of the section: an `h2`. Without it the section has none. */
  title?: string;
  children: ReactNode;
}

export const StaticPageSection = ({ title, children, className = 'gap-4' }: IStaticPageSection) => {
  const titleId = useId();

  return (
    <section aria-labelledby={title ? titleId : undefined} className={`flex flex-col ${className}`}>
      {title && (
        <GradientText
          as="h2"
          id={titleId}
          type="accent"
          text={title}
          className="text-xl font-semibold sm:text-2xl"
        />
      )}
      {children}
    </section>
  );
};

export interface IInfoCard {
  icon: string;
  /** A heading (an `h3`). */
  title: string;
  description: string;
}

export const InfoCard = ({ icon, title, description }: IInfoCard) => (
  <div className="border-primary/10 bg-secondary-invert hover:border-primary/20 flex items-start gap-3 rounded-xl border p-4 transition-colors motion-reduce:transition-none">
    <span
      aria-hidden="true"
      className="bg-accent-duo flex size-9 shrink-0 items-center justify-center rounded-lg"
    >
      <Icon icon={icon} className="size-5 text-white" />
    </span>
    <div>
      <h3 className="text-primary text-sm font-semibold sm:text-base">{title}</h3>
      <p className="text-secondary text-xs sm:text-sm">{description}</p>
    </div>
  </div>
);

export interface IInfoCardGrid {
  items: readonly IInfoCard[];
  /** How many cards in a row from `sm:` up. @default 2 */
  columns?: 2 | 3;
}

export const InfoCardGrid = ({ items, columns = 2 }: IInfoCardGrid) => (
  <div className={`grid grid-cols-1 gap-4 ${columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
    {items.map((item) => (
      <InfoCard key={item.title} {...item} />
    ))}
  </div>
);

export interface IChecklist {
  items: readonly string[];
  /** @default 'solar:check-circle-linear' */
  icon?: string;
  iconClassName?: string;
}

/** Short statements in a list, each in its own bordered row with an icon. */
export const Checklist = ({
  items,
  icon = 'solar:check-circle-linear',
  iconClassName = 'text-primary-green',
}: IChecklist) => {
  registerStaticPageIcons();

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li
          key={item}
          className="border-primary/10 bg-secondary-invert flex items-start gap-3 rounded-xl border p-3 sm:p-4"
        >
          <Icon
            aria-hidden="true"
            icon={icon}
            className={`mt-0.5 size-4.5 shrink-0 ${iconClassName}`}
          />
          <span className="text-secondary text-xs sm:text-sm">{item}</span>
        </li>
      ))}
    </ul>
  );
};

export interface IHighlightNote {
  /** @default 'solar:danger-triangle-linear' */
  icon?: string;
  title: string;
  children: ReactNode;
}

/** A note that stands out: an icon beside a title and a text. It is a `note`, named by its title. */
export const HighlightNote = ({
  icon = 'solar:danger-triangle-linear',
  title,
  children,
}: IHighlightNote) => {
  registerStaticPageIcons();

  const titleId = useId();

  return (
    <div
      role="note"
      aria-labelledby={titleId}
      className="border-primary/10 bg-secondary-invert flex items-start gap-3 rounded-xl border p-4 sm:p-5"
    >
      <Icon aria-hidden="true" icon={icon} className="text-primary/60 mt-0.5 size-5 shrink-0" />
      <div className="flex flex-col gap-1.5">
        <p id={titleId} className="text-primary text-sm font-semibold sm:text-base">
          {title}
        </p>
        <p className="text-secondary text-xs leading-relaxed sm:text-sm">{children}</p>
      </div>
    </div>
  );
};

export interface INumberedStep {
  title: string;
  description: string;
}

export interface INumberedSteps {
  steps: readonly INumberedStep[];
}

/** The steps of a process in an ordered list, each with its number. */
export const NumberedSteps = ({ steps }: INumberedSteps) => (
  // `list-none` takes the list away for some screen readers; `role="list"` gives it back
  <ol role="list" className="flex list-none flex-col gap-3">
    {steps.map((step, index) => (
      <li
        key={step.title}
        className="border-primary/10 bg-secondary-invert flex items-start gap-3 rounded-xl border p-4"
      >
        <span
          aria-hidden="true"
          className="bg-accent-duo flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
        >
          {index + 1}
        </span>
        <div>
          <p className="text-primary text-sm font-semibold sm:text-base">{step.title}</p>
          <p className="text-secondary text-xs sm:text-sm">{step.description}</p>
        </div>
      </li>
    ))}
  </ol>
);

export interface IStaticPageCTA extends IClassName {
  /** The heading of the block: an `h2`. */
  title: string;
  description: ReactNode;
  /** The buttons or links. */
  actions: ReactNode;
  footer?: ReactNode;
  /** `'row'` puts the text and the actions side by side from `sm:` up; `'stack'` keeps them stacked. @default 'row' */
  layout?: 'row' | 'stack';
}

/** The closing block of a page ("Get in touch"): a heading, a text and the actions. */
export const StaticPageCTA = ({
  title,
  description,
  actions,
  footer,
  layout = 'row',
  className = '',
}: IStaticPageCTA) => {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={`border-primary/10 bg-secondary-invert flex flex-col gap-4 rounded-2xl border p-4 sm:p-6 ${className}`}
    >
      <div
        className={`flex flex-col gap-4 ${
          layout === 'row' ? 'items-start justify-between sm:flex-row sm:items-center' : ''
        }`}
      >
        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="text-primary text-base font-semibold sm:text-lg">
            {title}
          </h2>
          <p className="text-secondary text-xs sm:text-sm">{description}</p>
        </div>
        {actions}
      </div>
      {footer}
    </section>
  );
};

export interface IEmailUsAction {
  /** The address; it is also the text, unless `children` says another. */
  email: string;
  children?: ReactNode;
}

/** A pill that writes an e-mail to an address: the usual action of `StaticPageCTA`. */
export const EmailUsAction = ({ email, children }: IEmailUsAction) => {
  registerStaticPageIcons();

  return (
    <a
      href={`mailto:${email}`}
      className="border-primary/20 hover:bg-primary-invert/60 text-primary flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-crayola-c motion-reduce:transition-none"
    >
      <Icon aria-hidden="true" icon="solar:letter-linear" className="size-4.5" />
      {children ?? email}
    </a>
  );
};
