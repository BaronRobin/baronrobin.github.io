import { useEffect, useRef, useState } from 'react';
import { OFF, ON } from './ui';

/**
 * The scan's numbers, behind an "i" low on the right: like Help, the lines
 * rise in one after the other, nearest first, and go again on a second click,
 * a click anywhere else or Esc. They open upwards, right-aligned over the mark.
 */
const Info = ({ label, lines }: { label: string; lines: string[] }) => {
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
                id="splat-info"
                aria-hidden={!open}
                className={`absolute bottom-full right-0 mb-3 flex flex-col items-end gap-1.5 whitespace-nowrap font-mono text-[11px] tracking-widest uppercase ${ON} ${open ? '' : 'pointer-events-none'}`}
            >
                {lines.map((line, i) => (
                    <li
                        key={line}
                        className={`transition duration-300 ease-out motion-reduce:transition-none ${open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1.5'}`}
                        style={{ transitionDelay: open ? `${(lines.length - 1 - i) * 50}ms` : '0ms' }}
                    >
                        {line}
                    </li>
                ))}
            </ul>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-controls="splat-info"
                aria-label={label}
                className={`font-display text-2xl/none transition-colors ${open ? ON : OFF}`}
            >
                i
            </button>
        </div>
    );
};

export default Info;
