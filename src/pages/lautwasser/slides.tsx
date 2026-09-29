import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
    BAR_HEX, BAR_TEXT, IDEA_STEPS, NOISE, NOISE_SOURCE_URL, PALETTE, STATES, STATION_DOT, STATIONS, STATIONS_MAP_AT, type ChapterId,
} from './data';
import { at, pt, type Rect } from './geometry';
import type { MediaId } from './media';
import { Clip, CornerLabel, DisplayTitle, HeaderBar, Hairlines, Label, Place, Stage, Still, TextBox } from './parts';

/*
 * The deck, slide by slide. Every number here is the presentation's own: box
 * positions are fractions of the 16:9 frame and sizes are PowerPoint points.
 * Slides are named for their key under lautwasser.slides and numbered in
 * comments by their place in LAUTWASSER_Praesentation.pptx; order.ts puts
 * them in order. Within a slide, elements come in the deck's stacking order.
 *
 * Media the deck turned or cropped was turned and cropped when it was cut
 * (scripts/lautwasser-media.py), so a turned picture is placed here by the
 * box it covers once turned.
 */

/** The frame most slides hang their content in, under the header strip. */
const FRAME: Rect = [0.0143, 0.0778, 0.9715, 0.8973];
/** The lower frame of a slide that opens with a title word. */
const LOW_FRAME: Rect = [0.0143, 0.2189, 0.9715, 0.7561];
/** Where the title word sits. */
const TITLE_AT: Rect = [0.0142, 0.0977, 0.6344, 0.1212];
/** The 40pt caption in the bottom-left corner. */
const CAPTION_AT: Rect = [0.0255, 0.8519, 0.6344, 0.1032];

/** Top of the frame on most slides: topic, chapter, course. */
const Header = ({ topic, chapter }: { topic: ReactNode; chapter: ChapterId }) => {
    const { t } = useTranslation();
    return (
        <HeaderBar
            left={typeof topic === 'string' ? t(`lautwasser.slides.${topic}.topic`) : topic}
            middle={t(`lautwasser.chapters.${chapter}`)}
            right={t('lautwasser.course')}
        />
    );
};

/** The deck's most common slide: the header strip over one framed video. */
const FramedClip = ({ topic, chapter, clip, rect = FRAME, children }: {
    topic: string;
    chapter: ChapterId;
    clip: MediaId;
    rect?: Rect;
    children?: ReactNode;
}) => (
    <Stage>
        <Place rect={rect}>
            <Clip id={clip} />
        </Place>
        <Hairlines rects={[FRAME]} />
        <Header topic={topic} chapter={chapter} />
        {children}
    </Stage>
);

/** A looping tile with its word over it, in a hairline frame (slides 7 and 23). */
const Tile = ({ rect, clip, children }: { rect: Rect; clip: MediaId; children: ReactNode }) => (
    <div style={at(rect)} className="border border-lw-line">
        <Clip id={clip} />
        <div className="absolute inset-0 flex items-center justify-center font-lw font-light uppercase text-lw-paper" style={{ fontSize: pt(18) }}>
            {children}
        </div>
    </div>
);

/* 1, 29 - Title and outro ---------------------------------------------------- */

/**
 * The video barely shows through: a black gradient runs over it, near opaque
 * behind the wordmark and thinner at the top and bottom edges.
 */
const COVER_SCRIM = 'linear-gradient(to bottom, rgba(0,0,0,.35) 0%, rgba(0,0,0,.5) 22%, rgba(0,0,0,.98) 45%, rgba(0,0,0,.64) 100%)';

/** Three quarter circles rippling out of the bottom-left corner. */
const COVER_ARCS = [
    'M26.3 182.4 A810.4 814.6 0 0 1 836.7 997',
    'M102.6 29 A966.6 967 0 0 1 1069.2 996.1',
    'M28.3 406.4 A586.9 589.9 0 0 1 615.2 996.3',
];

/**
 * Slide 1, and with other words slide 29. The outro drops the construction
 * lines and sits its words a little lower.
 */
