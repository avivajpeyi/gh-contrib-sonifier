export interface ToneSequence<T> {
  loop: boolean;
  start: (time?: number) => ToneSequence<T>;
  stop: () => ToneSequence<T>;
  dispose: () => void;
}

export interface TonePolySynth {
  volume: { value: number };
  toDestination: () => TonePolySynth;
  triggerAttackRelease: (frequency: number, duration: string, time: number, velocity: number) => void;
  dispose: () => void;
}

export interface ToneRuntime {
  Synth: unknown;
  PolySynth: new (voice: unknown, options?: Record<string, unknown>) => TonePolySynth;
  Sequence: new <T>(callback: (time: number, value: T) => void, events: T[], subdivision: string) => ToneSequence<T>;
  Time: (value: string) => { toSeconds: () => number };
  Transport: {
    bpm: { value: number };
    start: () => void;
    stop: () => void;
    cancel: () => void;
    scheduleOnce: (callback: () => void, time: string) => void;
  };
  start: () => Promise<void>;
}

declare global {
  interface Window {
    Tone?: ToneRuntime;
  }
}

export function getTone() {
  const tone = window.Tone;
  if (!tone) {
    throw new Error("Tone.js is still loading. Wait a moment and try again.");
  }

  return tone;
}
