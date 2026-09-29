/**
 * Derivative's glyph, the same file the Tools grid uses, as a component so it
 * can sit in a project's technicals row beside the react-icons marks. Dark on
 * transparent, hence the invert in dark mode.
 */
const TouchDesignerIcon = ({ className = '' }: { className?: string }) => (
    <img src="/touchdesigner.png" alt="" className={`${className} object-contain dark:invert`} />
);

export default TouchDesignerIcon;
