import { useCallback, useEffect, useRef, useState } from 'react';

const initialPosition = { pos: 0, order: 0, pattern: 0, row: 0, bpm: 125, chVol: [] };
const initialVolume = 72;
const engineTimeoutMs = 15_000;
// The worklet answers a load within milliseconds; this only catches a wedged engine.
const loadReplyTimeoutMs = 20_000;
// How long a started playback may wait for the AudioContext to actually run.
const startCheckMs = 1_500;

const errorMessages = {
  engine: 'Не удалось загрузить звуковой движок. Обновите страницу.',
  unsupported: 'Браузер не поддерживает AudioWorklet. Откройте сайт в актуальном Chrome, Firefox или Safari.',
  network: 'Нет связи с The Mod Archive. Проверьте подключение и попробуйте ещё раз.',
  missing: 'The Mod Archive не отдал этот модуль (возможно, он удалён). Выберите другой трек.',
  file: 'Не удалось прочитать файл.',
  ptr: 'Файл не похож на поддерживаемый модуль (MOD, XM, S3M, IT).',
  timeout: 'Звуковой движок не ответил. Выберите трек ещё раз.',
  Engine: 'Звуковой движок дал сбой. Выберите трек ещё раз.',
  Init: 'Не удалось запустить звуковой движок. Обновите страницу.',
  WorkletLoad: 'Не удалось запустить звуковой движок. Выберите трек ещё раз или обновите страницу.',
  Process: 'Звуковой движок остановился. Выберите трек ещё раз.',
};

const describeError = (code) => errorMessages[code] ?? `Не удалось открыть модуль (${code ?? 'ошибка'}).`;

// Errors after which the AudioContext/worklet can't be trusted any more.
const fatalEngineErrors = new Set(['WorkletLoad', 'Process', 'Init', 'timeout']);

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
    // Unknown or removed ids come back as "200 OK" with an HTML error page.
    if (response.headers.get('content-type')?.includes('text/html')) throw new PlayerError('missing');
    return await response.arrayBuffer();
  } catch (error) {
    if (error instanceof PlayerError || error?.name === 'AbortError') throw error;
    throw new PlayerError('network');
  }
}

const resumeContext = (player) => player?.context.resume().catch(() => {});

