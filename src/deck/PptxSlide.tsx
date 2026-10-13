import type { CSSProperties, ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Clip } from './Clip';
import { pt } from './geometry';
import type { ClipMedia, StillMedia } from './media';
import type { PptxElement, PptxLine, PptxPara, PptxPicture, PptxText, Spacing } from './pptx';

/*
 * One slide of a deck read out of PowerPoint, laid out as PowerPoint laid it
 * out: every element in its box, type in points against the stage width
 * (see geometry.ts), in the deck's stacking order.
 *
 * Builds are opacity: an element waits invisible until its click. A morph is
 * the same component given the next slide: elements keep their keys across
 * it, so a picture that moved glides to its new box and one that is new
 * fades in, over the morph's length.
 */

/** Helvetica where there is one; Arial has its metrics everywhere else. */
const HELVETICA = 'Helvetica, "Helvetica Neue", Arial, sans-serif';

/** PowerPoint's single line spacing, as a multiple of the type size. */
const LINE = 1.2;

const ALIGN = { l: 'left', ctr: 'center', r: 'right', just: 'justify', dist: 'justify' } as const;
const ANCHOR = { t: 'flex-start', ctr: 'center', b: 'flex-end' } as const;

const pct = (v: number) => `${v * 100}%`;

const space = (s: Spacing | undefined, size: number) =>
    !s ? undefined : s[0] === 'pt' ? pt(s[1]) : pt(s[1] * size * LINE);

const Paragraph = ({ para, first }: { para: PptxPara; first: boolean }) => {
    // A line is as tall as its largest type, as in PowerPoint; an empty paragraph keeps its own size.
    const size = para.runs.length ? Math.max(...para.runs.map((r) => r.size)) : para.size;
    const style: CSSProperties = {
        textAlign: ALIGN[para.align],
        fontSize: pt(size),
        lineHeight: para.line[0] === 'pct' ? para.line[1] * LINE : pt(para.line[1]),
        // PowerPoint leaves out the space before a text box's first paragraph.
        marginTop: first ? undefined : space(para.before, size),
        marginBottom: space(para.after, size),
        paddingLeft: para.marL ? pt(para.marL) : undefined,
        textIndent: para.indent ? pt(para.indent) : undefined,
    };
    const runs: ReactNode[] = para.runs.map((run, i) => {
        if (run.text === '\n') return <br key={i} />;
        const span = (
            <span
                key={i}
                style={{
                    fontSize: pt(run.size),
                    fontWeight: run.bold ? 700 : undefined,
                    fontStyle: run.italic ? 'italic' : undefined,
                    textDecoration: run.underline ? 'underline' : undefined,
                    color: run.color,
                }}
            >
                {run.text}
            </span>
        );
        return run.href ? <a key={i} href={run.href} target="_blank" rel="noreferrer" className="underline">{span}</a> : span;
    });
    return (
        <p style={style}>
            {para.bullet && (
                <span style={{ display: 'inline-block', textIndent: 0, width: pt(-(para.indent ?? 0)) }}>{para.bullet}</span>
            )}
            {para.href ? (
                // A source line: it reads as the deck set it, and goes to its source.
                <a href={para.href} target="_blank" rel="noreferrer" className="decoration-1 underline-offset-2 hover:underline">{runs}</a>
            ) : runs}
            {para.runs.length === 0 && ' '}
        </p>
    );
};

const TextFrame = ({ el }: { el: PptxText }) => {
    const [l, t, r, b] = el.inset;
    return (
        <div
            className="absolute inset-0 flex flex-col"
            style={{ padding: `${pt(t)} ${pt(r)} ${pt(b)} ${pt(l)}`, justifyContent: ANCHOR[el.anchor], whiteSpace: el.wrap ? 'pre-wrap' : 'pre' }}
        >
            <div>
                {el.paras.map((para, i) => <Paragraph key={i} para={para} first={i === 0} />)}
            </div>
        </div>
    );
};

/** A picture or clip, cropped as the deck cropped it: the whole file, offset inside its box. */
const Picture = ({ el, media }: { el: PptxPicture; media: ClipMedia | StillMedia }) => {
    const [l, t, r, b] = el.crop ?? [0, 0, 0, 0];
    const w = 1 - l - r;
    const h = 1 - t - b;
    const style: CSSProperties = { position: 'absolute', left: pct(-l / w), top: pct(-t / h), width: pct(1 / w), height: pct(1 / h) };
    if (el.kind === 'video') {
        return (
            <div style={style}>
                <Clip id={el.media} media={media as ClipMedia} fit="fill" loop={el.loop ?? true} />
            </div>
        );
    }
    return (
        <img
            src={media.src}
            width={media.w}
            height={media.h}
            alt={el.alt ?? ''}
            decoding="async"
            draggable={false}
            style={style}
            className="max-w-none select-none"
        />
    );
};