const Cover = ({ clip, word, sub, left, middle, right, construction = false, tops = [0.4141, 0.5147] }: {
    clip: MediaId;
    word: string;
    sub: string;
    left: string;
    middle: string;
    right: string;
    construction?: boolean;
    /** Where the title word and the line under it start. */
    tops?: [number, number];
}) => (
    <Stage>
        <Place rect={[0, 0, 1, 1]}>
            <Clip id={clip} />
        </Place>
        <div aria-hidden className="absolute inset-0" style={{ background: COVER_SCRIM }} />
        {construction && (
            <Hairlines
                paths={COVER_ARCS}
                lines={[[0.6807, 0.0258, 0.6807, 0.924], [0.0143, 0.0269, 0.9858, 0.9231], [0.3181, 0.0258, 0.3201, 0.9231]]}
            />
        )}
        <HeaderBar bottom left={left} middle={middle} right={right} />
        <DisplayTitle rect={[0.1828, tops[0], 0.6344, 0.1212]} text={word} align="center" />
        <TextBox rect={[0.1948, tops[1], 0.6103, 0.0583]} size={20} align="center" className="font-light uppercase text-lw-paper">
            {sub}
        </TextBox>
    </Stage>
);

export const Titel = () => {
    const { t } = useTranslation();
    return (
        <Cover
            clip="title"
            word={t('lautwasser.display.lautwasser')}
            sub={t('lautwasser.subtitle')}
            left={t('lautwasser.slides.titel.topic')}
            middle={t('lautwasser.theme')}
            right={t('lautwasser.course')}
            construction
        />
    );
};

export const Outro = () => {
    const { t } = useTranslation();
    return (
        <Cover
            clip="outro"
            word={t('lautwasser.display.live')}
            sub={t('lautwasser.slides.outro.sub')}
            left={t('lautwasser.slides.outro.topic')}
            middle={t('lautwasser.team')}
            right={t('lautwasser.program')}
            tops={[0.4241, 0.5261]}
        />
    );
};

/* 2 - What it is ------------------------------------------------------------ */

/** A quarter ellipse round the frame's top-left corner, from its top edge down to its left. */
const INTRO_ARC = 'M613.1 29.7 A586.9 566.9 0 0 1 26.2 596.6';

export const Intro = () => {
    const { t } = useTranslation();
    return (
        <Stage paper>
            <Place rect={[0.0143, 0.0297, 0.9715, 0.8952]}>
                <Still id="intro-wave" />
            </Place>
            <Hairlines
                paths={[INTRO_ARC]}
                lines={[[0.6807, 0.0268, 0.6807, 0.9241], [0.3193, 0.0258, 0.3213, 0.9231]]}
            />
            <HeaderBar bottom left={t('lautwasser.team')} middle={t('lautwasser.supervisors')} right={t('lautwasser.program')} />
            {/* Set upright along the left edge, reading bottom to top. */}
            <TextBox rect={[-0.145, 0.302, 0.4467, 0.1571]} size={32} className="font-light uppercase text-lw-ink" style={{ transform: 'rotate(270deg)' }}>
                {t('lautwasser.slides.intro.space').split(' ').map((word, i) => (
                    <span key={i} className="block">{word}</span>
                ))}
            </TextBox>
            <TextBox rect={[0.0346, 0.7614, 0.1163, 0.0853]} size={32} className="font-extrabold text-lw-ink">M85</TextBox>
            <TextBox rect={[0.0346, 0.8238, 0.1545, 0.0853]} size={32} className="font-light uppercase whitespace-nowrap text-lw-ink">
                {t('lautwasser.semester')}
            </TextBox>
            <TextBox rect={[0.3321, 0.7532, 0.3379, 0.1571]} size={32} className="font-light uppercase text-lw-ink">
                {t('lautwasser.theme')}
            </TextBox>
            <Hairlines rects={[[0.0143, 0.0258, 0.9715, 0.8982]]} />
            <TextBox rect={[0.3343, 0.0577, 0.3311, 0.4847]} size={10} align="justify" className="font-light text-black hyphens-auto">
                <span className="block font-extrabold uppercase">{t('lautwasser.slides.intro.title')}</span>
                {t('lautwasser.slides.intro.body')}
            </TextBox>
            <Hairlines lines={[[0.0143, 0.0267, 0.3213, 0.9231]]} />
        </Stage>
    );
};

