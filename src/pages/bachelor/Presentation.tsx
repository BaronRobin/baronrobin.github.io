import { useTranslation } from 'react-i18next';
import { Deck } from '../../deck/Deck';
import type { DeckTheme } from '../../deck/types';
import { BACHELOR_ID } from '../../data/projects';
import { preloadMedia } from './deck';
import { CHAPTERS, SLIDES } from './order';

/** The deck's white, black type and its one red, on the shared presenter. */
const THEME: DeckTheme = {
    root: 'bg-white text-black font-grillz',
    // White on white: a hairline says where the slide ends.
    stage: 'bg-white ring-1 ring-black/10',
    link: 'text-black/60 hover:text-black',
    counter: 'text-black/70',
    button: 'hover:bg-black/5',
    accent: 'text-grillz-red',
    chapter: 'text-black/30',
    notes: 'text-black/75',
    faint: 'text-black/30',
    hint: 'text-black/40',
    bar: {
        current: 'bg-grillz-red',
        seen: 'bg-black/45 group-hover:bg-black/75',
        ahead: 'bg-black/10 group-hover:bg-black/30',
    },
};

/** The presentation, at /project/00-bachelor/slides/<n>. None of its clips has sound. */
const Presentation = () => {
    const { t } = useTranslation();
    return (
        <Deck
            ns="bachelor"
            base={`/project/${BACHELOR_ID}`}
            slides={SLIDES}
            chapters={CHAPTERS}
            theme={THEME}
            preload={preloadMedia}
            sound={false}
            brand={<span className="normal-case tracking-normal text-sm">{t(`projects.${BACHELOR_ID}.title`)}</span>}
        />
    );
};

export default Presentation;