export function useModPlayer() {
  const playerRef = useRef(null);
  const creatingRef = useRef(null);
  const initializedRef = useRef(false);
  const queuedBufferRef = useRef(null);
  const autoplayRef = useRef(false);
  const endedRef = useRef(false);
  const volumeRef = useRef(initialVolume);
  const lastUiUpdateRef = useRef(0);
  const lastRowRef = useRef(-1);
  // Every load() gets an id that the worklet echoes back, so replies for an
  // older load (or a slow download) can never reach the UI or the engine.
  const loadIdRef = useRef(0);
  // Id of the module the worklet is actually holding right now.
  const engineLoadIdRef = useRef(0);
  const abortRef = useRef(null);
  const replyTimerRef = useRef(0);
  const startCheckRef = useRef(0);
  // Mirrors of state for handlers that run after an await or from engine events.
  const metaRef = useRef(null);
  const playingRef = useRef(false);
  const patternWorkerRef = useRef(null);
  const patternBusyRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playing, setPlayingState] = useState(false);
  const [meta, setMetaState] = useState(null);
  const [patterns, setPatterns] = useState(null);
  const [position, setPosition] = useState(initialPosition);
  const [muted, setMuted] = useState(() => new Set());
  const [volume, setVolumeState] = useState(initialVolume);
  const [analyser, setAnalyser] = useState(null);
  const [error, setError] = useState('');

  const setPlaying = useCallback((value) => {
    playingRef.current = value;
    setPlayingState(value);
  }, []);

  const setMeta = useCallback((value) => {
    metaRef.current = value;
    setMetaState(value);
  }, []);

  const clearReplyTimer = useCallback(() => {
    window.clearTimeout(replyTimerRef.current);
  }, []);

  // Drops a broken player so the next action builds a fresh AudioContext.
  const discardPlayer = useCallback(() => {
    const player = playerRef.current;
    playerRef.current = null;
    creatingRef.current = null;
    initializedRef.current = false;
    queuedBufferRef.current = null;
    engineLoadIdRef.current = 0;
    setReady(false);
    setAnalyser(null);
    player?.context?.close().catch(() => {});
  }, []);

  const failLoad = useCallback((code) => {
    clearReplyTimer();
    setLoading(false);
    setPlaying(false);
    setError(describeError(code));
    if (fatalEngineErrors.has(code)) discardPlayer();
  }, [clearReplyTimer, discardPlayer, setPlaying]);

  const postBuffer = useCallback((player, buffer, loadId) => {
    player.loadBuffer(buffer, loadId);
    clearReplyTimer();
    replyTimerRef.current = window.setTimeout(() => {
      if (loadId === loadIdRef.current) failLoad('timeout');
    }, loadReplyTimeoutMs);
  }, [clearReplyTimer, failLoad]);

  const startPlayback = useCallback((player) => {
    player.unpause();
    setPlaying(true);
    if (player.context.state === 'running') return;

    resumeContext(player);
    // Outside a user gesture the browser may refuse to start audio at all;
    // show the truth instead of a Pause button over silence.
    window.clearTimeout(startCheckRef.current);
    startCheckRef.current = window.setTimeout(() => {
      if (playerRef.current !== player || !playingRef.current || player.context.state === 'running') return;
      player.pause();
      setPlaying(false);
    }, startCheckMs);
  }, [setPlaying]);

  const requestPatterns = useCallback((buffer, loadId) => {
    const url = window.modPatternWorkerUrl;
    if (!url || typeof Worker === 'undefined') return;

    // A busy worker is still parsing an older module; replacing it is cheaper than waiting.
    if (patternBusyRef.current) {
      patternWorkerRef.current?.terminate();
      patternWorkerRef.current = null;
    }

    try {
      if (!patternWorkerRef.current) {
        const worker = new Worker(url, { type: 'module' });
        worker.onmessage = ({ data }) => {
          patternBusyRef.current = false;
          if (data.id === loadIdRef.current && !data.error) setPatterns(data.patterns);
        };
        worker.onerror = () => {
          patternBusyRef.current = false;
        };
        patternWorkerRef.current = worker;
      }
      patternBusyRef.current = true;
      patternWorkerRef.current.postMessage({ id: loadId, buffer }, [buffer]);
    } catch {
      // No module workers (old browsers): the tracker just stays empty.
      patternBusyRef.current = false;
    }
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
    const isCurrent = () => playerRef.current === player;

    // Calls, Siri, the lock screen or an audio route change can suspend the
    // context behind our back; show that as paused instead of a frozen "playing".
    player.context.addEventListener('statechange', () => {
      if (!isCurrent() || player.context.state === 'running' || !playingRef.current) return;
      player.pause();
      setPlaying(false);
    });

    player.onInitialized(() => {
      if (!isCurrent()) return;
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

    player.onMetadata((nextMeta, loadId) => {
      if (!isCurrent()) return;
      engineLoadIdRef.current = loadId;
      if (loadId !== loadIdRef.current) return;
      clearReplyTimer();
      if (!nextMeta) {
        failLoad('Engine');
        return;
      }

      endedRef.current = false;
      lastRowRef.current = -1;
      setMeta(nextMeta);
      setLoading(false);
      setMuted(new Set());
      setPosition({
        ...initialPosition,
        pattern: nextMeta.song?.orders?.[0] ?? 0,
        bpm: nextMeta.song?.bpm ?? 125,
      });

      if (autoplayRef.current) startPlayback(player);
    });

    player.onProgress((nextPosition) => {
      if (!isCurrent() || engineLoadIdRef.current !== loadIdRef.current) return;
      const now = performance.now();
      if (nextPosition.row === lastRowRef.current && now - lastUiUpdateRef.current < 60) return;
      lastRowRef.current = nextPosition.row;
      lastUiUpdateRef.current = now;
      setPosition(nextPosition);
    });

    player.onEnded(() => {
      if (!isCurrent()) return;
      endedRef.current = true;
      setPlaying(false);
    });

    player.onError((event) => {
      if (!isCurrent()) return;
      const { type, id } = event ?? {};
      if (id !== undefined) {
        engineLoadIdRef.current = 0;
        // A reply for an older load: the newer one is still on its way.
        if (id !== loadIdRef.current) return;
      }
      failLoad(type);
    });

    return player;
  }, [clearReplyTimer, failLoad, postBuffer, setMeta, setPlaying, startPlayback]);

  const ensurePlayer = useCallback(async () => {
    if (!playerRef.current) {
      // Concurrent callers share one creation instead of each opening an AudioContext.
      creatingRef.current ??= createPlayer().catch((creationError) => {
        creatingRef.current = null;
        throw creationError;
      });
      await creatingRef.current;
    }
    return playerRef.current;
  }, [createPlayer]);

  useEffect(() => () => {
    abortRef.current?.abort();
    window.clearTimeout(replyTimerRef.current);
    window.clearTimeout(startCheckRef.current);
    patternWorkerRef.current?.terminate();
    patternWorkerRef.current = null;
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
    clearReplyTimer();
    autoplayRef.current = autoplay;
    endedRef.current = false;
    // The previous module must not keep playing under the new title while this one downloads.
    playerRef.current?.pause();
    // Resume inside the click itself; awaiting it could hang (iOS interruptions).
    if (autoplay) resumeContext(playerRef.current);

    setError('');
    setLoading(true);
    setPlaying(false);
    setMeta(null);
    setPatterns(null);
    setMuted(new Set());
    setPosition(initialPosition);

    try {
      const [player, buffer] = await Promise.all([
        ensurePlayer(),
        readModule(source, controller.signal),
      ]);
      if (loadId !== loadIdRef.current) return;

      requestPatterns(buffer.slice(0), loadId);
      if (initializedRef.current) postBuffer(player, buffer, loadId);
      else queuedBufferRef.current = { buffer, loadId };
    } catch (loadError) {
      if (loadId !== loadIdRef.current || loadError?.name === 'AbortError') return;
      setLoading(false);
      setError(loadError instanceof PlayerError ? loadError.message : describeError());
    }
  }, [clearReplyTimer, ensurePlayer, postBuffer, requestPatterns, setMeta, setPlaying]);

  const togglePlayback = useCallback(async () => {
    const loadId = loadIdRef.current;
    // Synchronous, so it happens inside the user gesture; never awaited.
    resumeContext(playerRef.current);

    let player;
    try {
      player = await ensurePlayer();
    } catch (playerError) {
      setError(playerError instanceof PlayerError ? playerError.message : describeError());
      return;
    }
    // Refs, not render-time values: another track may have been picked meanwhile.
    if (loadId !== loadIdRef.current || !metaRef.current) return;

    if (playingRef.current) {
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
    startPlayback(player);
  }, [ensurePlayer, setPlaying, startPlayback]);

  const seek = useCallback((seconds) => {
    if (!metaRef.current) return;
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
    // While a module loads, the worklet would apply the mute to the new module
    // and the UI would then reset it: keep both in step by ignoring it.
    if (!metaRef.current) return;
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
    patterns,
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