/* 3 - Waves ------------------------------------------------------------------- */

export const Wellen = () => {
    const { t } = useTranslation();
    return (
        <Stage>
            <Place rect={[0.0142, 0.2193, 0.9715, 0.7558]}>
                <Clip id="sound" />
            </Place>
            <Header topic="wellen" chapter="herleitung" />
            <Hairlines rects={[LOW_FRAME]} />
            <DisplayTitle rect={TITLE_AT} text={t('lautwasser.display.sound')} />
        </Stage>
    );
};

/* 4 - Noise ---------------------------------------------------------------- */

export const Laerm = () => {
    const { t } = useTranslation();
    return (
        <Stage>
            <Header topic="laerm" chapter="herleitung" />
            <Hairlines rects={[[0.0143, 0.0778, 0.9715, 0.8444]]} lines={[[0.0143, 0.0778, 0.9858, 0.9222]]} />
            <Hairlines
                weight={1.5}
                lines={[
                    [0.2133, 0.0778, 0.2133, 0.9222],
                    [0.4164, 0.0778, 0.4164, 0.9222],
                    [0.6976, 0.0778, 0.6976, 0.9222],
                    [0.0143, 0.5595, 0.9858, 0.5595],
                ]}
            />
            {/* 16pt bars: 32 units of the 1080-high frame. */}
            <svg aria-hidden viewBox="0 0 1920 1080" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                {NOISE.flatMap((row) => row.bars.map(([from, to], i) => (
                    <line
                        key={`${row.source}${i}`}
                        x1={from * 1920}
                        x2={to * 1920}
                        y1={row.y * 1080}
                        y2={row.y * 1080}
                        stroke={BAR_HEX[row.colour]}
                        strokeWidth={32}
                    />
                )))}
            </svg>
            <Label rect={[0.6543, 0.113, 0.1093, 0.0314]} tone="line">{t('lautwasser.decibels.level')}</Label>
            <Label rect={[0.8083, 0.1136, 0.2613, 0.0314]} tone="line">{t('lautwasser.decibels.source')}</Label>
            {NOISE.map((row) => (
                <div key={row.source}>
                    <TextBox rect={[row.dbAt[0], row.dbAt[1], 0.2613, 0.0359]} size={10} className={`font-light whitespace-nowrap ${BAR_TEXT[row.colour]}`}>
                        {row.db}
                    </TextBox>
                    <TextBox rect={[row.sourceAt[0], row.sourceAt[1], 0.2613, 0.0359]} size={10} className={`font-light whitespace-nowrap ${BAR_TEXT[row.colour]}`}>
                        {t(`lautwasser.decibels.sources.${row.source}`)}
                    </TextBox>
                </div>
            ))}
            <Label rect={[0.573, 0.9419, 0.4208, 0.0314]} align="right" tone="line">
                {NOISE_SOURCE_URL.replace('https://www.', '')} · Variotherm
            </Label>
        </Stage>
    );
};

/* 5 - Birds ------------------------------------------------------------------ */

export const Voegel = () => {
    const { t } = useTranslation();
    return (
        <Stage>
            {/* The song as a waveform, standing upright between drawing and bird. */}
            <Place rect={[0.4417, 0.0823, 0.0786, 0.894]}>
                <Clip id="bird-wave" />
            </Place>
            <Place rect={[0.5313, 0.0823, 0.4687, 0.8927]}>
                <Clip id="bird" />
            </Place>
            <Place rect={[0, 0.0804, 0.4305, 0.8946]}>
                <Still id="bird-drawing" />
            </Place>
            <Hairlines rects={[[0, 0.0804, 0.4305, 0.8946]]} />
            <Header topic="voegel" chapter="herleitung" />
            <Hairlines rects={[[0, 0.0797, 1, 0.8961]]} />
            <TextBox rect={[0.0255, 0.141, 0.4107, 0.1571]} size={32} className="font-extrabold text-lw-paper">
                {t('lautwasser.slides.voegel.lead')}
            </TextBox>
            <TextBox rect={[0.561, 0.6914, 0.4092, 0.2289]} size={32} align="right" className="font-extrabold text-lw-paper">
                {t('lautwasser.slides.voegel.tail')}
                <br />
                {t('lautwasser.slides.voegel.tail2')}
            </TextBox>
        </Stage>
    );
};

