/**
 * Photography manifest.
 *
 * Adding a series:
 *   1. Create `public/photography/<folderName>/` and drop the JPGs in, named
 *      `01.jpg`, `02.jpg`, ... plus a `cover.jpg` used on the index card.
 *   2. Add a PhotoSeries entry below.
 *   3. Add matching copy under `photography.series.<id>` in all three locale
 *      files (src/locales/{en,de,es}.json).
 *
 * Per-photo metadata (camera, lens, film, location, date) lives here rather
 * than in i18n on purpose: camera bodies, film stocks and place names are
 * proper nouns and read the same in every language. Only the field *labels*
 * are translated.
 */

export interface Photo {
    file: string;       // filename within the series folder, e.g. '04.jpg'
    camera?: string;    // 'Olympus OM-10'
    lens?: string;      // 'Zuiko 50mm f/1.8'
    film?: string;      // 'Kodak Portra 400', omit for digital
    location?: string;  // 'Lisbon, PT'
    date?: string;      // rendered verbatim, so format it how you want it read
}

export interface PhotoSeries {
    id: string;          // 'analog-om10', route param, kebab-case
    title: string;       // English fallback; real copy comes from i18n
    folderName: string;  // 'analog_om10', mirrors public/photography/
    cover: string;       // filename used on the index card
    photos: Photo[];
}

/**
 * Placeholder content: the shape is real, the photos are not there yet.
 * Replace the entries (and drop files into public/photography/) with the
 * actual work; the gallery renders a neutral tile for any file it can't load,
 * so a half-filled manifest degrades quietly instead of breaking the layout.
 */
export const photoSeries: PhotoSeries[] = [
    {
        id: 'analog-om10',
        title: 'Analog Film',
        folderName: 'analog_om10',
        cover: 'cover.jpg',
        photos: [
            { file: '01.jpg', camera: 'Olympus OM-10', lens: 'Zuiko 50mm f/1.8', film: 'Kodak Portra 400', location: 'Kaiserslautern, DE', date: 'May 2024' },
            { file: '02.jpg', camera: 'Olympus OM-10', lens: 'Zuiko 50mm f/1.8', film: 'Kodak Portra 400', location: 'Kaiserslautern, DE', date: 'May 2024' },
            { file: '03.jpg', camera: 'Olympus OM-10', lens: 'Zuiko 50mm f/1.8', film: 'Ilford HP5 Plus', location: 'Lisbon, PT', date: 'Aug 2024' },
            { file: '04.jpg', camera: 'Olympus OM-10', lens: 'Zuiko 28mm f/2.8', film: 'Ilford HP5 Plus', location: 'Lisbon, PT', date: 'Aug 2024' },
            { file: '05.jpg', camera: 'Olympus OM-10', lens: 'Zuiko 28mm f/2.8', film: 'Cinestill 800T', location: 'Porto, PT', date: 'Aug 2024' },
            { file: '06.jpg', camera: 'Olympus OM-10', lens: 'Zuiko 50mm f/1.8', film: 'Cinestill 800T', location: 'Porto, PT', date: 'Aug 2024' },
        ],
    },
    {
        id: 'digital',
        title: 'Digital',
        folderName: 'digital',
        cover: 'cover.jpg',
        photos: [
            { file: '01.jpg', camera: 'Sony A7 III', lens: 'Sigma 24-70mm f/2.8', location: 'Kaiserslautern, DE', date: 'Mar 2025' },
            { file: '02.jpg', camera: 'Sony A7 III', lens: 'Sigma 24-70mm f/2.8', location: 'Kaiserslautern, DE', date: 'Mar 2025' },
            { file: '03.jpg', camera: 'Sony A7 III', lens: 'Samyang 85mm f/1.4', location: 'Heidelberg, DE', date: 'Jun 2025' },
            { file: '04.jpg', camera: 'Sony A7 III', lens: 'Samyang 85mm f/1.4', location: 'Heidelberg, DE', date: 'Jun 2025' },
            { file: '05.jpg', camera: 'DJI Mini 3 Pro', location: 'Pfälzerwald, DE', date: 'Sep 2025' },
        ],
    },
];

/**
 * Photography is finished but the series are still placeholders, so the nav
 * entry stays hidden. Routes remain live: /#/photography works if you share
 * it directly. Flip this to true once real photos are in.
 */
export const PHOTOGRAPHY_IN_NAV = false;

export const photoUrl = (series: PhotoSeries, file: string) =>
    `/photography/${series.folderName}/${file}`;
