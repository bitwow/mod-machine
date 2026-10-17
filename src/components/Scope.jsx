import { useEffect, useRef } from 'react';

export function Scope({ analyser, playing, muted, channels = 4 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    const data = new Uint8Array(analyser?.fftSize ?? 256);
    let frame = 0;

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const ratio = window.devicePixelRatio || 1;
      if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
      }

      context.fillStyle = '#03111c';
      context.fillRect(0, 0, width, height);
      context.strokeStyle = 'rgba(26, 99, 118, .35)';
      context.lineWidth = 1;
      for (let y = 16; y < height; y += 16) {
        context.beginPath();
        context.moveTo(0, y + 0.5);
        context.lineTo(width, y + 0.5);
        context.stroke();
      }

      if (analyser && playing) analyser.getByteTimeDomainData(data);
      else data.fill(128);

      const count = Math.max(1, Math.min(channels, 8));
      const panelWidth = width / count;
      for (let channel = 0; channel < count; channel += 1) {
        const left = channel * panelWidth;
        if (channel) {
          context.strokeStyle = '#12547d';
          context.beginPath();
          context.moveTo(left + 0.5, 0);
          context.lineTo(left + 0.5, height);
          context.stroke();
        }
        context.strokeStyle = muted.has(channel) ? '#4b5961' : channel % 2 ? '#ffb94e' : '#5bf1a4';
        context.lineWidth = 1.5;
        context.beginPath();
        const phase = channel * 17;
        for (let x = 0; x < panelWidth; x += 2) {
          const sample = data[(Math.floor((x / panelWidth) * data.length) + phase) % data.length];
          const y = height / 2 + ((sample - 128) / 128) * height * 0.36;
          if (x === 0) context.moveTo(left, y);
          else context.lineTo(left + x, y);
        }
        context.stroke();

        context.fillStyle = muted.has(channel) ? '#62717a' : '#bcd3e4';
        context.font = '10px IBM Plex Mono, monospace';
        context.textAlign = 'center';
        context.fillText(`CH ${String(channel + 1).padStart(2, '0')}`, left + panelWidth / 2, 14);
      }

      frame = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(frame);
  }, [analyser, playing, muted, channels]);

  return (
    <section className="panel scope-panel" aria-label="Осциллограф">
      <div className="panel-title">SCOPE · CH 01—{String(Math.min(channels, 8)).padStart(2, '0')}</div>
      <canvas ref={canvasRef} />
    </section>
  );
}
