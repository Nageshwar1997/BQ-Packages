import { ColorService, type IColor } from 'react-color-palette';

// #rgb, #rgba, #rrggbb, #rrggbbaa
const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** The colour used when there is none, or the text is not a colour. */
export const FALLBACK_COLOR = '#000000';

/** Whether `value` is a colour written in hexadecimal (`#fff`, `#ff00aa`, `#ff00aa80`). */
export const isHexColor = (value: string | undefined): value is string =>
  value !== undefined && HEX.test(value);

/** The colour of a hexadecimal text; black for nothing and for text that is not a colour. */
export const toColor = (value: string | undefined): IColor =>
  ColorService.convert('hex', isHexColor(value) ? value : FALLBACK_COLOR);

/** Two ways to write the same colour (`#FFF` and `#fff`)? Only the case is looked at. */
export const isSameHex = (a: string | undefined, b: string | undefined) =>
  a?.toLowerCase() === b?.toLowerCase();
