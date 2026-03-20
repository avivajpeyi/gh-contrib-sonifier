import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { Heatmap } from "./components/Heatmap.js";
import { fetchContributionSummary } from "./lib/contributions.js";
import { getTone, type TonePolySynth, type ToneSequence } from "./lib/tone.js";
import type { ContributionDay } from "./types.js";

const DEFAULT_USERNAME = "octocat";
const MIN_FREQUENCY = 220;
const MAX_FREQUENCY = 1200;

function frequencyForContribution(count: number) {
  return Math.min(MAX_FREQUENCY, MIN_FREQUENCY + (count * 20));
}

export default function App() {
  const sequenceRef = useRef<ToneSequence<ContributionDay> | null>(null);
  const synthRef = useRef<TonePolySynth | null>(null);
  const [username, setUsername] = useState(DEFAULT_USERNAME);
  const [profileName, setProfileName] = useState(DEFAULT_USERNAME);
  const [contributionData, setContributionData] = useState<ContributionDay[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [totalContributions, setTotalContributions] = useState(0);

  const sortedContributionData = useMemo(
    () => [...contributionData].sort((left, right) => left.date.localeCompare(right.date)),
    [contributionData]
  );

  useEffect(() => {
    void handleLoad(DEFAULT_USERNAME);

    return () => {
      sequenceRef.current?.dispose();
      sequenceRef.current = null;
      synthRef.current?.dispose();
      synthRef.current = null;
      const tone = window.Tone;
      tone?.Transport.stop();
      tone?.Transport.cancel();
    };
  }, []);

  async function handleLoad(nextUsername: string) {
    setLoading(true);
    setError(null);
    setIsPlaying(false);
    setActiveDate(null);
    stopPlayback();

    try {
      const summary = await fetchContributionSummary(nextUsername);
      setProfileName(summary.username);
      setContributionData(summary.contributionData);
      setTotalContributions(summary.totalContributions);
    } catch (loadError) {
      setContributionData([]);
      setTotalContributions(0);
      setError(loadError instanceof Error ? loadError.message : "Unable to load contributions right now.");
    } finally {
      setLoading(false);
    }
  }

  function stopPlayback() {
    sequenceRef.current?.stop();
    sequenceRef.current?.dispose();
    sequenceRef.current = null;
    const tone = window.Tone;
    tone?.Transport.stop();
    tone?.Transport.cancel();
  }

  async function playSequence() {
    if (sortedContributionData.length === 0) {
      return;
    }

    const Tone = getTone();
    await Tone.start();

    if (!synthRef.current) {
      synthRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: {
          attack: 0.02,
          decay: 0.12,
          sustain: 0.2,
          release: 0.4
        }
      }).toDestination();
      synthRef.current.volume.value = -10;
    }

    stopPlayback();

    Tone.Transport.bpm.value = 132;

    const sequence = new Tone.Sequence(
      (time, day) => {
        setActiveDate(day.date);

        if (day.contributionCount <= 0) {
          return;
        }

        const frequency = frequencyForContribution(day.contributionCount);
        const velocity = Math.min(1, 0.18 + (day.contributionCount / 12));
        synthRef.current?.triggerAttackRelease(frequency, "8n", time, velocity);
      },
      sortedContributionData,
      "16n"
    );

    sequence.loop = false;
    sequence.start(0);
    sequenceRef.current = sequence;

    const loopDuration = Math.max(0.1, sortedContributionData.length * Tone.Time("16n").toSeconds());
    Tone.Transport.scheduleOnce(() => {
      setIsPlaying(false);
      setActiveDate(null);
      stopPlayback();
    }, `+${loopDuration}`);

    Tone.Transport.start();
    setIsPlaying(true);
  }

  async function handlePlayToggle() {
    if (isPlaying) {
      stopPlayback();
      setIsPlaying(false);
      setActiveDate(null);
      return;
    }

    try {
      await playSequence();
    } catch (playError) {
      setError(playError instanceof Error ? playError.message : "Audio playback could not start.");
      setIsPlaying(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await handleLoad(username);
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <p className="eyebrow">GitHub Contrib Sonifier</p>
        <h1>Hear a GitHub contribution graph as a Tone.js sequence.</h1>
        <p className="hero-copy">
          Load any public GitHub username through a public proxy, inspect the heatmap, then press play to sweep across
          each day and convert contribution counts into notes.
        </p>

        <form className="controls-row" onSubmit={handleSubmit}>
          <label className="input-group">
            <span>GitHub username</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.currentTarget.value)}
              placeholder="octocat"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>

          <button type="submit" className="primary-button" disabled={loading || username.trim().length === 0}>
            {loading ? "Loading..." : "Load"}
          </button>

          <button
            type="button"
            className="secondary-button"
            disabled={contributionData.length === 0}
            onClick={() => void handlePlayToggle()}
          >
            {isPlaying ? "Stop" : "Play"}
          </button>
        </form>

        <div className="summary-strip">
          <div>
            <span className="summary-label">Profile</span>
            <strong>@{profileName}</strong>
          </div>
          <div>
            <span className="summary-label">Days loaded</span>
            <strong>{contributionData.length.toLocaleString("en-US")}</strong>
          </div>
          <div>
            <span className="summary-label">Total contributions</span>
            <strong>{totalContributions.toLocaleString("en-US")}</strong>
          </div>
        </div>

        <p className="hint-card">
          Playback uses a user gesture to unlock the browser audio context, then maps each day&apos;s
          <code> contributionCount </code>
          to a note frequency.
        </p>
      </section>

      <section className="content-panel">
        <div className="section-heading">
          <div>
            <h2>Contribution heatmap</h2>
            <p>Squares are colored directly from the public proxy response and the active note is highlighted during playback.</p>
          </div>
          <div className="legend">
            <span><i className="legend-swatch level-none" />None</span>
            <span><i className="legend-swatch level-first_quartile" />Low</span>
            <span><i className="legend-swatch level-second_quartile" />Medium</span>
            <span><i className="legend-swatch level-third_quartile" />High</span>
            <span><i className="legend-swatch level-fourth_quartile" />Peak</span>
          </div>
        </div>

        {error ? <div className="status-card error">{error}</div> : null}
        {!error && contributionData.length > 0 ? (
          <Heatmap contributionData={contributionData} activeDate={activeDate} />
        ) : null}
        {!error && !loading && contributionData.length === 0 ? (
          <div className="status-card">Load a GitHub username to render the heatmap.</div>
        ) : null}
      </section>
    </main>
  );
}
