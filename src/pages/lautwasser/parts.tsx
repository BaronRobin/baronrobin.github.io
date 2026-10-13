import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import { Clip as DeckClip } from '../../deck/Clip';
import { at, pt, type Rect } from '../../deck/geometry';
import wordsJson from './displayWords.json';
import { clipMedia, stillMedia, type MediaId } from './media';

/* The building blocks both views are made of. See src/deck/geometry.ts for the units. */

/** A text box, with PowerPoint's default insets (0.1in across, 0.05in down). */
export const TextBox = ({
    rect,
    size,
    align = 'left',
    className = '',
    style,
    children,
}: {
    rect: Rect;
    size: number;
    align?: 'left' | 'center' | 'right' | 'justify';
    className?: string;
    style?: CSSProperties;
    children: ReactNode;
}) => (
    <div
        style={{ ...at(rect), fontSize: pt(size), padding: `${pt(3.6)} ${pt(7.2)}`, textAlign: align, lineHeight: 1.2, ...style }}
        className={`font-lw ${className}`}
    >
        {children}
    </div>
);

/**
 * The colours the deck sets its small caps in: blue as a rule, the
 * near-black it uses for asides, and paper over full-bleed video.
 */
type Tone = 'ink' | 'line' | 'paper';

const TONE_TEXT: Record<Tone, string> = { ink: 'text-lw-ink', line: 'text-lw-line', paper: 'text-lw-paper' };

/** The deck's small caps. */
export const Label = ({ rect, align = 'left', tone = 'ink', children }: {
    rect: Rect;
    align?: 'left' | 'center' | 'right';
    tone?: Tone;
    children: ReactNode;
}) => (
    <TextBox rect={rect} size={8} align={align} className={`font-light uppercase whitespace-nowrap pointer-events-none ${TONE_TEXT[tone]}`}>
        {children}
    </TextBox>
);

/** The corner mark beside each label: a hairline across, then down. */
const Tick = ({ x, y, light = false }: { x: number; y: number; light?: boolean }) => (
    <div aria-hidden style={at([x, y, 0.0112, 0.0199])} className={`border-t border-r pointer-events-none ${light ? 'border-lw-paper' : 'border-lw-line'}`} />
);

/**
 * The full-bleed slides keep only the bottom-left corner of the strip: the
 * slide's name and its tick, in paper over the video or in the deck's
 * near-black where it sinks into it (the case film).
 */
export const CornerLabel = ({ tone = 'paper', children }: { tone?: 'line' | 'paper'; children: ReactNode }) => (
    <>
        <Tick x={0.0143} y={0.9473} light={tone === 'paper'} />
        <Label rect={[0.0367, 0.9429, 0.3238, 0.0314]} tone={tone}>{children}</Label>
    </>
);

/**
 * The strip every slide carries, top or bottom: what the slide is on the
 * left, its chapter in the middle, the course on the right.
 */
export const HeaderBar = ({ left, middle, right, bottom = false }: {
    left: ReactNode;
    middle: ReactNode;
    right: ReactNode;
    bottom?: boolean;
}) => {
    const [tick, tickMid, yLeft, yMid, yRight] = bottom
        ? [0.9473, 0.9499, 0.9429, 0.9425, 0.9419]
        : [0.0249, 0.0275, 0.0205, 0.0202, 0.0196];
    return (
        <>
            <Tick x={0.0143} y={tick} />
            <Tick x={0.52} y={tickMid} />
            <Tick x={0.9745} y={tick} />
            <Label rect={[0.0367, yLeft, 0.3238, 0.0314]}>{left}</Label>
            <Label rect={[0.5425, yMid, 0.2613, 0.0314]}>{middle}</Label>
            <Label rect={[0.7645, yRight, 0.1988, 0.0314]} align="right">{right}</Label>
        </>
    );
};

/**
 * The construction layer: frames, diagonals and arcs in the deck's 0.5pt
 * near-black. Coordinates are slide fractions, except `paths`, which are in
 * the 1920x1080 space a PowerPoint slide maps onto one-to-one (6350 EMU per
 * unit on both axes), so arcs stay round.
 */
export const Hairlines = ({ rects = [], lines = [], paths = [], weight = 1, className = 'text-lw-line' }: {
    rects?: Rect[];
    lines?: [number, number, number, number][];
    paths?: string[];
    weight?: number;
    className?: string;
}) => (
    <svg
        aria-hidden
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
        className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={weight}
    >
        {rects.map(([x, y, w, h], i) => (
            <rect key={`r${i}`} x={x * 1920} y={y * 1080} width={w * 1920} height={h * 1080} vectorEffect="non-scaling-stroke" />
        ))}
        {lines.map(([x1, y1, x2, y2], i) => (
            <line key={`l${i}`} x1={x1 * 1920} y1={y1 * 1080} x2={x2 * 1920} y2={y2 * 1080} vectorEffect="non-scaling-stroke" />
        ))}
        {paths.map((d, i) => (
            <path key={`p${i}`} d={d} vectorEffect="non-scaling-stroke" />
        ))}
    </svg>
);

