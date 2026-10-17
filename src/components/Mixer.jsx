export function Mixer({ channels = 4, muted, levels = [], onToggleMute }) {
  const visibleChannels = Math.min(Math.max(4, channels), 8);
  return (
    <section className="panel mixer-panel" aria-label="Микшер каналов">
      <div className="panel-title">CHANNEL MIXER</div>
      <div className="mixer-channels">
        {Array.from({ length: visibleChannels }, (_, channel) => {
          const isMuted = muted.has(channel);
          const level = Math.max(levels[channel * 2] ?? 0, levels[channel * 2 + 1] ?? 0);
          return (
            <div className={`mixer-channel ${isMuted ? 'is-muted' : ''}`} key={channel}>
              <span>CH {String(channel + 1).padStart(2, '0')}</span>
              <div className="level-track" aria-hidden="true">
                <i style={{ height: `${Math.max(5, Math.min(100, level * 100))}%` }} />
              </div>
              <button
                type="button"
                className="bevel-button mute-button"
                aria-pressed={isMuted}
                onClick={() => onToggleMute(channel)}
              >
                {isMuted ? 'ON' : 'MUTE'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
