import { useEffect, useRef, useState } from 'react';
import { OFF, ON } from './ui';

/**
 * How to move, behind a "?": the lines rise in one after the other, nearest
 * first, and go again on a second click, a click anywhere else or Esc. The
 * mark sits high on the right of the screen, so they open to its left.
 */
const Help = ({ label, lines }: { label: string; lines: string[] }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const away = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
        const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('pointerdown', away);
        window.addEventListener('keydown', escape);
        return () => {
            window.removeEventListener('pointerdown', away);
            window.removeEventListener('keydown', escape);
        };
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <ul
                id="splat-help"
                aria-hidden={!open}
                className={`absolute flex flex-col items-end gap-1.5 whitespace-nowrap font-mono text-[11px] tracking-widest uppercase right-full top-1 mr-5 ${ON} ${open ? '' : 'pointer-events-none'}`}
            >
                {lines.map((line, i) => (
                    <li
                        key={line}
                        className={`transition duration-300 ease-out motion-reduce:transition-none ${open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1.5'}`}
                        style={{ transitionDelay: open ? `${i * 50}ms` : '0ms' }}
                    >
                        {line}
                    </li>
                ))}
            </ul>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-controls="splat-help"
                aria-label={label}
                className={`font-display text-2xl/none transition-colors ${open ? ON : OFF}`}
            >
                ?
            </button>
        </div>
    );
};

export default Help;
