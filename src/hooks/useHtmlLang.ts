import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Keeps <html lang> in step with the active language.
 *
 * It was hardcoded `en` in index.html on a trilingual site, which misleads
 * screen readers about pronunciation and tells translation tooling the German
 * and Spanish copy is English.
 */
const useHtmlLang = () => {
    const { i18n } = useTranslation();
    useEffect(() => {
        document.documentElement.lang = i18n.language.split('-')[0];
    }, [i18n.language]);
};

export default useHtmlLang;
