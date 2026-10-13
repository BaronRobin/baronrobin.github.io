import { useContext, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Play, Volume2, VolumeX } from 'lucide-react';
import type { ClipMedia } from './media';
import { PlaybackContext } from './playback';

/**
 * A video from a deck. Loops play silently and only while they can be seen;
 * a film has controls and never starts itself on a project page. Nothing is
 * fetched until the clip comes near the viewport. By default it fills its
 * nearest positioned parent, which is how every slide places media.
 *
 * `chrome` colours the two buttons it can show over the picture (play, with
 * reduced motion, and the speaker), so each deck can set them in its own type.
 */
export const Clip = ({ id, media, fit = 'cover', film = false, loop = true, className = 'absolute inset-0', style, chrome = 'text-white' }: {
    /** The media id: what the playback solo refers to. */
    id: string;
    media: ClipMedia;
    fit?: 'cover' | 'contain' | 'fill';
    film?: boolean;
    loop?: boolean;
    className?: string;
    style?: CSSProperties;
    chrome?: string;
}) => {
    const { t } = useTranslation();
    const { active, sound, solo, setSolo } = useContext(PlaybackContext);
    const reduced = useReducedMotion();
    const ref = useRef<HTMLVideoElement>(null);
    const [near, setNear] = useState(active !== null);
    const [inView, setInView] = useState(false);
    // With reduced motion nothing starts on its own; this is the explicit ask.
    const [asked, setAsked] = useState(false);

    useEffect(() => {
        if (active !== null) return;
        const el = ref.current;
        if (!el) return;
        const nearObserver = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) setNear(true);
        }, { rootMargin: '600px 0px' });
        const viewObserver = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.2 });
        nearObserver.observe(el);
        viewObserver.observe(el);
        return () => {
            nearObserver.disconnect();
            viewObserver.disconnect();
        };
    }, [active]);

    const visible = active ?? inView;
    const starts = (film ? active === true : true) && (!reduced || asked);

    useEffect(() => {
        const video = ref.current;
        if (!video || !near) return;
        if (!visible) video.pause();
        else if (starts) video.play().catch(() => { /* refused: the poster stays up */ });
    }, [visible, starts, near]);

    const hasAudio = Boolean(media.audio);
    const audible = hasAudio && (film
        ? active === null || sound
        : solo === id && (active === null || sound));

    useEffect(() => {
        const video = ref.current;
        if (!video) return;
        video.muted = !audible;
        video.volume = media.volume ?? 1;
    }, [audible, media.volume]);

    // In the deck the speaker only means something once sound is on.
    const showSpeaker = hasAudio && !film && (active === null || sound);

    return (
        <div className={`overflow-hidden ${className}`} style={style}>
            <video
                ref={ref}
                src={near ? media.src : undefined}
                poster={near ? media.poster : undefined}
                muted
                loop={loop && !film}
                playsInline
                preload={film ? 'metadata' : 'none'}
                controls={film}
                className={`absolute inset-0 w-full h-full ${fit === 'cover' ? 'object-cover' : fit === 'contain' ? 'object-contain' : 'object-fill'}`}
            />
            {reduced && !asked && !film && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setAsked(true); }}
                    className={`absolute inset-0 flex items-center justify-center opacity-80 hover:opacity-100 ${chrome}`}
                    aria-label={t('deck.play')}
                >
                    <Play className="w-[12%] min-w-6 h-auto" />
                </button>
            )}
            {showSpeaker && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSolo(audible ? null : id); }}
                    className={`absolute bottom-2 right-2 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-sm px-2.5 py-1.5 text-[11px] uppercase tracking-wider hover:bg-black/80 transition-colors ${chrome}`}
                    aria-pressed={audible}
                >
                    {audible ? <Volume2 size={14} /> : <VolumeX size={14} />}
                    <span>{audible ? t('deck.mute') : t('deck.listen')}</span>
                </button>
            )}
        </div>
    );
};
