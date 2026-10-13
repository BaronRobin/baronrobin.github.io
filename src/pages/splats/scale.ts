/** How a ring is engraved: how far round each value sits (0 to 1), and back. */
export interface Scale {
    to: (value: number) => number;
    from: (travel: number) => number;
}

/**
 * A scale that gives the values near zero the room: how far round goes as
 * the `root`th root of how far a value is from zero.
 */
export const rooted = (min: number, max: number, root: number): Scale => {
    const far = Math.max(Math.abs(min), Math.abs(max));
    const bend = (value: number) => Math.sign(value) * Math.pow(Math.abs(value) / far, 1 / root);
    const low = bend(min), high = bend(max);
    return {
        to: (value) => (bend(value) - low) / (high - low),
        from: (travel) => {
            const bent = low + travel * (high - low);
            return Math.sign(bent) * Math.pow(Math.abs(bent), root) * far;
        },
    };
};
