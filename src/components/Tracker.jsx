import { formatTrackerCell, hex } from '../lib/trackerFormat';

const ROW_RADIUS = 7;

function TrackerCell({ command, muted }) {
  const cell = formatTrackerCell(command);
  return (
    <span className={`tracker-cell ${muted ? 'is-muted' : ''}`}>
      <span className="cell-note">{cell.note}</span>
      <span className="cell-sample">{cell.sample}</span>
      <span className="cell-volume">{cell.volume}</span>
      <span className="cell-effect">{cell.effect}</span>
    </span>
  );
}

export function Tracker({ meta, patternIndex, currentRow, muted }) {
  const song = meta?.song;
  const pattern = song?.patterns?.[patternIndex] ?? [];
  const channelCount = Math.max(4, song?.channels ?? 4);
  const rowCount = pattern.length || 64;
  const rows = Array.from({ length: ROW_RADIUS * 2 + 1 }, (_, offset) => {
    const raw = currentRow - ROW_RADIUS + offset;
    return ((raw % rowCount) + rowCount) % rowCount;
  });

  return (
    <section className="panel tracker-panel" aria-label="Паттерн модуля">
      <div className="panel-title">PATTERN {hex(patternIndex)} · {rowCount} ROWS</div>
      <div className="tracker-scroll">
        <div className="tracker-table" style={{ '--channels': channelCount }}>
          <div className="tracker-head row-number">ROW</div>
          {Array.from({ length: channelCount }, (_, channel) => (
            <div className={`tracker-head ${muted.has(channel) ? 'is-muted' : ''}`} key={channel}>
              CH {String(channel + 1).padStart(2, '0')}
            </div>
          ))}

          {rows.map((row, offset) => (
            // Patterns shorter than the window repeat rows, so key by screen offset.
            <div className={`tracker-row ${offset === ROW_RADIUS ? 'is-current' : ''}`} key={offset}>
              <span className="row-label">{hex(row, 3)}</span>
              {Array.from({ length: channelCount }, (_, channel) => (
                <TrackerCell
                  command={pattern?.[row]?.[channel]}
                  muted={muted.has(channel)}
                  key={channel}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
