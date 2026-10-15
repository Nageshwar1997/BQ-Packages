// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { click, installResizeObserver, keyDown, press, required } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { ConfirmModal } from './ConfirmModal.js';

const dialog = () =>
  required(document.querySelector<HTMLElement>('[aria-modal="true"]'), 'the dialog');
const buttonNamed = (name: string) =>
  required(
    [...document.querySelectorAll('button')].find((button) => button.textContent === name),
    name,
  );

describe('ConfirmModal', () => {
  beforeEach(() => {
    installResizeObserver();
  });

  afterEach(() => {
    unmountAll();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
    document.body.removeAttribute('style');
  });

  const open = (props: Partial<Parameters<typeof ConfirmModal>[0]> = {}) => {
    const onClose = vi.fn();
    const onDelete = vi.fn();
    const onCancel = vi.fn();
    const view = mount(
      <ConfirmModal
        type="warning"
        title="Delete this category?"
        description="It cannot be undone."
        buttons={{
          left: { content: 'Cancel', buttonProps: { onClick: onCancel } },
          right: { content: 'Delete', buttonProps: { onClick: onDelete } },
        }}
        modalProps={{ isOpen: true, onClose }}
        {...(props as object)}
      />,
    );

    return { view, onClose, onDelete, onCancel };
  };

  describe('as a message', () => {
    it('is an alertdialog named by the title and described by the description', () => {
      open();
      const title = required(dialog().querySelector('h2'), 'the title');
      const description = required(dialog().querySelector('p'), 'the description');

      expect(dialog().getAttribute('role')).toBe('alertdialog');
      expect(title.textContent).toBe('Delete this category?');
      expect(dialog().getAttribute('aria-labelledby')).toBe(title.id);
      expect(description.textContent).toBe('It cannot be undone.');
      expect(dialog().getAttribute('aria-describedby')).toBe(description.id);
    });

    it('has no description when it has none, and does not point to one', () => {
      open({ description: undefined });

      expect(dialog().querySelector('p')).toBeNull();
      expect(dialog().hasAttribute('aria-describedby')).toBe(false);
    });

    it('is not drawn when it is closed', () => {
      open({ modalProps: { isOpen: false, onClose: vi.fn() } });

      expect(document.querySelector('[aria-modal="true"]')).toBeNull();
    });

    it('gives each kind of message its own icon and colour', () => {
      const looks = (['success', 'error', 'warning', 'default'] as const).map((type) => {
        const view = open({ type }).view;
        const picture = required(dialog().querySelector('svg'), 'the icon');
        const look = {
          type,
          border: dialog().getAttribute('style') ?? '',
          icon: picture.outerHTML,
        };

        view.unmount();

        return look;
      });

      expect(looks[0]?.border).toContain('--primary-green-rgb');
      expect(looks[1]?.border).toContain('--primary-red-rgb');
      expect(looks[2]?.border).toContain('--primary-yellow-rgb');
      expect(looks[3]?.border).toContain('--primary-rgb');
      // success and default do not look like the warning ones
      expect(new Set(looks.map((look) => look.icon)).size).toBeGreaterThanOrEqual(3);
    });

    it('keeps the style the app gives the dialog, next to its own', () => {
      open({
        modalProps: {
          isOpen: true,
          onClose: vi.fn(),
          style: { width: '321px' },
          className: 'mine',
        },
      });

      expect(dialog().style.width).toBe('321px');
      expect(dialog().getAttribute('style')).toContain('--primary-yellow-rgb');
      expect(dialog().className).toContain('mine');
      expect(dialog().className).toContain('max-w-sm');
    });

    it('keeps the other attributes of the backdrop the app gives', () => {
      open({
        modalProps: { isOpen: true, onClose: vi.fn(), containerProps: { id: 'my-backdrop' } },
      });

      expect(required(dialog().parentElement, 'the backdrop').id).toBe('my-backdrop');
    });

    it('keeps the class of the backdrop the app gives', () => {
      open({
        modalProps: {
          isOpen: true,
          onClose: vi.fn(),
          containerProps: { className: 'dark-backdrop' },
        },
      });
      const backdrop = required(dialog().parentElement, 'the backdrop');

      expect(backdrop.className).toContain('dark-backdrop');
      expect(backdrop.className).toContain('p-6!');
    });
  });

  describe('the buttons', () => {
    it('are shown with the words they are given', () => {
      open();

      expect([...dialog().querySelectorAll('button')].map((button) => button.textContent)).toEqual([
        'Cancel',
        'Delete',
      ]);
    });

    it('can be one only, or none', () => {
      const onlyRight = open({ buttons: { right: { content: 'OK' } } });
      expect([...dialog().querySelectorAll('button')].map((b) => b.textContent)).toEqual(['OK']);
      onlyRight.view.unmount();

      open({ buttons: {} });
      expect(dialog().querySelector('button')).toBeNull();
    });

    it('close the dialog and tell the app, on the left', () => {
      const { onClose, onCancel } = open();

      click(buttonNamed('Cancel'));

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('close it without an onClick of the app, on the left', () => {
      const { onClose } = open({ buttons: { left: { content: 'Cancel' } } });

      click(buttonNamed('Cancel'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('leave it open when the right one does what it is told: the app closes it when it is done', () => {
      const { onClose, onDelete } = open();

      click(buttonNamed('Delete'));

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('close it when the right one has nothing to do', () => {
      const { onClose } = open({ buttons: { right: { content: 'Got it' } } });

      click(buttonNamed('Got it'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('can be switched off', () => {
      const onDelete = vi.fn();

      open({
        buttons: {
          right: { content: 'Delete', buttonProps: { onClick: onDelete, disabled: true } },
        },
      });

      click(buttonNamed('Delete'));

      expect(buttonNamed('Delete').hasAttribute('disabled')).toBe(true);
      expect(onDelete).not.toHaveBeenCalled();
    });

    it('keep the class and the other attributes the app gives', () => {
      open({
        buttons: {
          left: { content: 'Cancel', className: 'left-class', buttonProps: { id: 'cancel' } },
          right: { content: 'Delete', className: 'right-class' },
        },
      });

      expect(buttonNamed('Cancel').className).toContain('left-class');
      expect(buttonNamed('Cancel').className).toContain('max-h-10');
      expect(buttonNamed('Cancel').id).toBe('cancel');
      expect(buttonNamed('Delete').className).toContain('right-class');
    });

    it('look like a way out on the left and like the main thing on the right', () => {
      open();

      expect(buttonNamed('Cancel').className).not.toBe(buttonNamed('Delete').className);
    });
  });

  describe('the way out', () => {
    it('starts with the focus on the first button, the way out', () => {
      open();

      expect(document.activeElement).toBe(buttonNamed('Cancel'));
    });

    it('is Escape', () => {
      const { onClose } = open();

      keyDown(document, 'Escape');

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('is not a press on the backdrop: a decision is not made by a stray click', () => {
      const { onClose } = open();
      const backdrop = required(dialog().parentElement, 'the backdrop');

      press(backdrop);
      click(backdrop);

      expect(onClose).not.toHaveBeenCalled();
    });

    it('is the close button, when the header has one', () => {
      const onClose = vi.fn();

      open({ modalProps: { isOpen: true, onClose, header: { showCloseIcon: true } } });

      click(required(dialog().querySelector('[aria-label="Close"]'), 'the close button'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('with your own content', () => {
    const custom = (props: Partial<Parameters<typeof ConfirmModal>[0]> = {}) => {
      const onClose = vi.fn();

      mount(
        <ConfirmModal
          type="custom"
          modalProps={{ isOpen: true, onClose, label: 'Sign in' }}
          {...(props as object)}
        >
          <p>Content</p>
        </ConfirmModal>,
      );

      return { onClose };
    };

    it('shows it instead of the title and the description, with no icon', () => {
      custom();

      expect(dialog().textContent).toBe('Content');
      expect(dialog().querySelector('svg')).toBeNull();
      expect(dialog().querySelector('h2')).toBeNull();
    });

    it('is named by the label or the element the app says', () => {
      custom();
      expect(dialog().getAttribute('aria-label')).toBe('Sign in');
      expect(dialog().hasAttribute('aria-labelledby')).toBe(false);
    });

    it('takes the name and the description from the elements the app says', () => {
      unmountAll();
      mount(
        <ConfirmModal
          type="custom"
          modalProps={{ isOpen: true, onClose: vi.fn(), labelledBy: 'mine', describedBy: 'about' }}
        >
          <p>Content</p>
        </ConfirmModal>,
      );

      expect(dialog().getAttribute('aria-labelledby')).toBe('mine');
      expect(dialog().getAttribute('aria-describedby')).toBe('about');
    });

    it('has buttons when it is given them', () => {
      const { onClose } = custom({ buttons: { left: { content: 'Back' } } });

      click(buttonNamed('Back'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest.
  it('does not compile when the message and the content are mixed, or without what the kind needs', () => {
    const modalProps = { isOpen: true, onClose: () => undefined };
    const check = () => {
      // @ts-expect-error a message needs a title
      <ConfirmModal type="error" buttons={{}} modalProps={modalProps} />;
      // @ts-expect-error and the buttons (they can be empty)
      <ConfirmModal type="error" title="x" modalProps={modalProps} />;
      // @ts-expect-error your own content is the children
      <ConfirmModal type="custom" modalProps={modalProps} />;
      // @ts-expect-error a message has no children, it is the title and the description
      <ConfirmModal type="error" title="x" buttons={{}} modalProps={modalProps}>
        x
      </ConfirmModal>;
      // @ts-expect-error your own content has no title
      <ConfirmModal type="custom" title="x" modalProps={modalProps}>
        x
      </ConfirmModal>;
      // @ts-expect-error the kinds are known
      <ConfirmModal type="info" title="x" buttons={{}} modalProps={modalProps} />;
      <ConfirmModal
        type="error"
        title="x"
        buttons={{}}
        // @ts-expect-error the app decides when it is closed, not the dialog
        modalProps={{ onClose: () => undefined }}
      />;
      <ConfirmModal
        type="error"
        title="x"
        buttons={{}}
        // @ts-expect-error a press on the backdrop does not close it: this is not a setting
        modalProps={{ ...modalProps, closeOnOutsideClick: true }}
      />;
    };

    expect(check).toBeTypeOf('function');
  });
});
