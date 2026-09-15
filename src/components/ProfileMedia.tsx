import { useState } from 'react';

/**
 * The About portrait, isolated so it can be swapped wholesale later. The plan
 * is to replace this <img> with a 4D gaussian splat viewer once the footage
 * exists. Nothing else in the app references the asset.
 *
 * When that swap happens, note the container this renders into:
 * `rounded-2xl overflow-hidden glass-card`, and `glass-card` carries
 * `backdrop-blur-lg`. A backdrop-filter ancestor around a WebGL canvas is a
 * known compositing/perf hazard in Safari, worth testing there specifically.
 *
 * The previous version handled load failure by assigning
 * `parentElement.innerHTML`, which rips out a React-managed subtree (and would
 * destroy a canvas's container). This uses the same failed-src state pattern as
 * PhotoFrame instead.
 */

const SRC = '/profile.webp?v=5';

const ProfileMedia = () => {
    const [failed, setFailed] = useState(false);

    if (failed) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600 text-sm">
                Robin Baron
            </div>
        );
    }

    return (
        <img
            src={SRC}
            alt="Robin Baron"
            className="w-full h-full object-cover"
            decoding="async"
            onError={() => setFailed(true)}
        />
    );
};

export default ProfileMedia;
