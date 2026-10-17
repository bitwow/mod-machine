const tabs = [
  { id: 'tracker', label: 'TRACKER' },
  { id: 'scope', label: 'SCOPE' },
  { id: 'mixer', label: 'MIXER' },
  { id: 'playlist', label: 'PLAYLIST' },
];

export function MobileTabs({ activeTab, onChange }) {
  return (
    <nav className="mobile-tabs" aria-label="Панели плеера">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={activeTab === tab.id ? 'is-active' : ''}
          aria-pressed={activeTab === tab.id}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
