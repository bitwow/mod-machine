import { useCallback, useEffect, useRef, useState } from 'react';

const initialPosition = { pos: 0, order: 0, pattern: 0, row: 0, bpm: 125, chVol: [] };
const engineTimeoutMs = 15_000;

const errorMessages = {
  engine: 'Не удалось загрузить звуковой движок. Обновите страницу.',
  unsupported: 'Браузер не поддерживает AudioWorklet. Откройте сайт в актуальном Chrome, Firefox или Safari.',
  network: 'Нет связи с The Mod Archive. Проверьте подключение и попробуйте ещё раз.',
  file: 'Не удалось прочитать файл.',
  ptr: 'Файл не похож на поддерживаемый модуль (MOD, XM, S3M, IT).',
  WorkletLoad: 'Не удалось запустить звуковой движок. Обновите страницу.',
  Process: 'Ошибка при воспроизведении модуля.',
};

const describeError = (code) => errorMessages[code] ?? `Не удалось открыть модуль (${code ?? 'ошибка'}).`;

class PlayerError extends Error {
  constructor(code, message = describeError(code)) {
    super(message);
    this.code = code;
  }
}

function waitForEngine() {
  if (window.ChiptuneJsPlayer) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const handleReady = () => {
      window.clearTimeout(timer);
      resolve();
    };
    const timer = window.setTimeout(() => {
      window.removeEventListener('mod-engine-ready', handleReady);
      reject(new PlayerError('engine'));
    }, engineTimeoutMs);
    window.addEventListener('mod-engine-ready', handleReady, { once: true });
  });
}

async function readModule(source, signal) {
  if (source instanceof Blob) {
    try {
      return await source.arrayBuffer();
    } catch {
      throw new PlayerError('file');
    }
  }

  try {
    const response = await fetch(source, { signal });
    if (!response.ok) {
      throw new PlayerError('http', `The Mod Archive ответил ошибкой ${response.status}. Попробуйте позже.`);
    }
    return await response.arrayBuffer();
  } catch (error) {
    if (error instanceof PlayerError || error?.name === 'AbortError') throw error;
    throw new PlayerError('network');
  }
}

