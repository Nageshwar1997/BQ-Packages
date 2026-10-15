import { useEffect, useRef, useState } from 'react';

/**
 * An address the browser can show for each file (`URL.createObjectURL`), made once for a file, and
 * given back (`URL.revokeObjectURL`) when the file is no longer in the list and when the component
 * goes away, so the memory of a file is not kept after it is not needed.
 *
 * The addresses are made after the render (it is an effect: making them is a change in the browser),
 * so a file that was just added has none for one render; look for it with `urls.get(file)`.
 */
export const useObjectUrls = (files: readonly File[]): ReadonlyMap<File, string> => {
  const liveRef = useRef(new Map<File, string>());
  const [urls, setUrls] = useState<ReadonlyMap<File, string>>(new Map());

  useEffect(() => {
    const live = liveRef.current;
    const wanted = new Set(files);

    for (const [file, url] of live) {
      if (wanted.has(file)) continue;

      URL.revokeObjectURL(url);
      live.delete(file);
    }

    for (const file of wanted) {
      if (!live.has(file)) live.set(file, URL.createObjectURL(file));
    }

    // making an address changes the browser, which is what an effect is for; the render has to be
    // told about it to draw the files

    setUrls(new Map(live));
  }, [files]);

  useEffect(() => {
    const live = liveRef.current;

    return () => {
      for (const url of live.values()) URL.revokeObjectURL(url);

      live.clear();
    };
  }, []);

  return urls;
};
