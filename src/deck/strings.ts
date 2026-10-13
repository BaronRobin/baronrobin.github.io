import i18n from '../i18n';
import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';

/*
 * The presentation's own controls, shared by every deck (deck.*). They ride
 * in with the lazy chunk of whichever deck page loads first, like each
 * page's copy does, rather than sitting in the main bundle.
 */
for (const [lng, resources] of Object.entries({ en, de, es })) {
    i18n.addResourceBundle(lng, 'translation', resources, true, false);
}
