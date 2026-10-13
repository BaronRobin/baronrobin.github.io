import i18n from '../../i18n';
import '../../deck/strings';
import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';

/*
 * The page's copy rides in with its lazy chunk and is merged into the shared
 * `translation` namespace before first render, as Lautwasser's does.
 */
for (const [lng, resources] of Object.entries({ en, de, es })) {
    i18n.addResourceBundle(lng, 'translation', resources, true, false);
}