/* 6 - Case film -------------------------------------------------------------- */

export const Casefilm = () => {
    const { t } = useTranslation();
    return (
        <Stage>
            <Place rect={[0, 0, 1, 1]}>
                <Clip id="casefilm" film />
            </Place>
            <CornerLabel tone="line">{t('lautwasser.slides.casefilm.topic')}</CornerLabel>
        </Stage>
    );
};

/* 7 - Our idea --------------------------------------------------------------- */

const IDEA_X = [0.1171, 0.3221, 0.5202, 0.7183];

export const Idee = () => {
    const { t } = useTranslation();
    const steps = t('lautwasser.slides.idee.steps', { returnObjects: true }) as string[];
    return (
        <Stage>
            <Header topic="idee" chapter="konzept" />
            <DisplayTitle rect={TITLE_AT} text={t('lautwasser.display.konzept')} />
            <Hairlines rects={[LOW_FRAME]} lines={[[0.0142, 0.2189, 0.9857, 0.9741]]} />
            {IDEA_STEPS.map((id, i) => (
                <Tile key={id} rect={[IDEA_X[i], 0.4191, 0.17, 0.3022]} clip={id}>
                    {steps[i]}
                </Tile>
            ))}
        </Stage>
    );
};

/* 8 - Data visualisation ------------------------------------------------------ */

export const Datenvis = () => (
    <Stage>
        <Place rect={[0.7725, 0.0778, 0.2132, 0.8995]}>
            <Clip id="bubbles" />
        </Place>
        <Place rect={[0.0143, 0.0826, 0.7462, 0.8918]}>
            <Clip id="datavis" />
        </Place>
        <Hairlines lines={[[0.7604, 0.0778, 0.7604, 0.9773], [0.7725, 0.0778, 0.7725, 0.9773]]} />
        <Header topic="datenvis" chapter="konzept" />
        <Hairlines rects={[FRAME]} />
    </Stage>
);

/* 9 - Stations ---------------------------------------------------------------- */

export const Stationen = () => {
    const { t } = useTranslation();
    const r = (STATION_DOT[0] * 1920) / 2;
    return (
        <Stage>
            <Place rect={STATIONS_MAP_AT}>
                <Still id="stations-map" />
            </Place>
            <Header topic="stationen" chapter="prozess" />
            <DisplayTitle rect={TITLE_AT} text={t('lautwasser.display.prozess')} />
            <Hairlines rects={[LOW_FRAME]} />
            {/* Blue with a 1pt white rim: two units of the 1920-wide frame. */}
            <svg aria-hidden viewBox="0 0 1920 1080" className="absolute inset-0 w-full h-full pointer-events-none">
                {STATIONS.map(([x, y]) => (
                    <circle key={`${x}-${y}`} cx={x * 1920 + r} cy={y * 1080 + r} r={r} strokeWidth={2} className="fill-lw-blue stroke-white" />
                ))}
            </svg>
        </Stage>
    );
};

/* 10 - Recordings ------------------------------------------------------------- */

export const Aufnahmen = () => (
    <Stage>
        <Place rect={[0.5313, 0.0784, 0.2223, 0.896]}>
            <Clip id="rec-left" />
        </Place>
        <Place rect={[0.0142, 0.0778, 0.5058, 0.8946]}>
            <Clip id="rec-main" />
        </Place>
        <Place rect={[0.7659, 0.0778, 0.2198, 0.8966]}>
            <Clip id="rec-right" />
        </Place>
        <Header topic="aufnahmen" chapter="prozess" />
        <Hairlines rects={[FRAME]} />
    </Stage>
);

/* 11, 12 - The spectrum at 24 and at 32 bit ------------------------------------ */

