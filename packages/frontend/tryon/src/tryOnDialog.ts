import type { ComponentProps } from 'react';

/*
 * How the Try-On dialog is sized. It is in a file of its own, and not in the modal, because the loading
 * dialog that is shown while the modal is being loaded (`TryOnModalLazy`) has to be exactly the same
 * size: a small dialog that jumps to a full one when the modal arrives looks broken. Both take their size
 * from here, so they cannot drift apart. The file has nothing that runs on import (the type is erased),
 * so the light entry of the package can have it without the heavy part.
 */

/** The backdrop: mobile/tablet is edge-to-edge, no margin around the dialog; `lg:` gets its margin back. */
export const TRYON_DIALOG_CONTAINER_PROPS: ComponentProps<'div'> = {
  className: 'p-0! lg:p-8!',
};

/**
 * The dialog: mobile/tablet is edge-to-edge like a native full-screen sheet; `lg:` restores the
 * centered-dialog sizing. Every one of these needs `!` - `ModalWrapper`'s own classes (`max-w-md
 * rounded-xl border` etc.) can otherwise win regardless of source order (`max-w-full` without `!` once
 * genuinely lost to the component's own `max-w-md`, which - combined with `min-w-[80dvw]!` - clamped the
 * whole modal to exactly 80dvw even where `w-full!` should have taken it edge-to-edge instead, since a
 * conflicting `min-width` always wins over `max-width` regardless of importance). `lg:w-auto!` un-forces
 * the mobile `w-full!` back on large screens: the width there is meant to be driven by `min-w-[80dvw]` as
 * a floor (the content can still grow past it), not pinned to 100% of the padded space of the backdrop,
 * which `w-full!` alone would do.
 */
export const TRYON_DIALOG_CLASS_NAME =
  'h-full max-h-full! w-full! max-w-full! min-w-[80dvw]! rounded-none! border-0! lg:max-h-[90dvh]! lg:w-auto! lg:rounded-xl! lg:border!';
