import type { ComponentProps, ComponentPropsWithRef, ElementType, ReactNode } from 'react';

import { GradientText } from '../ui/GradientText.js';

/**
 * What the link to a page needs, as the component that makes the link asks for it: `{ to: '/terms' }`
 * for the `Link` of a router, `{ href: '/terms' }` for a plain `<a>` (which has to have one).
 */
export type TAuthLinkProps<TAs extends ElementType> = Omit<
  ComponentPropsWithRef<TAs>,
  'children' | 'className' | 'text' | 'type'
> &
  (TAs extends 'a' ? { href: string } : unknown);

/** The two links of the sentence, ready to be put in it. */
export interface IAuthLinks {
  terms: ReactNode;
  privacy: ReactNode;
}

interface IAuthBottomInstructionsOwnProps<TAs extends ElementType> {
  /**
   * What makes the links: `'a'`, or the `Link` of the router of the app. The router is the app's,
   * not this package's.
   * @default 'a'
   */
  as?: TAs;
  /** The link to the terms and conditions, in the props of `as`. */
  terms: TAuthLinkProps<TAs>;
  /** The link to the privacy policy, in the props of `as`. */
  privacy: TAuthLinkProps<TAs>;
  /** @default 'Terms & Conditions' */
  termsLabel?: string;
  /** @default 'Privacy Policy' */
  privacyLabel?: string;
  /**
   * The sentence around the two links, for another wording or another language.
   * @default ({ terms, privacy }) => <>By continuing, you agree to our {terms} and {privacy}.</>
   */
  message?: (links: IAuthLinks) => ReactNode;
}

export type IAuthBottomInstructions<TAs extends ElementType = 'a'> =
  IAuthBottomInstructionsOwnProps<TAs> & Omit<ComponentProps<'p'>, 'children'>;

const defaultMessage = ({ terms, privacy }: IAuthLinks) => (
  <>
    By continuing, you agree to our {terms} and {privacy}.
  </>
);

const LINK_CSS = 'font-medium';

/**
 * The small print under a sign-in or sign-up form: that going on means accepting the terms and the
 * privacy policy, with a link to each.
 */
export const AuthBottomInstructions = <TAs extends ElementType = 'a'>({
  as,
  terms,
  privacy,
  termsLabel = 'Terms & Conditions',
  privacyLabel = 'Privacy Policy',
  message = defaultMessage,
  className = '',
  ...pProps
}: IAuthBottomInstructions<TAs>) => {
  const Link: ElementType = as ?? 'a';

  return (
    <p {...pProps} className={`text-tertiary text-xs ${className}`}>
      {message({
        terms: (
          <GradientText
            {...(terms as object)}
            as={Link}
            type="accent"
            text={termsLabel}
            className={LINK_CSS}
          />
        ),
        privacy: (
          <GradientText
            {...(privacy as object)}
            as={Link}
            type="accent"
            text={privacyLabel}
            className={LINK_CSS}
          />
        ),
      })}
    </p>
  );
};
