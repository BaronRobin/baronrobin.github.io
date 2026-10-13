import './strings';
import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BACHELOR_ID } from '../../data/projects';
import { useTheme } from '../../context/ThemeContext';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import CaseStudy from './CaseStudy';
import Presentation from './Presentation';

/**
 * The Bachelor thesis, 3D Grillz, in two views of its deck: the project page
 * (the index) and the presentation (/slides/<n>).
 *
 * The deck is white, so the page is white whatever the site theme: it forces
 * the light theme while it is open, which the nav and footer follow, and
 * lets go of it on the way out.
 */
const Bachelor = () => {
    const { t } = useTranslation();
    const { force } = useTheme();
    useDocumentTitle(t(`projects.${BACHELOR_ID}.title`));

    useEffect(() => {
        force('light');
        return () => force(null);
    }, [force]);

    return (
        <div className="[color-scheme:light]">
            <Routes>
                <Route index element={<CaseStudy />} />
                <Route path="slides/:n?" element={<Presentation />} />
            </Routes>
        </div>
    );
};

export default Bachelor;
