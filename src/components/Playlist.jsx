function handlePlaylistWheel(event) {
  const list = event.currentTarget;
  const maxScroll = list.scrollHeight - list.clientHeight;
  if (maxScroll <= 0) return;

  const lineHeight = Number.parseFloat(getComputedStyle(list).lineHeight) || 16;
  const delta = event.deltaMode === 1
    ? event.deltaY * lineHeight
    : event.deltaMode === 2
      ? event.deltaY * list.clientHeight
      : event.deltaY;

  event.preventDefault();
  event.stopPropagation();
  list.scrollTop = Math.max(0, Math.min(maxScroll, list.scrollTop + delta));
}

export function Playlist({ tracks, activeId, onSelect }) {
  return (
    <section className="panel playlist-panel" aria-label="Список модулей">
      <div className="panel-title">PLAYLIST</div>
      <ol onWheel={handlePlaylistWheel}>
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
