import { useRef } from 'react';
import { keyIndexAt, toFrame, TRACK_IDS, TRACK_LABELS, type KeyRef, type Shot, type TrackId } from './shot';

/**
 * The creation tool's timeline: transport, a ruler with a playhead, and a row
 * of keyframe diamonds per track. Click or drag anywhere on the ruler or a
 * lane to scrub; drag a diamond to move its key, click it to select it,
 * Shift-click to add it to the selection or take it out.
 */

export type Selection = KeyRef;

interface Props {
    shot: Shot;
    time: number;
    playing: boolean;
    loop: boolean;
    selected: Selection[];
    /** The camera was moved since it was last keyed or scrubbed. */
    unkeyedCamera: boolean;
    onTime: (t: number) => void;
    onPlay: () => void;
    onLoop: () => void;
    onStep: (frames: number) => void;
    onSelect: (selection: Selection[]) => void;
    /** Move a key; answers where it now sits among the track's keys. */
    onMove: (track: TrackId, index: number, t: number) => number;
    onToggleKey: (track: TrackId) => void;
}

const LABEL_W = 132;
const ROW_H = 22;

const Timeline = ({ shot, time, playing, loop, selected, unkeyedCamera, onTime, onPlay, onLoop, onStep, onSelect, onMove, onToggleKey }: Props) => {
    const laneRef = useRef<HTMLDivElement>(null);
    const fps = shot.output.fps;
    const frames = Math.round(shot.duration * fps);

    /** Time under the pointer, on a frame, within the shot. */
    const timeAt = (clientX: number) => {
        const box = laneRef.current!.getBoundingClientRect();
        const t = ((clientX - box.left) / box.width) * shot.duration;
        return Math.min(shot.duration, Math.max(0, toFrame(t, fps)));
    };

    const scrub = (e: React.PointerEvent) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        onSelect([]);
        onTime(timeAt(e.clientX));
    };

    const isSelected = (track: TrackId, index: number) => selected.some((s) => s.track === track && s.index === index);

    const dragKey = (track: TrackId, index: number) => (e: React.PointerEvent) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        if (e.shiftKey) {
            onSelect(isSelected(track, index) ? selected.filter((s) => s.track !== track || s.index !== index) : [...selected, { track, index }]);
            return;
        }
        e.currentTarget.setPointerCapture(e.pointerId);
        onSelect([{ track, index }]);
        const startX = e.clientX;
        let current = index;
        const move = (ev: PointerEvent) => {
            if (Math.abs(ev.clientX - startX) < 3) return;
            current = onMove(track, current, timeAt(ev.clientX));
        };
        const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    };

    const x = (t: number) => `${(t / shot.duration) * 100}%`;
    const seconds = Array.from({ length: Math.floor(shot.duration) + 1 }, (_, s) => s);
    const frame = Math.round(time * fps);

    return (
        <div className="h-full flex flex-col text-white select-none">
            {/* Transport */}
            <div className="h-9 shrink-0 flex items-center gap-1 px-3 border-b border-white/10 font-mono text-xs">
                <Btn title="Start" onClick={() => onTime(0)}>⏮</Btn>
                <Btn title="Frame back (←)" onClick={() => onStep(-1)}>◀︎</Btn>
                <Btn title="Play / pause (Space)" onClick={onPlay} wide>{playing ? '❚❚' : '▶︎'}</Btn>
                <Btn title="Frame forward (→)" onClick={() => onStep(1)}>▶︎</Btn>
                <Btn title="End" onClick={() => onTime(shot.duration)}>⏭</Btn>
                <Btn title="Loop" onClick={onLoop} active={loop}>⟲</Btn>
                <span className="ml-3 text-slate-300 tabular-nums">{time.toFixed(2)} s</span>
                <span className="ml-2 text-slate-500 tabular-nums">frame {frame} / {frames}</span>
                <span className="ml-auto text-slate-500">I key camera · ⇧-click select more · ⌘C ⌘V copy, paste · Del delete · ⌘S save</span>
            </div>

            <div className="flex-1 flex min-h-0">
                {/* Labels */}
                <div className="shrink-0 border-r border-white/10" style={{ width: LABEL_W }}>
                    <div className="h-6 border-b border-white/10" />
                    {TRACK_IDS.map((id) => {
                        const keyed = keyIndexAt(shot.tracks[id], time, fps) >= 0;
                        return (
                            <div key={id} className="flex items-center gap-2 px-3 text-[11px] text-slate-300" style={{ height: ROW_H }}>
                                <button
                                    type="button"
                                    title={keyed ? 'Remove the key here' : 'Set a key here'}
                                    onClick={() => onToggleKey(id)}
                                    className={`w-3 h-3 rotate-45 border ${keyed ? 'bg-amber-300 border-amber-300' : 'border-slate-500 hover:border-white'}`}
                                />
                                <span className="truncate">{TRACK_LABELS[id]}</span>
                                {id === 'camera' && unkeyedCamera && shot.tracks.camera.length > 0 && (
                                    <span className="text-amber-300" title="The camera has moved since its last key">●</span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Ruler and lanes */}
                <div ref={laneRef} className="relative flex-1 mx-3" onPointerDown={scrub} onPointerMove={(e) => { if (e.buttons === 1 && e.currentTarget.hasPointerCapture(e.pointerId)) onTime(timeAt(e.clientX)); }}>
                    <div className="h-6 relative border-b border-white/10">
                        {seconds.map((s) => (
                            <div key={s} className="absolute top-0 h-full" style={{ left: x(s) }}>
                                <div className="w-px h-2 bg-white/30" />
                                <span className="absolute top-2 -translate-x-1/2 font-mono text-[10px] text-slate-500">{s}s</span>
                            </div>
                        ))}
                    </div>
                    {TRACK_IDS.map((id) => (
                        <div key={id} className="relative border-b border-white/5" style={{ height: ROW_H }}>
                            {shot.tracks[id].map((key, index) => {
                                const picked = isSelected(id, index);
                                return (
                                    <button
                                        key={`${index}-${key.t}`}
                                        type="button"
                                        onPointerDown={dragKey(id, index)}
                                        title={`${TRACK_LABELS[id]} · ${key.t.toFixed(2)} s · ${key.interp}`}
                                        className={`absolute top-1/2 w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border ${picked
                                            ? 'bg-white border-white ring-2 ring-amber-300'
                                            : key.interp === 'hold' ? 'bg-slate-500 border-slate-300' : 'bg-amber-300 border-amber-200'}`}
                                        style={{ left: x(key.t) }}
                                    />
                                );
                            })}
                        </div>
                    ))}
                    {/* Playhead */}
                    <div className="absolute top-0 bottom-0 w-px bg-amber-300 pointer-events-none" style={{ left: x(time) }}>
                        <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-amber-300" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const Btn = ({ children, onClick, title, active, wide }: { children: React.ReactNode; onClick: () => void; title: string; active?: boolean; wide?: boolean }) => (
    <button
        type="button"
        title={title}
        onClick={onClick}
        className={`h-6 ${wide ? 'w-10' : 'w-7'} rounded border text-[11px] ${active ? 'bg-white text-black border-white' : 'border-white/15 hover:bg-white/10'}`}
    >
        {children}
    </button>
);

export default Timeline;
