import i18n from '../../i18n';
import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';

/*
 * Lautwasser's copy is a few hundred strings per language that only this page
 * reads. src/i18n.ts bundles every locale into the main chunk, so rather than
 * add them there, they ride in with this page's lazy chunk and are merged into
 * the same `translation` namespace the moment it loads, before first render.
 */
for (const [lng, resources] of Object.entries({ en, de, es })) {
    i18n.addResourceBundle(lng, 'translation', resources, true, false);
}