const Spektral = ({ clip, bits }: { clip: MediaId; bits: string }) => (
    <FramedClip topic="spektral" chapter="prozess" clip={clip}>
        <TextBox rect={CAPTION_AT} size={40} className="font-light text-lw-paper">{bits}</TextBox>
    </FramedClip>
);

export const Spektral24 = () => <Spektral clip="spectral-24" bits="24-Bit" />;
export const Spektral32 = () => <Spektral clip="spectral-32" bits="32-Bit" />;

/* 13 - 24 against 32 bit, by ear ---------------------------------------------- */

export const Vergleich = () => (
    <Stage>
        <Header topic="spektral" chapter="prozess" />
        <Hairlines lines={[[0.3193, 0.0778, 0.3193, 0.9741], [0.0143, 0.0778, 0.9858, 0.9741]]} />
        <Place rect={[0.0143, 0.3484, 0.5866, 0.6266]}>
            <Clip id="listen-32" />
        </Place>
        <Hairlines lines={[[0.6941, 0.0788, 0.6941, 0.9751]]} />
        <Place rect={[0.4262, 0.0733, 0.5596, 0.5782]}>
            <Clip id="listen-24" />
        </Place>
        <TextBox rect={[0.0255, 0.8519, 0.6344, 0.1032]} size={40} className="font-light text-lw-paper">32-Bit</TextBox>
        <TextBox rect={[0.3514, 0.0899, 0.6344, 0.1032]} size={40} align="right" className="font-light text-lw-paper">24-Bit</TextBox>
        <Hairlines rects={[[0.0143, 0.0778, 0.9715, 0.8973]]} />
    </Stage>
);

/* 14, 17 - TouchDesigner ------------------------------------------------------- */

export const TdNetwork = () => <FramedClip topic="td" chapter="prozess" clip="td-network" rect={[0.0143, 0.0804, 0.9715, 0.8947]} />;
export const TdEffect = () => <FramedClip topic="td" chapter="prozess" clip="td-effect" rect={[0.0143, 0.0788, 0.9715, 0.8963]} />;

/* 15, 16 - Effects ----------------------------------------------------------------- */

export const Effekt = () => {
    const { t } = useTranslation();
    return (
        <Stage>
            <Place rect={[0, 0, 1, 1]}>
                <Clip id="effect" />
            </Place>
            <CornerLabel>{t('lautwasser.slides.effekt.topic')}</CornerLabel>
        </Stage>
    );
};

/** Three moments of one capture side by side, black bars over the seams. */
export const Effekte = () => {
    const { t } = useTranslation();
    return (
        <Stage>
            <Place rect={[-0.0039, 0, 0.3359, 1]}>
                <Clip id="fx-a" />
            </Place>
            <Place rect={[0.332, 0, 0.3359, 1]}>
                <Clip id="fx-b" />
            </Place>
            <CornerLabel>{t('lautwasser.slides.effekte.topic')}</CornerLabel>
            <Place rect={[0.668, 0, 0.3359, 1]}>
                <Clip id="fx-c" />
            </Place>
            <div aria-hidden style={at([0.3266, 0, 0.0109, 1])} className="bg-black" />
            <div aria-hidden style={at([0.6625, 0, 0.0109, 1])} className="bg-black" />
        </Stage>
    );
};

/* 18, 19 - The Lauter as a persona ---------------------------------------------- */

export const Perspektive = () => {
    const { t } = useTranslation();
    return (
        <Stage>
            <Place rect={[0, 0.0778, 1, 0.8964]}>
                <Still id="persona-phone" />
            </Place>
            <Hairlines rects={[[0, 0.0778, 1, 0.8973]]} />
            <Header topic="perspektive" chapter="prozess" />
            <TextBox rect={[0.0255, 0.6395, 0.6344, 0.2827]} size={40} className="font-light uppercase text-lw-paper">
                {t('lautwasser.slides.perspektive.quote')}
            </TextBox>
        </Stage>
    );
};