const Line = ({ el }: { el: PptxLine }) => {
    const marker = `arrow-${el.key.replace(/[^a-z0-9]/gi, '')}`;
    return (
        <svg aria-hidden viewBox="0 0 960 540" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
            {(el.head || el.tail) && (
                <defs>
                    <marker id={marker} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="3" markerHeight="3" orient="auto-start-reverse">
                        <path d="M0,0 L10,5 L0,10 z" fill={el.color} />
                    </marker>
                </defs>
            )}
            <line
                x1={el.from[0] * 960}
                y1={el.from[1] * 540}
                x2={el.to[0] * 960}
                y2={el.to[1] * 540}
                stroke={el.color}
                strokeWidth={el.w}
                markerStart={el.head ? `url(#${marker})` : undefined}
                markerEnd={el.tail ? `url(#${marker})` : undefined}
            />
        </svg>
    );
};

const Element = ({ el, media, step, move }: {
    el: PptxElement;
    media: Record<string, ClipMedia | StillMedia>;
    step: number;
    /** Seconds a morph takes, for boxes that change between slides. */
    move: number;
}) => {
    const shown = (el.step ?? 0) <= step;
    // A build fades in over its own time and goes at once when stepped back; an
    // element a morph brings or takes away fades over the morph.
    const fade = el.step ? (shown && el.fx === 'fade' ? (el.ms ?? 500) / 1000 : 0) : move;
    const opacity = shown ? ('opacity' in el && el.opacity !== undefined ? el.opacity : 1) : 0;
    const transition = { default: { duration: move, ease: [0.45, 0, 0.55, 1] as const }, opacity: { duration: fade } };

    if (el.kind === 'line') {
        return (
            <motion.div className="absolute inset-0 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity }} exit={{ opacity: 0 }} transition={transition}>
                <Line el={el} />
            </motion.div>
        );
    }

    const [x, y, w, h] = el.rect;
    const turn = el.rot || el.flipH || el.flipV
        ? `rotate(${el.rot ?? 0}deg) scale(${el.flipH ? -1 : 1}, ${el.flipV ? -1 : 1})`
        : undefined;
    const shadow = el.kind !== 'text' && 'shadow' in el && el.shadow
        ? `drop-shadow(${pt(el.shadow.x)} ${pt(el.shadow.y)} ${pt(el.shadow.blur / 2)} ${el.shadow.color})`
        : undefined;

    let content: ReactNode = null;
    if (el.kind === 'text') content = <TextFrame el={el} />;
    else if (el.kind === 'box') {
        const line = el.line;
        content = (
            // The outline straddles the box's edge, as PowerPoint draws it.
            <div
                className="absolute"
                style={{
                    inset: line ? pt(-line.w / 2) : 0,
                    background: el.fill,
                    border: line ? `${pt(line.w)} solid ${line.color}` : undefined,
                }}
            />
        );
    } else if (media[el.media]) content = <Picture el={el} media={media[el.media]} />;

    return (
        <motion.div
            className="absolute"
            aria-hidden={shown ? undefined : true}
            initial={{ opacity: 0 }}
            animate={{ left: pct(x), top: pct(y), width: pct(w), height: pct(h), opacity }}
            exit={{ opacity: 0 }}
            transition={transition}
            style={{ filter: shadow, pointerEvents: shown ? undefined : 'none' }}
        >
            <div className={`absolute inset-0 ${el.kind === 'text' ? '' : 'overflow-hidden'}`} style={{ transform: turn }}>
                {content}
            </div>
        </motion.div>
    );
};

/**
 * `morph` is how long, in ms, this slide's elements take to reach their boxes
 * when it replaces another slide of its group.
 */
export const PptxSlide = ({ slide, media, step, morph = 0 }: {
    slide: { bg: string; elements: PptxElement[] };
    media: Record<string, ClipMedia | StillMedia>;
    step: number;
    morph?: number;
}) => {
    const reduce = useReducedMotion();
    const move = reduce ? 0 : morph / 1000;
    return (
        <div className="absolute inset-0 overflow-hidden [container-type:inline-size]" style={{ background: slide.bg, fontFamily: HELVETICA, color: '#000' }}>
            <AnimatePresence initial={false}>
                {slide.elements.map((el) => <Element key={el.key} el={el} media={media} step={step} move={move} />)}
            </AnimatePresence>
        </div>
    );
};
