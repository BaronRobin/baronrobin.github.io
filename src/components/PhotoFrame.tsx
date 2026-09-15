import { useState } from 'react';
import { ImageOff } from 'lucide-react';

/**
 * An <img> that falls back to a neutral tile when the file isn't there.
 *
 * The photo manifest is filled in ahead of the actual JPGs, so a missing file
 * is an expected state rather than an error; this keeps the layout intact
 * instead of collapsing to a broken-image icon.
 */

interface PhotoFrameProps {
    src: string;
    alt: string;
    className?: string;
    /** Applied to the fallback tile so it can match the image's footprint. */
    fallbackClassName?: string;
    loading?: 'lazy' | 'eager';
    /**
     * Natural width/height, reported once decoded. Lets a caller line other
     * elements up with an `object-contain` image, whose rendered width depends
     * on the file's own proportions.
     */
    onRatio?: (ratio: number) => void;
}

const PhotoFrame = ({ src, alt, className = '', fallbackClassName = '', loading = 'lazy', onRatio }: PhotoFrameProps) => {
    // Remember *which* src failed rather than a bare boolean: `src` changes as
    // you step through a series, and this way the next photo gets a real
    // attempt without needing an effect to reset the flag.
    const [failedSrc, setFailedSrc] = useState<string | null>(null);

    if (failedSrc === src) {
        return (
            <div
                className={`flex flex-col items-center justify-center gap-2 bg-slate-100 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/10 text-slate-400 dark:text-slate-600 ${fallbackClassName || className}`}
                role="img"
                aria-label={alt}
            >
                <ImageOff className="w-6 h-6 md:w-8 md:h-8" />
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            loading={loading}
            decoding="async"
            onError={() => setFailedSrc(src)}
            onLoad={onRatio ? (e) => {
                const { naturalWidth, naturalHeight } = e.currentTarget;
                if (naturalHeight > 0) onRatio(naturalWidth / naturalHeight);
            } : undefined}
        />
    );
};

export default PhotoFrame;