export const Personifikation = () => {
    const { t } = useTranslation();
    return (
        <Stage>
            <Place rect={[0, 0, 1, 1]}>
                <Clip id="persona-face" />
            </Place>
            <CornerLabel>{t('lautwasser.slides.personifikation.topic')}</CornerLabel>
            <Place rect={[0.5, 0, 0.5, 1]}>
                <Clip id="persona-fx" />
            </Place>
            <div aria-hidden style={at([0.4946, 0, 0.0109, 1])} className="bg-black" />
        </Stage>
    );
};

/* 20, 21 - The Raspberry Pi, then the app that was dropped -------------------- */

/**
 * The deck morphs 20 into 21: the same objects, slid along. The Pi, the knob
 * and the sketch leave to the left, the phone with the app comes in from the
 * right, and a second OSC arrow appears between computer and phone. Each
 * object's x is where it stands on 20 and on 21.
 */
interface Moving {
    x: [number, number];
    y: number;
    w: number;
    h: number;
}

const PI_PC: Moving = { x: [0.5609, 0.0172], y: 0.2171, w: 0.3976, h: 0.6176 };
const PI_KNOB: Moving = { x: [0.2887, -0.255], y: 0.4164, w: 0.1202, h: 0.2512 };
const PI_BOARD: Moving = { x: [0.0279, -0.5157], y: 0.2621, w: 0.2694, h: 0.541 };
const PI_SKETCH: Moving = { x: [0.0881, -0.4556], y: 0.1501, w: 0.2627, h: 0.4381 };
const PI_PHONE: Moving = { x: [1.0113, 0.7367], y: 0.2621, w: 0.2266, h: 0.6522 };
const APP_UI: Moving = { x: [1.0936, 0.819], y: 0.327, w: 0.1116, h: 0.4299 };
const OSC_PI: Moving = { x: [0.44, -0.1037], y: 0.4789, w: 0.1025, h: 0.1398 };
const OSC_APP: Moving = { x: [0.4909, 0.4909], y: 0.4789, w: 0.1155, h: 0.1398 };

/** PowerPoint's morph takes its time; so does this one. */
const MORPH = { duration: 1.2, ease: [0.65, 0, 0.35, 1] as const };