/**
 * The glitch texture the deck lays over every slide, at the deck's 2%
 * (alphaModFix 2000; PowerPoint shows it as 98% transparency).
 */
export const Overlay = ({ opacity = 0.02, className = 'absolute inset-0' }: { opacity?: number; className?: string }) => (
    <img
        src={stillMedia('overlay').src}
        alt=""
        aria-hidden
        draggable={false}
        style={{ opacity }}
        className={`${className} w-full h-full object-cover pointer-events-none select-none`}
    />
);

/** A slide: the 16:9 frame the geometry is measured against. */
export const Stage = ({ paper = false, className = '', children }: {
    /** Slide 2 is the one light slide. */
    paper?: boolean;
    className?: string;
    children: ReactNode;
}) => (
    <div className={`relative w-full aspect-video overflow-hidden [container-type:inline-size] ${paper ? 'bg-lw-paper' : 'bg-black'} ${className}`}>
        {children}
        <Overlay />
    </div>
);

/** An absolutely placed box for media, clipped like a cropped picture. */
export const Place = ({ rect, className = '', style, children }: {
    rect: Rect;
    className?: string;
    style?: CSSProperties;
    children: ReactNode;
}) => (
    <div style={{ ...at(rect), ...style }} className={`overflow-hidden ${className}`}>
        {children}
    </div>
);

/* ------------------------------------------------------------ display type */

const WORDS = wordsJson as {
    unitsPerEm: number;
    ascent: number;
    words: Record<string, { advance: number; d: string }>;
};

/**
 * A title word in the deck's NuCaloric, drawn from outlines made by
 * scripts/lautwasser-words.py rather than set from the font. 1em tall, like
 * type, so a parent's font-size sizes it. A word with no outline yet falls
 * back to plain heavy type rather than vanishing.
 */
export const DisplayWord = ({ text, className = '' }: { text: string; className?: string }) => {
    const glyphs = WORDS.words[text];
    if (!glyphs) {
        return <span className={`font-lw font-extrabold uppercase leading-none ${className}`}>{text}</span>;
    }
    return (
        <span className={`inline-block leading-none ${className}`}>
            <span className="sr-only">{text}</span>
            <svg
                aria-hidden
                viewBox={`0 0 ${glyphs.advance} ${WORDS.ascent}`}
                style={{ height: '1em', width: `${glyphs.advance / WORDS.unitsPerEm}em` }}
                className="block fill-current"
            >
                <path d={glyphs.d} />
            </svg>
        </span>
    );
};

/** A 48pt chapter word, placed like the deck's title text boxes. */
export const DisplayTitle = ({ rect, text, align = 'left' }: { rect: Rect; text: string; align?: 'left' | 'center' }) => (
    <div
        style={{ ...at(rect), fontSize: pt(48), padding: `${pt(3.6)} ${pt(7.2)}` }}
        className={`flex items-center text-lw-blue ${align === 'center' ? 'justify-center' : 'justify-start'}`}
    >
        <DisplayWord text={text} />
    </div>
);

/* ---------------------------------------------------------------- playback */

/**
 * A video from the deck, on the shared player (src/deck/Clip), with its
 * buttons in the deck's own type.
 */
export const Clip = ({ id, ...props }: { id: MediaId } & Omit<ComponentProps<typeof DeckClip>, 'id' | 'media' | 'chrome'>) => (
    <DeckClip id={id} media={clipMedia(id)} chrome="font-lw text-lw-paper" {...props} />
);

const OBJECT_FIT = { cover: 'object-cover', contain: 'object-contain', fill: 'object-fill' } as const;

/**
 * A still from the deck. `fill` stretches it to its box the way PowerPoint
 * does when a picture's crop and frame disagree (the Pi sketch on slide 20).
 */
export const Still = ({ id, alt = '', fit = 'cover', className = '', style }: {
    id: MediaId;
    alt?: string;
    fit?: keyof typeof OBJECT_FIT;
    className?: string;
    style?: CSSProperties;
}) => {
    const media = stillMedia(id);
    return (
        <img
            src={media.src}
            width={media.w}
            height={media.h}
            alt={alt}
            loading="lazy"
            decoding="async"
            draggable={false}
            style={style}
            className={`w-full h-full ${OBJECT_FIT[fit]} ${className}`}
        />
    );
};
