import { useLayoutEffect, useRef } from 'react';
import { formatTrackerCell, hex } from '../lib/trackerFormat';

const ROW_RADIUS = 7;
const COMMANDS_PER_CELL = 6;

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

// The rows rotate around a fixed middle line, so the current row never moves on
// screen: centre it once per size change, or short screens never show it.
function useCenteredCurrentRow(scrollRef) {
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return undefined;

    const center = () => {
      const current = scroller.querySelector('.tracker-row.is-current > .row-label');
      if (!current) return;
      const headerHeight = scroller.querySelector('.tracker-head')?.offsetHeight ?? 0;
      const rowTop = current.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      scroller.scrollTop = rowTop + current.offsetHeight / 2 - headerHeight - (scroller.clientHeight - headerHeight) / 2;
    };

    center();
    const observer = new ResizeObserver(center);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [scrollRef]);
}

export function Tracker({ channels = 4, patterns, patternIndex, currentRow, muted }) {
  const scrollRef = useRef(null);
  useCenteredCurrentRow(scrollRef);

  // Packed by patterns.worker.js: rows × channels × 6 command bytes.
  const pattern = patterns?.[patternIndex];
  const channelCount = Math.max(4, channels);
  const rowCount = pattern?.rows || 64;
  const rows = Array.from({ length: ROW_RADIUS * 2 + 1 }, (_, offset) => {
    const raw = currentRow - ROW_RADIUS + offset;
    return ((raw % rowCount) + rowCount) % rowCount;
  });
  const commandAt = (row, channel) => {
    if (!pattern || channel >= channels) return undefined;
    const start = (row * channels + channel) * COMMANDS_PER_CELL;
    return pattern.data.subarray(start, start + COMMANDS_PER_CELL);
  };

  return (
    <section className="panel tracker-panel" aria-label="Паттерн модуля">
      <div className="panel-title">PATTERN {hex(patternIndex)} · {rowCount} ROWS</div>
      <div className="tracker-scroll" ref={scrollRef}>
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
                  command={commandAt(row, channel)}
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
