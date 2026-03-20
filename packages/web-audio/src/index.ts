import type { SequenceEvent, SequencedContributionCalendar } from "@github-contrib-sonifier/core";

export interface ContributionPlayerOptions {
  onStepChange?: (step: number | null) => void;
}

export class ContributionPlayer {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private timerId: number | null = null;
  private step = -1;
  private bpm = 112;
  private mutedWeekdays = new Set<number>();
  private sequence: SequencedContributionCalendar | null = null;
  private readonly onStepChange: ((step: number | null) => void) | undefined;

  constructor(options: ContributionPlayerOptions = {}) {
    this.onStepChange = options.onStepChange;
  }

  load(sequence: SequencedContributionCalendar) {
    this.sequence = sequence;
    this.stop();
  }

  setTempo(bpm: number) {
    this.bpm = Number.isFinite(bpm) ? Math.max(50, Math.min(200, Math.round(bpm))) : 112;
    if (this.timerId !== null) {
      this.restartLoop();
    }
  }

  setMutedWeekdays(weekdays: Iterable<number>) {
    this.mutedWeekdays = new Set(weekdays);
  }

  isPlaying() {
    return this.timerId !== null;
  }

  async play() {
    if (!this.sequence) {
      return;
    }

    this.ensureAudioGraph();
    await this.audioContext!.resume();

    if (this.timerId !== null) {
      return;
    }

    this.tick();
    this.restartLoop();
  }

  pause() {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  stop() {
    this.pause();
    this.step = -1;
    this.onStepChange?.(null);
  }

  dispose() {
    this.stop();
    if (this.audioContext) {
      void this.audioContext.close();
    }
    this.audioContext = null;
    this.masterGain = null;
    this.noiseBuffer = null;
  }

  private restartLoop() {
    this.pause();
    const intervalMs = Math.max(120, (60 / this.bpm) * 1000);
    this.timerId = window.setInterval(() => this.tick(), intervalMs);
  }

  private tick() {
    if (!this.sequence || !this.audioContext || !this.masterGain) {
      return;
    }

    this.step = (this.step + 1) % this.sequence.totalSteps;
    this.onStepChange?.(this.step);

    const now = this.audioContext.currentTime;
    const events = this.sequence.events.filter((event: SequenceEvent) => event.startStep === this.step);
    events.forEach((event: SequenceEvent) => {
      if (this.mutedWeekdays.has(event.weekday)) {
        return;
      }
      this.trigger(event, now);
    });
  }

  private ensureAudioGraph() {
    if (this.audioContext) {
      return;
    }

    const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) {
      throw new Error("Web Audio is not supported in this browser.");
    }

    this.audioContext = new AudioCtor();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.42;

    const compressor = this.audioContext.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 10;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.22;

    this.masterGain.connect(compressor);
    compressor.connect(this.audioContext.destination);
    this.noiseBuffer = this.createNoiseBuffer(this.audioContext);
  }

  private createNoiseBuffer(context: AudioContext): AudioBuffer {
    const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = (Math.random() * 2) - 1;
    }
    return buffer;
  }

  private trigger(event: SequenceEvent, time: number) {
    switch (event.voice) {
      case "kick":
        this.playKick(time, event.velocity);
        return;
      case "bass":
        this.playBass(time, event.frequencyHz ?? 55, event.velocity);
        return;
      case "pad":
        this.playPad(time, event.frequencyHz ?? 110, event.velocity);
        return;
      case "lead":
        this.playLead(time, event.frequencyHz ?? 220, event.velocity);
        return;
      case "hat":
        this.playHat(time, event.velocity);
        return;
      default:
        return;
    }
  }

  private playKick(time: number, velocity: number) {
    const oscillator = this.audioContext!.createOscillator();
    const gain = this.audioContext!.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(132, time);
    oscillator.frequency.exponentialRampToValueAtTime(42, time + 0.18);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(0.9 * velocity, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    oscillator.connect(gain);
    gain.connect(this.masterGain!);
    oscillator.start(time);
    oscillator.stop(time + 0.2);
  }

  private playBass(time: number, frequency: number, velocity: number) {
    const oscillator = this.audioContext!.createOscillator();
    const filter = this.audioContext!.createBiquadFilter();
    const gain = this.audioContext!.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, time);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(320, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.24 * velocity, time + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.42);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    oscillator.start(time);
    oscillator.stop(time + 0.44);
  }

  private playPad(time: number, frequency: number, velocity: number) {
    const oscillatorA = this.audioContext!.createOscillator();
    const oscillatorB = this.audioContext!.createOscillator();
    const filter = this.audioContext!.createBiquadFilter();
    const gain = this.audioContext!.createGain();

    oscillatorA.type = "sine";
    oscillatorB.type = "sawtooth";
    oscillatorA.frequency.setValueAtTime(frequency, time);
    oscillatorB.frequency.setValueAtTime(frequency * 1.004, time);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1100 + velocity * 600, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.12 * velocity, time + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.7);

    oscillatorA.connect(filter);
    oscillatorB.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    oscillatorA.start(time);
    oscillatorB.start(time);
    oscillatorA.stop(time + 0.72);
    oscillatorB.stop(time + 0.72);
  }

  private playLead(time: number, frequency: number, velocity: number) {
    const oscillator = this.audioContext!.createOscillator();
    const gain = this.audioContext!.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(frequency, time);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.14 * velocity, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    oscillator.connect(gain);
    gain.connect(this.masterGain!);
    oscillator.start(time);
    oscillator.stop(time + 0.24);
  }

  private playHat(time: number, velocity: number) {
    const source = this.audioContext!.createBufferSource();
    const filter = this.audioContext!.createBiquadFilter();
    const gain = this.audioContext!.createGain();

    source.buffer = this.noiseBuffer!;
    filter.type = "highpass";
    filter.frequency.setValueAtTime(6500, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(0.1 * velocity, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    source.start(time);
    source.stop(time + 0.08);
  }
}
