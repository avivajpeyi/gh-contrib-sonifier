import {
  buildContributionGrid,
  sequenceContributionResponse,
  type ContributionResponse
} from "@github-contrib-sonifier/core";
import { ContributionPlayer } from "@github-contrib-sonifier/web-audio";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Heatmap } from "./components/Heatmap.js";
import { Transport } from "./components/Transport.js";
import { fetchContributionResponse } from "./lib/api.js";

const DEFAULT_USERNAME = "octocat";

export default function App() {
  const playerRef = useRef<ContributionPlayer | null>(null);
  const [username, setUsername] = useState(DEFAULT_USERNAME);
  const [submittedUsername, setSubmittedUsername] = useState(DEFAULT_USERNAME);
  const [contributions, setContributions] = useState<ContributionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tempo, setTempo] = useState(112);
  const [activeWeek, setActiveWeek] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mutedRows, setMutedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    const player = new ContributionPlayer({
      onStepChange: (step) => setActiveWeek(step)
    });
    playerRef.current = player;

    return () => {
      player.dispose();
    };
  }, []);

  useEffect(() => {
    playerRef.current?.setTempo(tempo);
  }, [tempo]);

  useEffect(() => {
    playerRef.current?.setMutedWeekdays(mutedRows);
  }, [mutedRows]);

  useEffect(() => {
    void load(DEFAULT_USERNAME);
  }, []);

  async function load(nextUsername: string) {
    setLoading(true);
    setError(null);
    setIsPlaying(false);
    playerRef.current?.stop();

    try {
      const response = await fetchContributionResponse(nextUsername);
      setContributions(response);
      setSubmittedUsername(response.username);
      playerRef.current?.load(sequenceContributionResponse(response));
      playerRef.current?.setTempo(tempo);
      playerRef.current?.setMutedWeekdays(mutedRows);
    } catch (loadError) {
      setContributions(null);
      setError(loadError instanceof Error ? loadError.message : "Unable to load contributions.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await load(username.trim());
  }

  async function handleTogglePlay() {
    const player = playerRef.current;
    if (!player || !contributions) {
      return;
    }

    if (player.isPlaying()) {
      player.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await player.play();
      setIsPlaying(true);
    } catch (playError) {
      setError(playError instanceof Error ? playError.message : "Audio playback failed.");
      setIsPlaying(false);
    }
  }

  function handleToggleRow(weekday: number) {
    setMutedRows((current) => {
      const next = new Set(current);
      if (next.has(weekday)) {
        next.delete(weekday);
      } else {
        next.add(weekday);
      }
      return next;
    });
  }

  const columns = contributions ? buildContributionGrid(contributions) : [];

  return (
    <main className="page">
      <section className="hero-card">
        <p className="eyebrow">GitHub Contrib Sonifier</p>
        <h1>Turn a contribution calendar into a playable weekly score.</h1>
        <p className="lede">
          Enter a public GitHub username, inspect the last 365 days as a 53-week heatmap, then hear each weekday map to
          its own voice.
        </p>
        <form className="lookup-form" onSubmit={handleSubmit}>
          <label>
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
          <button type="submit" disabled={loading || username.trim().length === 0}>
            {loading ? "Loading..." : "Load calendar"}
          </button>
        </form>
        <div className="meta-strip">
          <span>{submittedUsername ? `Showing @${submittedUsername}` : "No profile loaded"}</span>
          <span>{contributions ? `${contributions.totalContributions.toLocaleString("en-US")} contributions` : " "}</span>
        </div>
        <p className="notice">
          GitHub Pages can host this frontend, but live username lookup must go through a separate API because a GitHub
          token cannot be safely embedded in static client code.
        </p>
      </section>

      <section className="content-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>Heatmap</h2>
            <p>Weekly columns advance left to right. Playback highlights the currently playing week.</p>
          </div>
          {error ? <div className="status error">{error}</div> : null}
          {!error && contributions ? <Heatmap columns={columns} activeWeek={activeWeek} /> : null}
          {!error && !contributions && !loading ? <div className="status">Load a username to begin.</div> : null}
        </div>

        <div className="stack">
          <Transport
            disabled={!contributions}
            isPlaying={isPlaying}
            tempo={tempo}
            mutedRows={mutedRows}
            onTogglePlay={() => void handleTogglePlay()}
            onTempoChange={setTempo}
            onToggleRow={handleToggleRow}
          />
          <section className="panel details-card">
            <div className="panel-header">
              <h2>Mapping</h2>
            </div>
            <ul className="mapping-list">
              <li>Sunday drives kick drum hits.</li>
              <li>Monday becomes bass notes.</li>
              <li>Tuesday through Friday feed pad voices.</li>
              <li>Saturday layers hats with a lead tone.</li>
              <li>Contribution intensity controls velocity and brightness.</li>
            </ul>
          </section>
        </div>
      </section>
    </main>
  );
}
