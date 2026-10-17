import { QuillContent, sanitizeQuillHtml } from '@beautinique/frontend-quill';
import {
  describeQuillEditorError,
  processQuillContent,
  QuillEditor,
  type QuillEditorError,
  type QuillImageRef,
  QuillUploadCountError,
} from '@beautinique/frontend-quill/editor';
import type Quill from 'quill';
import { useRef, useState } from 'react';

// What a page of an app does with the package: an editor whose images stay on the device until "Save",
// a fake upload in place of the app's request, and the saved content shown with the viewer. Every prop
// of the editor can be changed here, and the second half shows what the viewer does to bad HTML.

const SAMPLE =
  '<h2>Glow serum</h2><p>A light serum with <strong>vitamin C</strong> and <em>hyaluronic acid</em>. ' +
  '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Read more</a></p>' +
  '<ul><li>Brightens</li><li>Hydrates</li></ul>';

const HOSTILE =
  '<p>Looks normal</p>' +
  '<img src="x" onerror="document.body.dataset.pwned = \'yes\'">' +
  '<script>document.body.dataset.pwned = "yes"</script>' +
  '<a href="javascript:document.body.dataset.pwned=\'yes\'">click me</a>' +
  '<a href="https://example.com" target="_blank" rel="opener">opens a tab</a>' +
  '<form action="https://evil.test"><input name="card" placeholder="Card number"><button>Pay</button></form>' +
  '<iframe class="ql-video" src="https://www.youtube.com/embed/dQw4w9WgXcQ" allowfullscreen></iframe>';

const field =
  'rounded-lg border border-primary/20 bg-primary-invert px-3 py-2 text-sm text-primary';
const button =
  'rounded-lg border border-primary/20 bg-secondary-invert px-4 py-2 text-sm font-medium text-primary hover:border-blue-crayola-c';

type UploadMode = 'works' | 'fails' | 'short';

const toDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => {
      reject(new Error('The file could not be read'));
    };
    reader.readAsDataURL(file);
  });

