import { DEFAULT_TRACKS } from "@github-contrib-sonifier/core";

interface TransportProps {
  disabled: boolean;
  isPlaying: boolean;
  tempo: number;
  mutedRows: Set<number>;
  onTogglePlay: () => void;
  onTempoChange: (tempo: number) => void;
  onToggleRow: (weekday: number) => void;
}

export function Transport({
  disabled,
  isPlaying,
  tempo,
  mutedRows,
  onTogglePlay,
  onTempoChange,
  onToggleRow
}: TransportProps) {
  return (
    <section className="transport-card">
      <div className="transport-topline">
        <button className="play-button" type="button" disabled={disabled} onClick={onTogglePlay}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <label className="tempo-control">
          <span>Tempo</span>
          <input
            type="range"
            min="50"
            max="180"
            step="1"
            value={tempo}
            onChange={(event) => onTempoChange(Number(event.currentTarget.value))}
          />
          <strong>{tempo} BPM</strong>
        </label>
      </div>
      <div className="track-grid">
        {DEFAULT_TRACKS.map((track) => {
          const muted = mutedRows.has(track.weekday);
          return (
            <button
              key={track.weekday}
              type="button"
              className={`track-toggle${muted ? " is-muted" : ""}`}
              aria-pressed={!muted}
              onClick={() => onToggleRow(track.weekday)}
            >
              <span>{track.label}</span>
              <small>
                {track.weekday === 0
                  ? "drum"
                  : track.weekday === 1
                    ? "bass"
                    : track.weekday === 6
                      ? "hats / lead"
                      : "pad"}
              </small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

