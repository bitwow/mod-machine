import { formatTime } from '../lib/trackerFormat';

function TransportIcon({ type }) {
  if (type === 'pause') return <svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z" /></svg>;
  if (type === 'previous') return <svg viewBox="0 0 24 24"><path d="M6 5h3v14H6zm4 7 9-7v14z" /></svg>;
  if (type === 'next') return <svg viewBox="0 0 24 24"><path d="m5 5 9 7-9 7zm10 0h3v14h-3z" /></svg>;
  return <svg viewBox="0 0 24 24"><path d="m7 4 12 8-12 8z" /></svg>;
}

export function Transport({ playing, loading, current, duration, volume, onPlay, onPrevious, onNext, onSeek, onVolume }) {
  return (
    <section className="panel transport-panel" aria-label="Управление воспроизведением">
      <div className="panel-title">TRANSPORT</div>
      <div className="transport-body">
        <div className="transport-buttons">
          <button className="bevel-button icon-button" type="button" onClick={onPrevious} aria-label="Предыдущий трек"><TransportIcon type="previous" /></button>
          <button className="bevel-button icon-button primary-button" type="button" onClick={onPlay} aria-label={playing ? 'Пауза' : 'Воспроизвести'} disabled={loading}>
            <TransportIcon type={playing ? 'pause' : 'play'} />
          </button>
          <button className="bevel-button icon-button" type="button" onClick={onNext} aria-label="Следующий трек"><TransportIcon type="next" /></button>
        </div>
        <div className="seek-control">
          <span>{formatTime(current)}</span>
          <input type="range" min="0" max={Math.max(1, duration)} step="0.1" value={Math.min(current, duration || 1)} onChange={(event) => onSeek(event.target.value)} />
          <span>{formatTime(duration)}</span>
        </div>
        <label className="volume-control">
          <span>VOLUME</span>
          <input type="range" min="0" max="100" value={volume} onChange={(event) => onVolume(event.target.value)} />
        </label>
      </div>
    </section>
  );
}
