export function Playlist({ tracks, activeId, onSelect }) {
  return (
    <section className="panel playlist-panel" aria-label="Список модулей">
      <div className="panel-title">PLAYLIST</div>
      <ol>
        {tracks.map((track, index) => (
          <li key={track.id}>
            <button type="button" className={track.id === activeId ? 'is-active' : ''} onClick={() => onSelect(track)}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{track.label}</strong>
              <em>{track.local ? 'LOCAL' : 'MOD'}</em>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