export function useModPlayer() {
  const playerRef = useRef(null);
  const creatingRef = useRef(null);
  const initializedRef = useRef(false);
  const queuedBufferRef = useRef(null);
  const autoplayRef = useRef(false);
  const endedRef = useRef(false);
  const volumeRef = useRef(72);
  const lastUiUpdateRef = useRef(0);
  const lastRowRef = useRef(-1);
  // Every load() gets an id. Only the newest one may reach the engine and the
  // UI, so a slow download can't replace a track the user picked after it.
  const loadIdRef = useRef(0);
  const postedLoadIdRef = useRef(0);
  const pendingBuffersRef = useRef(0);
  const abortRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [meta, setMeta] = useState(null);
  const [position, setPosition] = useState(initialPosition);
  const [muted, setMuted] = useState(() => new Set());
  const [volume, setVolumeState] = useState(volumeRef.current);
  const [analyser, setAnalyser] = useState(null);
  const [error, setError] = useState('');

  // True while the worklet still answers for a buffer older than the newest load.
  const isStale = () => pendingBuffersRef.current > 0 || postedLoadIdRef.current !== loadIdRef.current;

  const postBuffer = useCallback((player, buffer, loadId) => {
    postedLoadIdRef.current = loadId;
    pendingBuffersRef.current += 1;
    player.loadBuffer(buffer);
  }, []);

  const createPlayer = useCallback(async () => {
    await waitForEngine();
    if (!window.AudioContext || !window.AudioWorkletNode) throw new PlayerError('unsupported');

    // iOS mutes Web Audio with the silent switch unless the page asks for media playback.
    if (navigator.audioSession) {
      try {
        navigator.audioSession.type = 'playback';
      } catch {
        // Older Safari: keep the default session.
      }
    }

    const player = new window.ChiptuneJsPlayer({
      repeatCount: 0,
      stereoSeparation: 180,
      amigaResampler: 'a500',
    });
    playerRef.current = player;
    player.setVol(volumeRef.current);

    player.onInitialized(() => {
      initializedRef.current = true;
      const scope = player.context.createAnalyser();
      scope.fftSize = 256;
      scope.smoothingTimeConstant = 0.72;
      player.gain.connect(scope);
      setAnalyser(scope);
      setReady(true);

      const queued = queuedBufferRef.current;
      queuedBufferRef.current = null;
      if (queued?.loadId === loadIdRef.current) postBuffer(player, queued.buffer, queued.loadId);
    });

    player.onMetadata((nextMeta) => {
      pendingBuffersRef.current = Math.max(0, pendingBuffersRef.current - 1);
      if (isStale()) return;
      if (!nextMeta) {
        setLoading(false);
        setError(describeError('engine'));
        return;
      }

      endedRef.current = false;
      setMeta(nextMeta);
      setLoading(false);
      setMuted(new Set());
      setPosition({
        ...initialPosition,
        pattern: nextMeta.song?.orders?.[0] ?? 0,
        bpm: nextMeta.song?.bpm ?? 125,
      });

      if (autoplayRef.current) {
        player.context.resume();
        player.play();
        setPlaying(true);
      }
    });

    player.onProgress((nextPosition) => {
      if (isStale()) return;
      const now = performance.now();
      if (nextPosition.row === lastRowRef.current && now - lastUiUpdateRef.current < 60) return;
      lastRowRef.current = nextPosition.row;
      lastUiUpdateRef.current = now;
      setPosition(nextPosition);
    });

    player.onEnded(() => {
      endedRef.current = true;
      setPlaying(false);
    });

    player.onError((event) => {
      const type = event?.type;
      // 'ptr' is the worklet's answer to a posted buffer it could not parse.
      if (type === 'ptr') {
        pendingBuffersRef.current = Math.max(0, pendingBuffersRef.current - 1);
        if (isStale()) return;
      }
      setLoading(false);
      setPlaying(false);
      setError(describeError(type));
    });

    return player;
    // Handlers only touch refs and state setters, so the player is built once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postBuffer]);

  const ensurePlayer = useCallback(async ({ resume = false } = {}) => {
    if (!playerRef.current) {
      // Concurrent callers share one creation instead of each opening an AudioContext.
      creatingRef.current ??= createPlayer().catch((creationError) => {
        creatingRef.current = null;
        throw creationError;
      });
      await creatingRef.current;
    }

    // Called synchronously when the player exists, so resume() stays inside the user gesture.
    if (resume) await playerRef.current.context.resume();
    return playerRef.current;
  }, [createPlayer]);

  useEffect(() => () => {
    abortRef.current?.abort();
    const player = playerRef.current;
    playerRef.current = null;
    creatingRef.current = null;
    initializedRef.current = false;
    player?.stop();
    player?.context?.close().catch(() => {});
  }, []);

  const load = useCallback(async (source, { autoplay = true } = {}) => {
    const loadId = ++loadIdRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    queuedBufferRef.current = null;
    autoplayRef.current = autoplay;
    endedRef.current = false;
    // The previous module must not keep playing under the new title while this one downloads.
    playerRef.current?.pause();

    setError('');
    setLoading(true);
    setPlaying(false);
    setMeta(null);
    setPosition(initialPosition);

    try {
      const [player, buffer] = await Promise.all([
        ensurePlayer({ resume: autoplay }),
        readModule(source, controller.signal),
      ]);
      if (loadId !== loadIdRef.current) return;

      if (initializedRef.current) postBuffer(player, buffer, loadId);
      else queuedBufferRef.current = { buffer, loadId };
    } catch (loadError) {
      if (loadId !== loadIdRef.current || loadError?.name === 'AbortError') return;
      setLoading(false);
      setError(loadError instanceof PlayerError ? loadError.message : describeError());
    }
  }, [ensurePlayer, postBuffer]);

  const togglePlayback = useCallback(async () => {
    let player;
    try {
      player = await ensurePlayer({ resume: true });
    } catch (playerError) {
      setError(playerError instanceof PlayerError ? playerError.message : describeError());
      return;
    }
    if (!meta) return;

    if (playing) {
      player.pause();
      setPlaying(false);
      return;
    }

    if (endedRef.current) {
      // A finished module only renders silence; rewind so Play starts it over.
      player.setPos(0);
      setPosition((value) => ({ ...value, pos: 0 }));
      endedRef.current = false;
    }
    player.unpause();
    setPlaying(true);
  }, [ensurePlayer, meta, playing]);

  const seek = useCallback((seconds) => {
    const value = Number(seconds);
    endedRef.current = false;
    playerRef.current?.setPos(value);
    setPosition((current) => ({ ...current, pos: value }));
  }, []);

  const setVolume = useCallback((nextVolume) => {
    const normalized = Number(nextVolume);
    volumeRef.current = normalized;
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