export const App = () => {
  const quillRef = useRef<Quill | null>(null);
  const imagesRef = useRef<QuillImageRef[]>([]);

  const [value, setValue] = useState(SAMPLE);
  const [changes, setChanges] = useState(0);
  const [held, setHeld] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState('');
  const [uploadMode, setUploadMode] = useState<UploadMode>('works');

  const [disabled, setDisabled] = useState(false);
  const [headingIds, setHeadingIds] = useState(true);
  const [linkIdButton, setLinkIdButton] = useState(true);
  const [withImages, setWithImages] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [maxKb, setMaxKb] = useState(2048);
  const [hosts, setHosts] = useState('res.cloudinary.com');
  const [remount, setRemount] = useState(0);

  const [html, setHtml] = useState(HOSTILE);

  const onError = (error: QuillEditorError) => {
    const { title, description } = describeQuillEditorError(error);

    setErrors((all) => [`${title} ${description}`, ...all].slice(0, 5));
  };

  // The upload of an app: here the "uploaded" address is the file itself as a data: address, so the saved
  // content (which the viewer cleans, and which cleaning would strip a blob: address from) still shows it
  const upload = async (files: File[]) => {
    setStatus(`Uploading ${String(files.length)} file(s)...`);
    await new Promise((resolve) => setTimeout(resolve, 600));

    if (uploadMode === 'fails') {
      throw new Error('The network went away');
    }

    const urls = await Promise.all(files.map(toDataUrl));

    return uploadMode === 'short' ? urls.slice(1) : urls;
  };

  const save = async () => {
    const quill = quillRef.current;

    if (!quill) return;

    try {
      const result = await processQuillContent({ quill, imagesRef, upload });

      setSaved(result);
      setValue(result ?? '');
      setHeld(imagesRef.current.length);
      setStatus(`Saved (${String(result?.length ?? 0)} characters)`);
    } catch (error) {
      setStatus(
        error instanceof QuillUploadCountError
          ? `Count mismatch: sent ${String(error.expected)}, got ${String(error.received)}`
          : `Not saved: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const hostList = hosts
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);

  return (
    <main className="bg-primary-invert text-primary mx-auto flex min-h-dvh max-w-4xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Quill playground</h1>

      <section className="flex flex-wrap items-end gap-3" aria-label="What the page passes">
        {(
          [
            ['disabled', disabled, setDisabled],
            ['headingIds', headingIds, setHeadingIds],
            ['linkIdButton (remounts)', linkIdButton, setLinkIdButton],
            ['imagesRef (remounts)', withImages, setWithImages],
            ['aria-invalid', invalid, setInvalid],
          ] as const
        ).map(([name, checked, set]) => (
          <label key={name} className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => {
                set(event.target.checked);
                if (name.includes('remounts')) setRemount((n) => n + 1);
              }}
            />
            {name}
          </label>
        ))}
        <label className="flex flex-col gap-1 text-xs">
          maxImageSize (KB)
          <input
            className={`${field} w-28`}
            type="number"
            value={maxKb}
            onChange={(event) => {
              setMaxKb(Number(event.target.value));
            }}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          allowedImageHosts
          <input
            className={`${field} w-56`}
            value={hosts}
            onChange={(event) => {
              setHosts(event.target.value);
            }}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          The upload
          <select
            className={field}
            value={uploadMode}
            onChange={(event) => {
              setUploadMode(event.target.value as UploadMode);
            }}
          >
            <option value="works">works</option>
            <option value="fails">fails</option>
            <option value="short">gives too few addresses</option>
          </select>
        </label>
      </section>

      <section className="flex flex-col gap-2" aria-label="The editor">
        <span id="description-label" className="text-sm font-medium">
          Description
        </span>
        <QuillEditor
          key={remount}
          ref={quillRef}
          imagesRef={withImages ? imagesRef : undefined}
          value={value}
          onChange={(next) => {
            setValue(next);
            setChanges((n) => n + 1);
            setHeld(imagesRef.current.length);
          }}
          onError={onError}
          disabled={disabled}
          headingIds={headingIds}
          linkIdButton={linkIdButton}
          maxImageSize={maxKb * 1024}
          allowedImageHosts={hostList}
          aria-labelledby="description-label"
          aria-invalid={invalid}
          placeholder="Write the description of the product..."
        />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={button} onClick={() => void save()}>
            Save
          </button>
          <button
            type="button"
            className={button}
            onClick={() => {
              setValue(SAMPLE);
            }}
          >
            Load the sample from outside
          </button>
          <button
            type="button"
            className={button}
            onClick={() => {
              setValue('');
            }}
          >
            Clear from outside
          </button>
          <output className="text-xs" data-testid="status">
            {status}
          </output>
        </div>
        <p className="text-xs" data-testid="counters">
          changes reported: {changes} · images held: {held}
        </p>
        <ul className="text-xs text-red-500" data-testid="errors">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2" aria-label="What was saved">
        <h2 className="text-lg font-semibold">Saved, shown with the viewer</h2>
        <QuillContent content={saved ?? ''} data-testid="saved" />
        <pre className="max-h-40 overflow-auto text-xs" data-testid="saved-html">
          {saved ?? '(nothing saved yet)'}
        </pre>
      </section>

      <section className="flex flex-col gap-2" aria-label="The viewer">
        <h2 className="text-lg font-semibold">The viewer with HTML you type</h2>
        <textarea
          className={`${field} h-32 font-mono text-xs`}
          value={html}
          onChange={(event) => {
            setHtml(event.target.value);
          }}
          aria-label="HTML to show"
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium">QuillContent</span>
            <div className="border-primary/10 rounded-lg border p-3">
              <QuillContent content={html} data-testid="viewer" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium">sanitizeQuillHtml(html)</span>
            <pre
              className="border-primary/10 max-h-64 overflow-auto rounded-lg border p-3 text-xs whitespace-pre-wrap"
              data-testid="sanitized"
            >
              {sanitizeQuillHtml(html)}
            </pre>
          </div>
        </div>
      </section>
    </main>
  );
};
