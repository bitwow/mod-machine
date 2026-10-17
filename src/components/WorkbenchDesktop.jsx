import { useEffect, useState } from 'react';

const desktopItems = [
  { id: 'mods', label: 'MODS', icon: 'disk' },
  { id: 'readme', label: 'README', icon: 'document' },
  { id: 'about', label: 'ABOUT', icon: 'document' },
  { id: 'ram', label: 'RAM DISK', icon: 'disk' },
];

function DesktopIcon({ item, active, onOpen }) {
  return (
    <button
      className={`desktop-icon ${active ? 'is-active' : ''}`}
      type="button"
      onClick={() => onOpen(item.id)}
      aria-pressed={active}
    >
      <span className={`desktop-icon-art ${item.icon}`} aria-hidden="true">
        <i />
      </span>
      <span>{item.label}</span>
    </button>
  );
}

function InfoWindow({ id, title, children, onClose }) {
  return (
    <section className={`desktop-info-window desktop-info-${id}`} aria-label={title}>
      <header>
        <span aria-hidden="true">≡</span>
        <strong>{title}</strong>
        <button type="button" onClick={() => onClose(id)} aria-label={`Закрыть ${title}`}>×</button>
      </header>
      <div className="desktop-info-content">{children}</div>
    </section>
  );
}

export function WorkbenchDesktop({ children, openPanels, onOpenPanel, onClosePanel }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const time = new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);

  return (
    <main className="workbench-desktop">
      <header className="workbench-bar">
        <span className="workbench-menu" aria-hidden="true">◆</span>
        <strong>Workbench 1.3</strong>
        <span className="workbench-memory">2048K CHIP&nbsp;&nbsp; 4096K FAST</span>
        <time>{time}</time>
        <span className="workbench-depth" aria-hidden="true">◩</span>
      </header>

      <nav className="desktop-icons" aria-label="Рабочий стол">
        {desktopItems.map((item) => (
          <DesktopIcon
            key={item.id}
            item={item}
            active={openPanels.has(item.id)}
            onOpen={onOpenPanel}
          />
        ))}
      </nav>

      <div className="desktop-stage">{children}</div>

      {openPanels.has('about') ? (
        <InfoWindow id="about" title="ABOUT" onClose={onClosePanel}>
          <strong>MOD / MACHINE v1.0</strong>
          <p>Amiga-inspired module player for the browser.</p>
          <small>Built for music and good old machines.</small>
        </InfoWindow>
      ) : null}

      {openPanels.has('readme') ? (
        <InfoWindow id="readme" title="README" onClose={onClosePanel}>
          <dl>
            <div><dt>FILE TYPE</dt><dd>MOD</dd></div>
            <div><dt>CHANNELS</dt><dd>4</dd></div>
            <div><dt>FORMAT</dt><dd>PROTRACKER</dd></div>
          </dl>
          <p>Choose a module or open your own local file.</p>
        </InfoWindow>
      ) : null}

      {openPanels.has('ram') ? (
        <InfoWindow id="ram" title="RAM DISK" onClose={onClosePanel}>
          <strong>MOD MACHINE:</strong>
          <p>9 remote modules<br />AudioWorklet engine<br />No files uploaded</p>
        </InfoWindow>
      ) : null}

      <footer className="workbench-status">
        <span className="status-disk" aria-hidden="true">▣</span>
        <strong>MOD / MACHINE READY</strong>
        <span className="status-message">Выберите модуль или откройте свой файл</span>
        <span>3.7 MB FREE</span>
        <span className="trash-icon" aria-hidden="true">▥</span>
      </footer>
    </main>
  );
}
