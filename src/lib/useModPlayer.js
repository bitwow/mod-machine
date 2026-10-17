import { useCallback, useEffect, useRef, useState } from 'react';

const initialPosition = { pos: 0, order: 0, pattern: 0, row: 0, bpm: 125, chVol: [] };

export function useModPlayer() {
  const playerRef = useRef(null);
  const initializedRef = useRef(false);
  const queuedLoadRef = useRef(null);
  const autoplayRef = useRef(false);
  const lastUiUpdateRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [meta, setMeta] = useState(null);
  const [position, setPosition] = useState(initialPosition);
  const [muted, setMuted] = useState(() => new Set());
  const [volume, setVolumeState] = useState(72);
  const [analyser, setAnalyser] = useState(null);
  const [error, setError] = useState('');

  const ensurePlayer = useCallback(async ({ resume = false } = {}) => {
    if (!playerRef.current) {
      if (!window.ChiptuneJsPlayer) {
        await new Promise((resolve) => window.addEventListener('mod-engine-ready', resolve, { once: true }));
      }
      const { ChiptuneJsPlayer } = window;
      const player = new ChiptuneJsPlayer({
        repeatCount: 0,
        stereoSeparation: 180,
        amigaResampler: 'a500',
      });
      playerRef.current = player;
      player.setVol(volume);

      player.onInitialized(() => {
        initializedRef.current = true;
        const scope = player.context.createAnalyser();
        scope.fftSize = 256;
        scope.smoothingTimeConstant = 0.72;
        player.gain.connect(scope);
        setAnalyser(scope);
        setReady(true);

        if (queuedLoadRef.current) {
          player.load(queuedLoadRef.current);
          queuedLoadRef.current = null;
        }
      });

      player.onMetadata((nextMeta) => {
        setMeta(nextMeta);
        setLoading(false);
        setMuted(new Set());
        setPosition({
          ...initialPosition,
          pattern: nextMeta?.song?.orders?.[0] ?? 0,
          bpm: nextMeta?.song?.bpm ?? 125,
        });

        if (autoplayRef.current) {
          player.context.resume();
          player.play();
          setPlaying(true);
        }
      });

      player.onProgress((nextPosition) => {
        const now = performance.now();
        const rowChanged = nextPosition.row !== playerRef.current?.__lastRow;
        if (!rowChanged && now - lastUiUpdateRef.current < 60) return;
        player.__lastRow = nextPosition.row;
        lastUiUpdateRef.current = now;
        setPosition(nextPosition);
      });

      player.onEnded(() => setPlaying(false));
      player.onError((event) => {
        setLoading(false);
        setPlaying(false);
        setError(`Не удалось открыть модуль (${event?.type ?? 'ошибка'}).`);
      });
    }

    if (resume) await playerRef.current.context.resume();
    return playerRef.current;
  }, [volume]);

  useEffect(() => () => {
    playerRef.current?.stop();
    playerRef.current?.context?.close();
  }, []);

  const load = useCallback(async (source, { autoplay = true } = {}) => {
    setError('');
    setLoading(true);
    setPlaying(false);
    setMeta(null);
    setPosition(initialPosition);
    autoplayRef.current = autoplay;
    const player = await ensurePlayer({ resume: autoplay });

    if (initializedRef.current) player.load(source);
    else queuedLoadRef.current = source;
  }, [ensurePlayer]);

  const togglePlayback = useCallback(async () => {
    const player = await ensurePlayer({ resume: true });
    if (!meta) return;
    if (playing) player.pause();
    else player.unpause();
    setPlaying((value) => !value);
  }, [ensurePlayer, meta, playing]);

  const seek = useCallback((seconds) => {
    playerRef.current?.setPos(Number(seconds));
    setPosition((value) => ({ ...value, pos: Number(seconds) }));
  }, []);

  const setVolume = useCallback((nextVolume) => {
    const normalized = Number(nextVolume);
    setVolumeState(normalized);
    playerRef.current?.setVol(normalized);
  }, []);

  const toggleMute = useCallback((channel) => {
    setMuted((current) => {
      const next = new Set(current);
      const shouldMute = !next.has(channel);
      if (shouldMute) next.add(channel);
      else next.delete(channel);
      playerRef.current?.setChannelMute(channel, shouldMute);
      return next;
    });
  }, []);

  return {
    ready,
    loading,
    playing,
    meta,
    position,
    muted,
    volume,
    analyser,
    error,
    load,
    togglePlayback,
    seek,
    setVolume,
    toggleMute,
  };
}