const Mover = ({ track: { x, y, w, h }, phase, shown = [true, true], children }: {
    track: Moving;
    phase: 0 | 1;
    /** Whether the object is on the slide at all, on 20 and on 21. */
    shown?: [boolean, boolean];
    children: ReactNode;
}) => {
    const reduce = useReducedMotion();
    return (
        <motion.div
            initial={false}
            animate={{ left: `${x[phase] * 100}%`, opacity: shown[phase] ? 1 : 0 }}
            transition={reduce ? { duration: 0 } : MORPH}
            style={{ position: 'absolute', top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` }}
        >
            {children}
        </motion.div>
    );
};

/**
 * PowerPoint's right arrow, outlined in white: the shaft half the box high,
 * the head as long as half the box's shorter side. Drawn in its box's own
 * units of the 1920-wide frame, so the 1pt line is two of them.
 */
const OscArrow = ({ w, h }: { w: number; h: number }) => {
    const W = w * 1920;
    const H = h * 1080;
    const neck = W - Math.min(W, H) / 2;
    return (
        <>
            <svg aria-hidden viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full overflow-visible" fill="none" stroke="white" strokeWidth={2}>
                <path d={`M0 ${H / 4} H${neck} V0 L${W} ${H / 2} L${neck} ${H} V${(H * 3) / 4} H0 Z`} />
            </svg>
            {/* The label box sits 0.0071 in and 0.0362 down from the arrow's corner. */}
            <TextBox rect={[0.0071 / w, 0.0362 / h, 1, 0.0673 / h]} size={24} className="font-light text-lw-paper whitespace-nowrap">OSC</TextBox>
        </>
    );
};

export const PiApp = ({ phase = 0 }: { phase?: 0 | 1 }) => {
    const { t } = useTranslation();
    const reduce = useReducedMotion();
    return (
        <Stage>
            <Mover track={PI_PC} phase={phase}>
                <Still id="pi-pc" />
            </Mover>
            <Mover track={PI_KNOB} phase={phase}>
                <Still id="pi-knob" />
            </Mover>
            <Mover track={PI_BOARD} phase={phase}>
                <Still id="pi-board" />
            </Mover>
            <Hairlines rects={[FRAME]} />
            <Header
                chapter="prozess"
                topic={(
                    // The slide's name changes with the morph; the strip stays.
                    <span className="grid">
                        {(['pi', 'app'] as const).map((key, i) => (
                            <motion.span
                                key={key}
                                className="[grid-area:1/1]"
                                initial={false}
                                animate={{ opacity: phase === i ? 1 : 0 }}
                                transition={{ duration: reduce ? 0 : 0.6 }}
                            >
                                {t(`lautwasser.slides.${key}.topic`)}
                            </motion.span>
                        ))}
                    </span>
                )}
            />
            <Mover track={PI_SKETCH} phase={phase}>
                {/* The deck stretches the sketch a little wider than it was drawn. */}
                <Still id="pi-sketch" fit="fill" />
            </Mover>
            <Mover track={PI_PHONE} phase={phase}>
                <Still id="pi-phone" />
            </Mover>
            <Mover track={APP_UI} phase={phase}>
                <Clip id="app-ui" />
            </Mover>
            <Mover track={OSC_PI} phase={phase}>
                <OscArrow w={OSC_PI.w} h={OSC_PI.h} />
            </Mover>
            <Mover track={OSC_APP} phase={phase} shown={[false, true]}>
                <OscArrow w={OSC_APP.w} h={OSC_APP.h} />
            </Mover>
        </Stage>
    );
};

/* 22 - The stele ------------------------------------------------------------------ */

export const Stele = () => (
    <Stage>
        <Hairlines lines={[[0.6941, 0.0788, 0.6941, 0.9751], [0.3193, 0.0778, 0.3193, 0.9741]]} />
        <Place rect={[0.0255, 0.1142, 0.9521, 0.808]}>
            <Still id="stele-print" />
        </Place>
        <Hairlines rects={[FRAME]} />
        <Header topic="stele" chapter="prozess" />
    </Stage>
);

/* 23 - Logic ------------------------------------------------------------------------ */

const STATE_X = [0.1172, 0.3221, 0.5202, 0.7185];

export const Logik = () => {
    const { t } = useTranslation();
    const states = t('lautwasser.slides.logik.states', { returnObjects: true }) as string[];
    return (
        <Stage>
            <Hairlines lines={[[0.0143, 0.9741, 0.9858, 0.0778]]} />
            {STATES.map((clip, i) => (
                <Tile key={clip} rect={[STATE_X[i], 0.3637, 0.17, 0.3022]} clip={clip}>
                    {states[i]}
                </Tile>
            ))}
            <Hairlines rects={[FRAME]} />
            <Header topic="logik" chapter="prozess" />
        </Stage>
    );
};

/* 24 - Moodboard -------------------------------------------------------------------- */

/** A picture in the moodboard's 6pt black frame, the line centred on its edge as PowerPoint draws it. */
const Pinned = ({ id, rect }: { id: MediaId; rect: Rect }) => (
    <div style={at(rect)}>
        <div className="absolute inset-0 overflow-hidden">
            <Still id={id} />
        </div>
        <div aria-hidden className="absolute border-black" style={{ inset: `calc(${pt(3)} * -1)`, borderWidth: pt(6) }} />
    </div>
);

/** The palette's swatches down the right, labelled with the colours they show (see PALETTE). */
const SWATCH_AT: Rect[] = [
    [0.8858, 0.1442, 0.0993, 0.1765],
    [0.8854, 0.3348, 0.0993, 0.1765],
    [0.8854, 0.5253, 0.0993, 0.1765],
    [0.8854, 0.7154, 0.0993, 0.1765],
];

export const Moodboard = () => {
    const { t } = useTranslation();
    return (
        <Stage>
            <Hairlines rects={[LOW_FRAME]} lines={[[0.2682, 0.2189, 0.9847, 0.9725]]} />
            <Place rect={[0.015, 0.2228, 0.2536, 0.7511]}>
                <Still id="mood-sea" />
            </Place>
            <Hairlines lines={[[0.2682, 0.2218, 0.015, 0.974]]} />
            <Place rect={[0.4411, 0.1988, 0.2883, 0.3621]}>
                <Still id="mood-wave" />
            </Place>
            <Pinned id="mood-knobs" rect={[0.6719, 0.2903, 0.2072, 0.6548]} />
            <Place rect={[0.3493, 0.5903, 0.2685, 0.3847]}>
                <Still id="mood-poster" />
            </Place>
            {PALETTE.map((hex, i) => (
                <div
                    key={hex}
                    style={{ ...at(SWATCH_AT[i]), background: hex, fontSize: pt(8) }}
                    className={`flex items-center justify-center font-lw font-light ${hex === '#f3f3f3' ? 'text-lw-line' : 'text-lw-paper'}`}
                >
                    {hex}
                </div>
            ))}
            <Hairlines rects={[[0.6719, 0.2872, 0.2072, 0.6579]]} />
            <Header topic="moodboard" chapter="ausstellung" />
            <DisplayTitle rect={TITLE_AT} text={t('lautwasser.display.ausstellung')} />
            <Pinned id="mood-headphones" rect={[0.5072, 0.5315, 0.2104, 0.3741]} />
            <Pinned id="mood-turntable" rect={[0.2749, 0.3048, 0.1594, 0.5036]} />
            <Pinned id="mood-ripple" rect={[0.141, 0.3048, 0.1272, 0.4019]} />
            <Pinned id="mood-installation" rect={[0.3987, 0.215, 0.1326, 0.247]} />
            <Place rect={[0.0623, 0.6314, 0.1448, 0.2542]}>
                <Still id="mood-oscylator" />
            </Place>
            <Hairlines rects={[[0.8791, 0.1316, 0.1119, 0.8434]]} />
        </Stage>
    );
};

/* 25-27 - Build, room, installation ------------------------------------------------ */

export const Aufbau = () => (
    <FramedClip topic="aufbau" chapter="ausstellung" clip="build" rect={[0.0143, 0.0778, 0.9722, 0.8973]}>
        <Hairlines lines={[[0.0143, 0.5667, 0.9858, 0.5667], [0.3193, 0.0778, 0.3213, 0.9751], [0.6941, 0.0788, 0.6941, 0.9751]]} />
    </FramedClip>
);

export const Umsetzung = () => <FramedClip topic="umsetzung" chapter="ausstellung" clip="room" rect={[0.0147, 0.0778, 0.9649, 0.8947]} />;

export const Raum = () => {
    const { t } = useTranslation();
    return (
        <FramedClip topic="raum" chapter="ausstellung" clip="showcase" rect={[0.0143, 0.0778, 0.9715, 0.8947]}>
            <TextBox rect={CAPTION_AT} size={40} className="font-light uppercase text-lw-paper">
                {t('lautwasser.slides.raum.caption')}
            </TextBox>
        </FramedClip>
    );
};

/* 28 - Outlook ------------------------------------------------------------------ */

export const Weitere = () => {
    const { t } = useTranslation();
    return (
        <Stage>
            <Place rect={[0.6069, 0.6372, 0.3788, 0.3379]}>
                <Still id="outlook-rathaus" />
            </Place>
            <Place rect={[0.015, 0.6372, 0.5804, 0.3366]}>
                <Still id="outlook-mics" />
            </Place>
            <Place rect={[0.015, 0.2215, 0.9707, 0.3918]}>
                <Still id="outlook-projection" />
            </Place>
            <Hairlines rects={[[0.0143, 0.2183, 0.9715, 0.395], [0.0143, 0.6359, 0.5811, 0.3392], [0.6069, 0.6359, 0.3788, 0.3392]]} />
            <Header topic="weitere" chapter="fazit" />
            <DisplayTitle rect={TITLE_AT} text={t('lautwasser.display.ausblick')} />
            {/* Near-black on black in the deck; here it has to be read. */}
            <Label rect={[0.7937, 0.1654, 0.1988, 0.0314]} align="right" tone="paper">
                {t('lautwasser.slides.weitere.ai')}
            </Label>
        </Stage>
    );
};
