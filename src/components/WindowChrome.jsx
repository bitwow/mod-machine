const sizes = ['compact', 'normal', 'wide'];

export function WindowChrome({ sizeMode, onSizeChange }) {
  return (
    <header className="window-titlebar">
      <span className="window-grip" aria-hidden="true">⠿</span>
      <h1>MOD / MACHINE</h1>
      <div className="window-size-switch" aria-label="Размер окна">
        {sizes.map((size) => (
          <button
            key={size}
            type="button"
            className={sizeMode === size ? 'is-active' : ''}
            onClick={() => onSizeChange(size)}
            aria-pressed={sizeMode === size}
          >
            {size.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="window-actions" aria-hidden="true">
        <span>—</span><span>□</span><span>×</span>
      </div>
    </header>
  );
}
