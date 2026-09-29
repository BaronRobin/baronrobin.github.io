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

    // Bare type in every state, like the words beside it: only the colour
    // changes, so nothing about the mark moves when the nav does. Over the
    // hero it goes white, with the same soft shadow as the links.
    const skin = variant === 'onHero'
        ? 'text-white [text-shadow:0_1px_10px_rgb(0_0_0/0.35)]'
        : 'text-slate-900 dark:text-white';

    return (
        <span
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={`inline-flex items-center h-10 select-none font-display text-3xl/none sm:text-4xl/none tracking-tight transition-colors duration-300 ${skin} ${className}`}
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
