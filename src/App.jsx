import { useEffect, useMemo, useRef, useState } from 'react';
import { Mixer } from './components/Mixer';
import { MobileTabs } from './components/MobileTabs';
import { Playlist } from './components/Playlist';
import { Scope } from './components/Scope';
import { Tracker } from './components/Tracker';
import { Transport } from './components/Transport';
import { WorkbenchDesktop } from './components/WorkbenchDesktop';
import { WindowChrome } from './components/WindowChrome';
import { seedTracks } from './data/tracks';
import { formatTime } from './lib/trackerFormat';
import { useMobileViewportLock } from './lib/useMobileViewportLock';
import { useModPlayer } from './lib/useModPlayer';

const sizeStorageKey = 'mod-machine:window-size:v1';
// ABOUT and README start open only where the desktop has room for them.
const roomyDesktopQuery = '(min-width: 1101px) and (min-height: 780px)';

// Storage access throws when site data is blocked (privacy modes, embedded frames).
function getInitialSize() {
  try {
    const saved = window.localStorage.getItem(sizeStorageKey);
    return ['compact', 'normal', 'wide'].includes(saved) ? saved : 'normal';
  } catch {
    return 'normal';
  }
}

function getInitialPanels() {
  return new Set(window.matchMedia(roomyDesktopQuery).matches ? ['about', 'readme'] : []);
}

export default function App() {
  const inputRef = useRef(null);
  const [tracks, setTracks] = useState(seedTracks);
  const [activeTrack, setActiveTrack] = useState(seedTracks[0]);
  const [sizeMode, setSizeMode] = useState(getInitialSize);
  const [mobilePanel, setMobilePanel] = useState('tracker');
  const [openPanels, setOpenPanels] = useState(getInitialPanels);
  const player = useModPlayer();
  useMobileViewportLock();

  useEffect(() => {
    try {
      window.localStorage.setItem(sizeStorageKey, sizeMode);
    } catch {
      // The size choice just won't be remembered.
    }
  }, [sizeMode]);

  useEffect(() => {
    player.load(seedTracks[0].source, { autoplay: false });
    // Initial metadata preload; intentionally only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const duration = Number(player.meta?.duration ?? player.meta?.dur ?? 0);
  const channels = player.meta?.song?.channels ?? 4;
  const format = player.meta?.type_long || player.meta?.type || `Amiga MOD (${channels} ch)`;
  const artist = player.meta?.artist || activeTrack.author || 'Unknown';

  const activeIndex = tracks.findIndex((track) => track.id === activeTrack.id);
  const goToTrack = (offset) => {
    const index = (activeIndex + offset + tracks.length) % tracks.length;
    const next = tracks[index];
    setActiveTrack(next);
    player.load(next.source);
  };

  const selectTrack = (track) => {
    setActiveTrack(track);
    player.load(track.source);
  };

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const localTrack = {
      id: `${file.name}-${file.lastModified}`,
      label: file.name,
      source: file,
      local: true,
    };
    setTracks((current) => [...current.filter((track) => track.id !== localTrack.id), localTrack]);
    setActiveTrack(localTrack);
    player.load(file);
    event.target.value = '';
  };

  const sampleNames = useMemo(
    () => player.meta?.song?.samples?.filter(Boolean).slice(0, 4) ?? [],
    [player.meta],
  );

  const openPanel = (panel) => {
    if (panel === 'mods') {
      document.querySelector('.machine-window')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setOpenPanels((current) => {
      const next = new Set(current);
      if (next.has(panel)) next.delete(panel);
      else next.add(panel);
      return next;
    });
  };

  const closePanel = (panel) => {
    setOpenPanels((current) => {
      const next = new Set(current);
      next.delete(panel);
      return next;
    });
  };

  return (
    <WorkbenchDesktop
      openPanels={openPanels}
      onOpenPanel={openPanel}
      onClosePanel={closePanel}
    >
      <div className={`machine-window size-${sizeMode} mobile-panel-${mobilePanel}`}>
        <WindowChrome sizeMode={sizeMode} onSizeChange={setSizeMode} />

        <section className="metadata-strip">
          <div className="metadata-fields">
            <span className="field-label">SONG</span><strong>{String(activeIndex + 1).padStart(2, '0')} / {String(tracks.length).padStart(2, '0')} · {player.meta?.title || activeTrack.label}</strong>
            <span className="field-label">ARTIST</span><strong>{artist}</strong>
            <span className="field-label">FORMAT</span><strong>{format}</strong>
            <span className="field-label">LENGTH</span><strong>{duration ? formatTime(duration) : '—'}</strong>
          </div>
          <button className="bevel-button open-button" type="button" onClick={() => inputRef.current?.click()}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h7l2 2h9v11H3zm0-2h8l2 2h8v2h-9l-2-2H3z" /></svg>
            OPEN .MOD
          </button>
          <input ref={inputRef} type="file" accept=".mod,.xm,.s3m,.it,.mptm" onChange={handleFile} hidden />
        </section>

        <MobileTabs activeTab={mobilePanel} onChange={setMobilePanel} />

        <div className="workspace-grid">
          <Tracker
            meta={player.meta}
            patternIndex={player.position.pattern ?? 0}
            currentRow={player.position.row ?? 0}
            muted={player.muted}
          />
          <aside className="right-rail">
            <Scope analyser={player.analyser} playing={player.playing} muted={player.muted} channels={channels} />
            <Mixer channels={channels} muted={player.muted} levels={player.position.chVol} onToggleMute={player.toggleMute} />
            <Playlist tracks={tracks} activeId={activeTrack.id} onSelect={selectTrack} />
          </aside>
        </div>

        <Transport
          playing={player.playing}
          loading={player.loading}
          current={player.position.pos ?? 0}
          duration={duration}
          volume={player.volume}
          onPlay={player.togglePlayback}
          onPrevious={() => goToTrack(-1)}
          onNext={() => goToTrack(1)}
          onSeek={player.seek}
          onVolume={player.setVolume}
        />

        <footer className="status-bar">
          <p>Сэмплы + ноты + эффекты. Музыка собирается в реальном времени.</p>
          {activeTrack.sourcePage ? (
            <a href={activeTrack.sourcePage} target="_blank" rel="noreferrer">THE MOD ARCHIVE ↗</a>
          ) : null}
          <div className="status-details">
            <span>POS {String((player.position.order ?? 0) + 1).padStart(2, '0')} / {String(player.meta?.song?.totalOrders ?? 0).padStart(2, '0')}</span>
            <span>ROW {String(player.position.row ?? 0).padStart(2, '0')}</span>
            <span>BPM {player.position.bpm ?? 125}</span>
          </div>
        </footer>

        {sampleNames.length > 0 && <div className="sample-ticker" aria-label="Сэмплы модуля">{sampleNames.join(' · ')}</div>}
        {(player.loading || !player.ready) && !player.error && <div className="loading-line">LOADING MODULE…</div>}
        {player.error && <div className="error-line" role="alert">{player.error}</div>}
      </div>
    </WorkbenchDesktop>
  );
}
