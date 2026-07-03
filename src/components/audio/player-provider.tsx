"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type PlayerTrack = {
  id: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  previewUrl: string;
  downloadUrl: string;
  bpm: number;
  musicalKey: string;
};

type PlayerContextValue = {
  queue: PlayerTrack[];
  currentTrack: PlayerTrack | null;
  isPlaying: boolean;
  isShuffle: boolean;
  isLoop: boolean;
  currentTime: number;
  duration: number;
  setPlaylist: (tracks: PlayerTrack[]) => void;
  playTrack: (track: PlayerTrack, playlist?: PlayerTrack[]) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrevious: () => void;
  toggleShuffle: () => void;
  toggleLoop: () => void;
  seek: (time: number) => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<PlayerTrack[]>([]);
  const indexRef = useRef(0);
  const shuffleRef = useRef(false);
  const loopRef = useRef(false);
  const orderRef = useRef<number[]>([]);

  const [queue, setQueueState] = useState<PlayerTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isLoop, setIsLoop] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const loadAndPlay = useCallback((track: PlayerTrack) => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTrack(track);
    audio.src = track.previewUrl;
    audio.currentTime = 0;
    void audio.play();
  }, []);

  const playAtIndex = useCallback(
    (playbackPosition: number) => {
      const list = queueRef.current;
      if (list.length === 0) return;

      const pos =
        ((playbackPosition % list.length) + list.length) % list.length;
      indexRef.current = pos;

      let trackIndex = pos;
      if (shuffleRef.current && orderRef.current.length === list.length) {
        trackIndex = orderRef.current[pos] ?? pos;
      }

      loadAndPlay(list[trackIndex]);
    },
    [loadAndPlay],
  );

  const playNext = useCallback(() => {
    const list = queueRef.current;
    if (list.length === 0) return;

    const next = indexRef.current + 1;
    if (next >= list.length) {
      if (loopRef.current) playAtIndex(0);
      return;
    }
    playAtIndex(next);
  }, [playAtIndex]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      if (loopRef.current && queueRef.current.length <= 1) {
        audio.currentTime = 0;
        void audio.play();
        return;
      }
      playNext();
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("loadedmetadata", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("loadedmetadata", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audioRef.current = null;
    };
  }, [playNext]);

  const setPlaylist = useCallback((tracks: PlayerTrack[]) => {
    queueRef.current = tracks;
    setQueueState(tracks);
    orderRef.current = tracks.map((_, i) => i);
  }, []);

  const playTrack = useCallback(
    (track: PlayerTrack, playlist?: PlayerTrack[]) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (playlist?.length) {
        queueRef.current = playlist;
        setQueueState(playlist);
        orderRef.current = playlist.map((_, i) => i);
        const trackIdx = playlist.findIndex((t) => t.id === track.id);
        if (shuffleRef.current && trackIdx >= 0) {
          const pos = orderRef.current.indexOf(trackIdx);
          indexRef.current = pos >= 0 ? pos : 0;
        } else {
          indexRef.current = trackIdx >= 0 ? trackIdx : 0;
        }
      } else if (queueRef.current.length === 0) {
        queueRef.current = [track];
        setQueueState([track]);
        indexRef.current = 0;
      } else {
        const trackIdx = queueRef.current.findIndex((t) => t.id === track.id);
        if (trackIdx >= 0) {
          if (shuffleRef.current) {
            const pos = orderRef.current.indexOf(trackIdx);
            indexRef.current = pos >= 0 ? pos : indexRef.current;
          } else {
            indexRef.current = trackIdx;
          }
        }
      }

      if (currentTrack?.id === track.id) {
        if (audio.paused) void audio.play();
        else audio.pause();
        return;
      }

      loadAndPlay(track);
    },
    [currentTrack?.id, loadAndPlay],
  );

  const playPrevious = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || queueRef.current.length === 0) return;

    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    const prev = indexRef.current - 1;
    if (prev < 0) {
      if (loopRef.current) playAtIndex(queueRef.current.length - 1);
      return;
    }
    playAtIndex(prev);
  }, [playAtIndex]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  }, [currentTrack]);

  const toggleShuffle = useCallback(() => {
    shuffleRef.current = !shuffleRef.current;
    setIsShuffle(shuffleRef.current);
    if (shuffleRef.current && queueRef.current.length > 0) {
      const current = indexRef.current;
      orderRef.current = shuffleArray(
        queueRef.current.map((_, i) => i),
      );
      const newPos = orderRef.current.indexOf(current);
      indexRef.current = newPos >= 0 ? newPos : 0;
    } else {
      orderRef.current = queueRef.current.map((_, i) => i);
    }
  }, []);

  const toggleLoop = useCallback(() => {
    loopRef.current = !loopRef.current;
    setIsLoop(loopRef.current);
  }, []);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        queue,
        currentTrack,
        isPlaying,
        isShuffle,
        isLoop,
        currentTime,
        duration,
        setPlaylist,
        playTrack,
        togglePlay,
        playNext,
        playPrevious,
        toggleShuffle,
        toggleLoop,
        seek,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer doit être utilisé dans PlayerProvider");
  }
  return context;
}
