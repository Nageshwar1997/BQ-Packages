// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mount, unmountAll } from '../test-utils/react.js';
import { Button } from './Button.js';

const buttonOf = (container: HTMLElement) => {
  const button = container.querySelector('button');

  if (!button) throw new Error('There is no button');

  return button;
};

describe('Button', () => {
  afterEach(() => {
    unmountAll();
  });

  it('shows its content and is a plain button by default', () => {
    const view = mount(<Button pattern="primary" content="Save" />);
    const button = buttonOf(view.container);

    expect(button.textContent).toBe('Save');
    expect(button.type).toBe('button'); // never submits a form by accident
  });

  it('does not turn the transparent button around, so its content stays the way up it is', () => {
    const view = mount(<Button pattern="transparent" content="Save" />);
    const button = buttonOf(view.container);

    expect(button.className).not.toContain('rotate');
    expect(button.className).not.toContain('shadow');
    expect(button.childNodes).toHaveLength(1);
    expect(button.firstChild?.nodeType).toBe(Node.TEXT_NODE); // the text, as it is
    expect(button.textContent).toBe('Save');
  });

  it('can be a submit button of another form', () => {
    const view = mount(
      <Button pattern="primary" content="Save" buttonProps={{ type: 'submit', form: 'profile' }} />,
    );

    expect(buttonOf(view.container).type).toBe('submit');
    expect(buttonOf(view.container).getAttribute('form')).toBe('profile');
  });

  it('wears the look of its pattern, then the classes it is given', () => {
    const view = mount(
      <Button
        pattern="outline"
        content="Edit"
        className="from-the-prop"
        buttonProps={{ className: 'from-the-button-props' }}
      />,
    );
    const classes = buttonOf(view.container).className;

    expect(classes).toContain('border-primary'); // the pattern
    expect(classes).toContain('rounded-lg'); // what every button has
    expect(classes.indexOf('from-the-prop')).toBeGreaterThan(classes.indexOf('border-primary'));
    expect(classes).toContain('from-the-button-props');
  });

  it('passes the other button props on', () => {
    const view = mount(
      <Button
        pattern="primary"
        content="Save"
        buttonProps={{ 'aria-label': 'Save the form', title: 'Save' }}
      />,
    );

    expect(buttonOf(view.container).getAttribute('aria-label')).toBe('Save the form');
    expect(buttonOf(view.container).title).toBe('Save');
  });

  it('calls onClick when it is clicked', () => {
    const onClick = vi.fn();
    const view = mount(<Button pattern="primary" content="Save" buttonProps={{ onClick }} />);

    buttonOf(view.container).click();

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0]?.[0]).toMatchObject({ type: 'click' });
  });

  it('does nothing when it is disabled', () => {
    const onClick = vi.fn();
    const view = mount(
      <Button pattern="primary" content="Save" buttonProps={{ onClick, disabled: true }} />,
    );

    buttonOf(view.container).click();

    expect(buttonOf(view.container).disabled).toBe(true);
    expect(onClick).not.toHaveBeenCalled();
  });
});
