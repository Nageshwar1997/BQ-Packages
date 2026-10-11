// @vitest-environment jsdom
import { getIcon } from '@iconify/react';
import { describe, expect, it } from 'vitest';

import { registerStepperIcons, STEPPER_ICON_NAMES } from './stepper-icons.js';

describe('bundled stepper icons', () => {
  it('has nothing registered until a stepper asks for it', () => {
    expect(getIcon('solar:check-read-linear')).toBeFalsy();
  });

  it('lists the icons the stepper uses', () => {
    expect(STEPPER_ICON_NAMES).toEqual(['solar:check-read-linear']);
  });

  it('has the drawing and the size of every icon it lists, with no network', () => {
    registerStepperIcons();

    for (const name of STEPPER_ICON_NAMES) {
      const icon = getIcon(name);

      expect(icon, name).toBeTruthy();
      expect(icon?.body, name).toContain('currentColor'); // takes the colour of the step
      expect(icon?.width, name).toBe(24);
      expect(icon?.height, name).toBe(24);
    }
  });

  it('can be called again and again', () => {
    registerStepperIcons();
    registerStepperIcons();

    expect(getIcon('solar:check-read-linear')?.body).toContain('M4 12.9');
  });
});
