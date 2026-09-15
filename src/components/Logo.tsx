import { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * The `rb.` wordmark.
 *
 * Hovering widens it: "obin" and "aron" grow out from between the initials, so
 * `rb.` becomes `robin baron.` The r and b never move or change case; the name
 * is revealed around them rather than swapped in, which is why the mark is
 * lowercase and set at a single weight throughout.
 */

interface LogoProps {
    /**
     * `onHero` is the state over Home's transparent nav, where the hero video
     * plays behind and the mark needs to stay white regardless of theme.
     */
    variant?: 'solid' | 'onHero';
    className?: string;
}

/**
 * A slice of the name that widens out of nothing on hover, pushing whatever
 * follows it to the right. Width animates to `auto` rather than a hardcoded
 * value so it stays correct if the copy or font ever changes.
 */
const Reveal = ({ show, still, children }: { show: boolean; still: boolean; children: React.ReactNode }) => (
    <motion.span
        initial={false}
        animate={{ width: show ? 'auto' : 0, opacity: show ? 1 : 0 }}
        transition={still ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="inline-block overflow-hidden whitespace-nowrap"
    >
        {children}
    </motion.span>
);

const Logo = ({ variant = 'solid', className = '' }: LogoProps) => {
    const [hovered, setHovered] = useState(false);

    const still = typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // Over the hero every other nav item sits in a translucent pill; a bare mark
    // there reads as orphaned. Once scrolled the links drop their pills, so the
    // mark drops its own too, matching whatever its siblings are doing.
    // The pill's padding also lands the mark's ink at the same inset as the
    // flag cluster's, which bare text at the container edge did not.
    const skin = variant === 'onHero'
        ? 'text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full'
        : 'text-slate-900 dark:text-white';

    return (
        <span
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={`inline-flex items-center h-10 select-none font-display text-3xl/none sm:text-4xl/none tracking-tight transition-all duration-300 ${skin} ${className}`}
        >
            <span className="shrink-0">r</span>
            <Reveal show={hovered} still={still}>obin&nbsp;</Reveal>
            <span className="shrink-0">b</span>
            <Reveal show={hovered} still={still}>aron</Reveal>
            <span className="shrink-0">.</span>
        </span>
    );
};

export default Logo;
