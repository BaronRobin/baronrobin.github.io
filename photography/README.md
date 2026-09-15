# Photography assets

One folder per series. The folder name must match `folderName` in
[`src/data/photos.ts`](../../src/data/photos.ts).

```
public/photography/
  analog_om10/
    cover.jpg     <- used on the /photography index card
    01.jpg
    02.jpg
    ...
  digital/
    cover.jpg
    01.jpg
    ...
```

Notes:

- Filenames are listed explicitly in the manifest, so they can be anything —
  `01.jpg` … `NN.jpg` is just the convention the rest of the repo uses
  (see `public/projects/`).
- There is no build-time image pipeline. Export at a sensible web size
  (long edge ~2000px) and convert to `.webp` yourself if you want the smaller
  files; the manifest takes whatever extension you give it.
- The gallery lazy-loads thumbnails and preloads the next/previous full image,
  so a series of 30–40 shots is fine.
- Any file the browser can't load renders as a neutral placeholder tile rather
  than a broken image, so you can fill a series in gradually.
