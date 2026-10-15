// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { click, installResizeObserver, keyDown, labelsOf, required } from '../test-utils/dom.js';
import { mount, unmountAll } from '../test-utils/react.js';
import { FileInput, type IFileInput, type TFileInputValue } from './FileInput.js';

const png = (name: string) => new File(['x'], name, { type: 'image/png' });
const mp4 = (name: string) => new File(['x'], name, { type: 'video/mp4' });

const noPoster = { getPoster: () => undefined };

const input = (container: HTMLElement) =>
  required(container.querySelector<HTMLInputElement>('input[type="file"]'), 'the input');
const thumbnails = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLButtonElement>('li > button:first-child'),
];
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');
const theDialog = () => required(dialog(), 'the dialog');
const buttonNamed = (name: string, root: ParentNode = document) =>
  required(root.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`), name);

describe('FileInput', () => {
  let created: string[];
  let revoked: string[];

  beforeEach(() => {
    installResizeObserver();
    created = [];
    revoked = [];
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: (file: File) => {
          // a file the browser cannot make an address for: it has no thumbnail
          if (file.name.startsWith('broken')) return undefined;

          const url = `blob:mock/${file.name}`;

          created.push(url);

          return url;
        },
        revokeObjectURL: (url: string) => {
          revoked.push(url);
        },
      }),
    );
  });

  afterEach(() => {
    unmountAll();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
    document.body.removeAttribute('style');
  });

  const Controlled = ({
    initial = [],
    onRemove,
    ...props
  }: {
    initial?: readonly TFileInputValue[];
    onRemove?: (index: number) => void;
  } & Partial<IFileInput>) => {
    const [files, setFiles] = useState<readonly TFileInputValue[]>(initial);

    return (
      <FileInput
        label="Photos"
        playerProps={noPoster}
        fileInputProps={{ name: 'photos', multiple: true, value: files }}
        handleRemove={(index) => {
          setFiles((current) => current.filter((_, position) => position !== index));
          onRemove?.(index);
        }}
        {...props}
      />
    );
  };

  describe('the field', () => {
    it('is a file input with a label that names it', () => {
      const view = mount(<FileInput label="Photo" fileInputProps={{ name: 'photo' }} />);

      expect(input(view.container).type).toBe('file');
      expect(labelsOf(input(view.container)).map((label) => label.textContent)).toContain('Photo');
      expect(input(view.container).id).toBe('photo');
    });

    it('is reached with the keyboard, but is not drawn (the field shows the focus)', () => {
      const view = mount(<FileInput fileInputProps={{ name: 'photo' }} />);

      expect(input(view.container).className).toContain('sr-only');
      expect(input(view.container).tabIndex).toBe(0);
      expect(
        required(view.container.querySelector('[class*="has-focus-visible"]'), 'the field')
          .className,
      ).toContain('has-focus-visible:border-blue-crayola-c');
    });

    it('says "Choose file" for one file and "Choose files" for several, or what it is told', () => {
      const one = mount(<FileInput fileInputProps={{ name: 'a' }} />);
      const many = mount(<FileInput fileInputProps={{ name: 'b', multiple: true }} />);
      const told = mount(<FileInput fileInputProps={{ name: 'c', placeholder: 'Add a photo' }} />);
      const toldMany = mount(
        <FileInput fileInputProps={{ name: 'd', multiple: true, placeholder: 'Add photos' }} />,
      );

      expect(one.container.textContent).toBe('Choose file');
      expect(many.container.textContent).toBe('Choose files');
      expect(told.container.textContent).toBe('Add a photo');
      expect(toldMany.container.textContent).toBe('Add photos');
    });

    it('says it in the words of the app', () => {
      const one = mount(
        <FileInput fileInputProps={{ name: 'a' }} labels={{ choose: 'Elegir archivo' }} />,
      );
      const many = mount(
        <FileInput
          fileInputProps={{ name: 'b', multiple: true }}
          labels={{ chooseMany: 'Elegir archivos' }}
        />,
      );

      expect(one.container.textContent).toBe('Elegir archivo');
      expect(many.container.textContent).toBe('Elegir archivos');
    });

    it('takes pictures unless it is told what to take', () => {
      const plain = mount(<FileInput fileInputProps={{ name: 'a' }} />);
      const told = mount(<FileInput fileInputProps={{ name: 'b', accept: 'video/*' }} />);

      expect(input(plain.container).accept).toBe('image/*');
      expect(input(told.container).accept).toBe('video/*');
    });

    it('takes several files only when it is told', () => {
      const one = mount(<FileInput fileInputProps={{ name: 'a' }} />);
      const many = mount(<FileInput fileInputProps={{ name: 'b', multiple: true }} />);

      expect(input(one.container).multiple).toBe(false);
      expect(input(many.container).multiple).toBe(true);
    });

    it('takes the id it is given before the name, and makes one without either', () => {
      const withId = mount(<FileInput fileInputProps={{ name: 'a', id: 'my-id' }} />);
      const nothing = mount(<FileInput label="Photo" fileInputProps={{}} />);

      expect(input(withId.container).id).toBe('my-id');
      expect(input(nothing.container).id).not.toBe('');
      expect(labelsOf(input(nothing.container)).map((label) => label.textContent)).toContain(
        'Photo',
      );
    });

    it('gives the other attributes of the input to it', () => {
      const view = mount(
        <FileInput
          fileInputProps={
            { name: 'a', required: true, 'aria-label': 'Upload', 'data-x': '1' } as never
          }
        />,
      );

      expect(input(view.container).required).toBe(true);
      expect(input(view.container).getAttribute('aria-label')).toBe('Upload');
      expect(input(view.container).getAttribute('data-x')).toBe('1');
    });

    it('is disabled when it is told, and says so', () => {
      const onChange = vi.fn();
      const view = mount(<FileInput fileInputProps={{ name: 'a', disabled: true, onChange }} />);

      expect(input(view.container).disabled).toBe(true);
      expect(view.container.querySelector('label.cursor-not-allowed')).not.toBeNull();

      input(view.container).dispatchEvent(new Event('change', { bubbles: true }));

      expect(onChange).not.toHaveBeenCalled();
    });

    it('takes the classes it is given', () => {
      const view = mount(
        <FileInput
          className="field-class"
          containerClassName="box-class"
          fileInputProps={{ name: 'a', className: 'text-class' }}
        />,
      );

      expect(view.container.innerHTML).toContain('field-class');
      expect(required(view.container.firstElementChild, 'the box').className).toContain(
        'box-class',
      );
      expect(required(input(view.container).closest('label'), 'its label').className).toContain(
        'text-class',
      );
    });

    it('has an icon at each end, and a named button for an icon that does something', () => {
      const onClick = vi.fn();
      const view = mount(
        <FileInput
          fileInputProps={{ name: 'a' }}
          icons={{
            left: { icon: 'solar:gallery-add-linear' },
            right: { icon: 'lucide:x', onClick, label: 'Clear' },
          }}
        />,
      );

      click(buttonNamed('Clear', view.container));

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(view.container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(2);
      // the button is not inside the label, which would open the chooser too
      expect(view.container.querySelector('label button')).toBeNull();
    });
  });

  describe('choosing', () => {
    it('tells the app what was chosen', () => {
      const onChange = vi.fn();
      const view = mount(<FileInput fileInputProps={{ name: 'a', onChange }} />);

      input(view.container).dispatchEvent(new Event('change', { bubbles: true }));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect((onChange.mock.calls[0]?.[0] as { target: unknown }).target).toBe(
        input(view.container),
      );
    });

    it('empties the input after each choice, so the same file can be chosen again', () => {
      const view = mount(<FileInput fileInputProps={{ name: 'a' }} />);
      const setter = vi.fn();

      Object.defineProperty(input(view.container), 'value', {
        configurable: true,
        get: () => 'C:\\fakepath\\a.png',
        set: setter,
      });
      input(view.container).dispatchEvent(new Event('change', { bubbles: true }));

      expect(setter).toHaveBeenCalledWith('');
    });

    it('works without an onChange', () => {
      const view = mount(<FileInput fileInputProps={{ name: 'a' }} />);

      expect(() => {
        input(view.container).dispatchEvent(new Event('change', { bubbles: true }));
      }).not.toThrow();
    });
  });

  describe('the thumbnails', () => {
    it('are not there without files', () => {
      const view = mount(<FileInput fileInputProps={{ name: 'a' }} playerProps={noPoster} />);

      expect(view.container.querySelector('ul')).toBeNull();
    });

    it('are there for the addresses that are saved', () => {
      const view = mount(
        <FileInput
          playerProps={noPoster}
          fileInputProps={{ name: 'a', value: ['/a.webp', '/b.webp'] }}
        />,
      );

      expect(thumbnails(view.container).map((button) => button.getAttribute('aria-label'))).toEqual(
        ['Show image 1 of 2', 'Show image 2 of 2'],
      );
      expect(view.container.querySelector('img')?.getAttribute('src')).toBe('/a.webp');
    });

    it('are there for one file or one address, not in a list', () => {
      const file = mount(
        <FileInput playerProps={noPoster} fileInputProps={{ name: 'a', value: png('one.png') }} />,
      );
      const address = mount(
        <FileInput playerProps={noPoster} fileInputProps={{ name: 'b', value: '/saved.webp' }} />,
      );

      expect(thumbnails(file.container)).toHaveLength(1);
      expect(thumbnails(address.container)).toHaveLength(1);
    });

    it('are there for the files that were chosen, with an address the browser gives', () => {
      const view = mount(
        <FileInput
          playerProps={noPoster}
          fileInputProps={{ name: 'a', value: [png('one.png'), png('two.png')] }}
        />,
      );

      expect(created).toEqual(['blob:mock/one.png', 'blob:mock/two.png']);
      expect(
        [...view.container.querySelectorAll('img')].map((image) => image.getAttribute('src')),
      ).toEqual(['blob:mock/one.png', 'blob:mock/two.png']);
    });

    it('show a video as a video, and the rest as pictures', () => {
      const view = mount(
        <FileInput
          playerProps={noPoster}
          fileInputProps={{
            name: 'a',
            value: [png('a.png'), mp4('b.mp4'), 'https://cdn.example/c.webm', '/d.jpg'],
          }}
        />,
      );

      expect(thumbnails(view.container).map((button) => button.getAttribute('aria-label'))).toEqual(
        ['Show image 1 of 4', 'Show video 2 of 4', 'Show video 3 of 4', 'Show image 4 of 4'],
      );
    });

    it('gives what the app asked for the players to the thumbnails and to the dialog', () => {
      const getPoster = vi.fn(() => undefined);
      const view = mount(
        <FileInput
          playerProps={{ getPoster }}
          fileInputProps={{ name: 'a', value: ['https://cdn.example/clip.mp4'] }}
        />,
      );

      expect(getPoster).toHaveBeenCalledWith(
        'https://cdn.example/clip.mp4',
        expect.any(AbortSignal),
      );

      click(thumbnails(view.container)[0]);

      expect(theDialog().querySelector('video')).not.toBeNull();
    });

    it('can be told what is a picture and what is a video', () => {
      const view = mount(
        <FileInput
          playerProps={noPoster}
          getMediaType={(value) => (typeof value === 'string' ? 'video' : 'image')}
          fileInputProps={{ name: 'a', value: ['/a.jpg', png('b.png')] }}
        />,
      );

      expect(thumbnails(view.container).map((button) => button.getAttribute('aria-label'))).toEqual(
        ['Show video 1 of 2', 'Show image 2 of 2'],
      );
    });

    it('go when the files go', () => {
      const view = mount(
        <FileInput
          playerProps={noPoster}
          fileInputProps={{ name: 'a', value: [png('one.png')] }}
        />,
      );

      view.rerender(<FileInput playerProps={noPoster} fileInputProps={{ name: 'a', value: [] }} />);

      expect(view.container.querySelector('ul')).toBeNull();
      expect(revoked).toEqual(['blob:mock/one.png']);
    });

    it('give back the addresses of the files when the field is removed', () => {
      const view = mount(
        <FileInput
          playerProps={noPoster}
          fileInputProps={{ name: 'a', value: [png('one.png'), png('two.png')] }}
        />,
      );

      view.unmount();

      expect(revoked.sort()).toEqual(['blob:mock/one.png', 'blob:mock/two.png']);
    });

    it('do not make a new address for a file that is still there', () => {
      const one = png('one.png');
      const view = mount(
        <FileInput playerProps={noPoster} fileInputProps={{ name: 'a', value: [one] }} />,
      );

      view.rerender(
        <FileInput
          playerProps={noPoster}
          fileInputProps={{ name: 'a', value: [one, '/b.webp'] }}
        />,
      );

      expect(created).toEqual(['blob:mock/one.png']);
      expect(revoked).toEqual([]);
    });

    it('have the words of the app', () => {
      const view = mount(
        <FileInput
          playerProps={noPoster}
          labels={{ select: (_item, index) => `Ver ${String(index + 1)}` }}
          fileInputProps={{ name: 'a', value: ['/a.webp'] }}
        />,
      );

      expect(buttonNamed('Ver 1', view.container)).toBeTruthy();
    });

    it('take the classes for the row and the dialog', () => {
      const view = mount(
        <FileInput
          playerProps={noPoster}
          mediaCarouselClassName="row-class"
          mediaModalClassName="backdrop-class"
          fileInputProps={{ name: 'a', value: ['/a.webp'] }}
        />,
      );

      expect(view.container.innerHTML).toContain('row-class');

      click(thumbnails(view.container)[0]);

      expect(required(theDialog().parentElement, 'the backdrop').className).toContain(
        'backdrop-class',
      );
    });
  });

  describe('adding more', () => {
    it('is a tile that opens the chooser, for a field that takes several files', () => {
      const view = mount(
        <FileInput
          playerProps={noPoster}
          fileInputProps={{ name: 'a', multiple: true, value: ['/a.webp'] }}
        />,
      );
      const tile = required(
        [...view.container.querySelectorAll('label')].find((label) =>
          label.textContent.includes('Add more files'),
        ),
        'the tile',
      );

      expect(tile.getAttribute('for')).toBe(input(view.container).id);
    });

    it('is named in the language of the app', () => {
      const view = mount(
        <FileInput
          playerProps={noPoster}
          labels={{ addMore: 'Añadir más' }}
          fileInputProps={{ name: 'a', multiple: true, value: ['/a.webp'] }}
        />,
      );

      expect(view.container.textContent).toContain('Añadir más');
    });

    it('is not there for a field that takes one file', () => {
      const view = mount(
        <FileInput playerProps={noPoster} fileInputProps={{ name: 'a', value: ['/a.webp'] }} />,
      );

      expect(view.container.textContent).not.toContain('Add more files');
    });

    it('is not there without files', () => {
      const view = mount(
        <FileInput playerProps={noPoster} fileInputProps={{ name: 'a', multiple: true }} />,
      );

      expect(view.container.textContent).not.toContain('Add more files');
    });

    it('looks switched off when the field is', () => {
      const view = mount(
        <FileInput
          playerProps={noPoster}
          fileInputProps={{ name: 'a', multiple: true, disabled: true, value: ['/a.webp'] }}
        />,
      );
      const tile = required(
        [...view.container.querySelectorAll('label')].find((label) =>
          label.textContent.includes('Add more files'),
        ),
        'the tile',
      );

      expect(tile.className).toContain('cursor-not-allowed');
    });
  });

  describe('the messages', () => {
    it('are not there without errors, or with only empty ones', () => {
      const none = mount(<FileInput fileInputProps={{ name: 'a' }} />);
      const empty = mount(<FileInput fileInputProps={{ name: 'b' }} errors={[undefined, '']} />);

      for (const view of [none, empty]) {
        expect(view.container.querySelector('[role="alert"]')).toBeNull();
        expect(input(view.container).hasAttribute('aria-invalid')).toBe(false);
        expect(input(view.container).hasAttribute('aria-describedby')).toBe(false);
      }
    });

    it('is said as it is, without a number, when there is one', () => {
      const view = mount(
        <FileInput
          playerProps={noPoster}
          fileInputProps={{ name: 'a', value: ['/a.webp', '/b.webp'] }}
          errors={[undefined, 'Too big']}
        />,
      );
      const alerts = [...view.container.querySelectorAll('[role="alert"]')];

      expect(alerts.map((alert) => alert.textContent)).toEqual(['Too big']);
    });

    it('are numbered by the place of the file, when there are several', () => {
      const view = mount(
        <FileInput
          playerProps={noPoster}
          fileInputProps={{ name: 'a', value: ['/a.webp', '/b.webp', '/c.webp'] }}
          errors={['Too big', undefined, 'Wrong type']}
        />,
      );
      const alerts = [...view.container.querySelectorAll('[role="alert"]')];

      expect(alerts.map((alert) => alert.textContent)).toEqual(['1. Too big', '3. Wrong type']);
    });

    it('make the field invalid and are what describes it', () => {
      const view = mount(
        <FileInput
          fileInputProps={{ name: 'a', 'aria-describedby': 'hint' }}
          errors={['Too big']}
        />,
      );
      const box = required(view.container.querySelector('[id="a-errors"]'), 'the messages');

      expect(input(view.container).getAttribute('aria-invalid')).toBe('true');
      expect(input(view.container).getAttribute('aria-describedby')).toBe(`hint ${box.id}`);
      expect(view.container.querySelector('[data-invalid]')).not.toBeNull();
    });

    it('give the thumbnail of the file with a problem a red border, and only that one', () => {
      const view = mount(
        <FileInput
          playerProps={noPoster}
          fileInputProps={{ name: 'a', value: ['/a.webp', '/b.webp', '/c.webp'] }}
          errors={[undefined, 'Too big']}
        />,
      );
      const rows = [...view.container.querySelectorAll('li')];

      expect(rows.map((row) => row.hasAttribute('data-invalid'))).toEqual([false, true, false]);
    });
  });

  describe('removing', () => {
    it('has no remove button unless handleRemove is given', () => {
      const view = mount(
        <FileInput playerProps={noPoster} fileInputProps={{ name: 'a', value: ['/a.webp'] }} />,
      );

      expect(view.container.querySelector('[aria-label^="Remove"]')).toBeNull();
    });

    it('tells the app the place of the file in its list', () => {
      const onRemove = vi.fn();
      const view = mount(
        <Controlled initial={['/a.webp', png('b.png'), '/c.webp']} onRemove={onRemove} />,
      );

      click(buttonNamed('Remove image 3', view.container));

      expect(onRemove).toHaveBeenCalledWith(2);
      expect(thumbnails(view.container)).toHaveLength(2);
    });

    it('tells the place in the list also when a file before it has no thumbnail', () => {
      const onRemove = vi.fn();
      const view = mount(
        <Controlled initial={['/a.webp', png('broken.png'), '/c.webp']} onRemove={onRemove} />,
      );

      // two thumbnails: the file in the middle could not be shown
      expect(thumbnails(view.container)).toHaveLength(2);

      click(buttonNamed('Remove image 2', view.container));

      expect(onRemove).toHaveBeenCalledWith(2);
    });

    it('marks the right thumbnail as having a problem when a file before it has no thumbnail', () => {
      const view = mount(
        <FileInput
          playerProps={noPoster}
          fileInputProps={{ name: 'a', value: ['/a.webp', png('broken.png'), '/c.webp'] }}
          errors={[undefined, undefined, 'Too big']}
        />,
      );
      const rows = [...view.container.querySelectorAll('li')];

      expect(rows.map((row) => row.hasAttribute('data-invalid'))).toEqual([false, true]);
    });

    it('removes from the dialog too, with the place in the list', () => {
      const onRemove = vi.fn();
      const view = mount(<Controlled initial={['/a.webp', '/b.webp']} onRemove={onRemove} />);

      click(thumbnails(view.container)[1]);
      click(buttonNamed('Remove image 1', theDialog()));

      expect(onRemove).toHaveBeenCalledWith(0);
    });

    it('gives back the address of a file that is removed', () => {
      const view = mount(<Controlled initial={[png('a.png'), png('b.png')]} />);

      click(buttonNamed('Remove image 1', view.container));

      expect(revoked).toEqual(['blob:mock/a.png']);
    });
  });

  describe('the dialog', () => {
    it('opens the file that is pressed, big', () => {
      const view = mount(<Controlled initial={['/a.webp', '/b.webp']} />);

      click(thumbnails(view.container)[1]);

      expect(theDialog().querySelector('img[alt="Image 2 of 2"]')?.getAttribute('src')).toBe(
        '/b.webp',
      );
    });

    it('closes with its button and with Escape', () => {
      const view = mount(<Controlled initial={['/a.webp', '/b.webp']} />);

      click(thumbnails(view.container)[0]);
      click(buttonNamed('Close', theDialog()));
      expect(dialog()).toBeNull();

      click(thumbnails(view.container)[0]);
      keyDown(document, 'Escape');
      expect(dialog()).toBeNull();
    });

    it('closes by itself when the file it shows is removed', () => {
      const view = mount(<Controlled initial={['/a.webp', '/b.webp']} />);

      click(thumbnails(view.container)[1]);
      click(buttonNamed('Remove image 2', theDialog()));

      expect(dialog()).toBeNull();
      expect(thumbnails(view.container)).toHaveLength(1);
    });

    it('closes when the files are all gone', () => {
      const view = mount(
        <FileInput playerProps={noPoster} fileInputProps={{ name: 'a', value: ['/a.webp'] }} />,
      );

      click(thumbnails(view.container)[0]);
      expect(dialog()).not.toBeNull();

      view.rerender(<FileInput playerProps={noPoster} fileInputProps={{ name: 'a', value: [] }} />);

      expect(dialog()).toBeNull();
    });

    it('plays a video with controls', () => {
      const view = mount(
        <FileInput playerProps={noPoster} fileInputProps={{ name: 'a', value: ['/clip.mp4'] }} />,
      );

      click(thumbnails(view.container)[0]);

      expect(theDialog().querySelector('video')?.controls).toBe(true);
    });

    it('is not there before a file is pressed', () => {
      mount(
        <FileInput playerProps={noPoster} fileInputProps={{ name: 'a', value: ['/a.webp'] }} />,
      );

      expect(dialog()).toBeNull();
    });
  });

  it('is the same in StrictMode', () => {
    const view = mount(<Controlled initial={[png('a.png')]} />, { strict: true });

    expect(thumbnails(view.container)).toHaveLength(1);
    expect(view.container.querySelector('img')?.getAttribute('src')).toBe('blob:mock/a.png');

    view.unmount();

    expect(revoked.length).toBe(created.length);
  });

  // These lines are checked by the type check of the package (`npm run typecheck`), not by vitest.
  it('does not compile without the props of the input, or with a value that is not a file or an address', () => {
    const check = () => {
      // @ts-expect-error the props of the input are needed
      <FileInput />;
      // @ts-expect-error a file or an address, not a number
      <FileInput fileInputProps={{ value: 7 }} />;
      // @ts-expect-error the type of the input is file, always
      <FileInput fileInputProps={{ type: 'text' }} />;
      // @ts-expect-error a message for each file is text
      <FileInput fileInputProps={{}} errors={[1]} />;
    };

    expect(check).toBeTypeOf('function');
  });
});
