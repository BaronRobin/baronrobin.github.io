import './strings';
import { Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LAUTWASSER_ID } from '../../data/projects';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import CaseStudy from './CaseStudy';
import Deck from './Deck';

/**
 * Lautwasser's own page, in two views of one deck: the project page (the
 * index) and the presentation (/slides/<n>).
 *
 * The deck is black, so the page is dark whatever the site theme: the `dark`
 * class here switches the shared nav and footer to their dark styles for this
 * subtree only.
 */
const Lautwasser = () => {
    const { t } = useTranslation();
    useDocumentTitle(t(`projects.${LAUTWASSER_ID}.title`));

    return (
        <div className="dark [color-scheme:dark]">
            <Routes>
                <Route index element={<CaseStudy />} />
                <Route path="slides/:n?" element={<Deck />} />
            </Routes>
        </div>
    );
};

export default Lautwasser;
