import { useTranslation } from 'react-i18next';
import { Deck } from '../../deck/Deck';
import type { DeckTheme } from '../../deck/types';
import { LAUTWASSER_ID } from '../../data/projects';
import { CHAPTERS } from './data';
import { preloadMedia } from './media';
import { SLIDES } from './order';
import { DisplayWord } from './parts';

/** The deck's black, its paper type and its blue, on the shared presenter. */
const THEME: DeckTheme = {
    root: 'bg-black text-lw-paper font-lw',
    stage: 'bg-black',
    link: 'text-lw-paper/70 hover:text-lw-paper',
    counter: 'text-lw-paper/80',
    button: 'hover:bg-white/10',
    accent: 'text-lw-ink',
    chapter: 'text-lw-paper/30',
    notes: 'text-lw-paper/80',
    faint: 'text-lw-paper/30',
    hint: 'text-lw-paper/40',
    bar: {
        current: 'bg-lw-blue',
        seen: 'bg-lw-paper/50 group-hover:bg-lw-paper/80',
        ahead: 'bg-lw-paper/15 group-hover:bg-lw-paper/40',
    },
};

/** The presentation, at /project/11-lautwasser/slides/<n>. */
const Presentation = () => {
    const { t } = useTranslation();
    return (
        <Deck
            ns="lautwasser"
            base={`/project/${LAUTWASSER_ID}`}
            slides={SLIDES}
            chapters={CHAPTERS}
            theme={THEME}
            preload={preloadMedia}
            brand={
                <span className="flex text-lw-ink" style={{ fontSize: '1.1rem' }}>
                    <DisplayWord text={t('lautwasser.display.lautwasser')} />
                </span>
            }
        />
    );
};

export default Presentation;
