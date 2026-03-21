export interface PlaylistTrack {
  id: string;
  title: string;
  source: 'file' | 'url';
  url: string;
  duration?: number;
  size?: number;
}

function generateId(): string {
  return crypto.randomUUID();
}

function filenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split('/');
    const last = segments[segments.length - 1];
    if (last) return decodeURIComponent(last);
  } catch { /* ignore */ }
  return url.length > 60 ? url.slice(0, 57) + '...' : url;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export { formatDuration };

export class Playlist {
  private tracks: PlaylistTrack[] = [];
  private currentIndex: number = -1;
  private repeatMode: 'none' | 'one' | 'all' = 'none';
  private shuffleEnabled: boolean = false;
  private playOrder: number[] = [];
  private playOrderIndex: number = -1;

  onTrackChange?: (track: PlaylistTrack, index: number, total: number) => void;
  onPlaylistEmpty?: () => void;
  onListUpdated?: () => void;

  addFile(file: File): PlaylistTrack {
    const url = URL.createObjectURL(file);
    const track: PlaylistTrack = {
      id: generateId(),
      title: file.name.replace(/\.[^.]+$/, ''),
      source: 'file',
      url,
      size: file.size,
    };
    this.tracks.push(track);
    this.rebuildPlayOrder();

    // Load duration asynchronously
    const tempAudio = new Audio();
    tempAudio.preload = 'metadata';
    tempAudio.src = url;
    tempAudio.addEventListener('loadedmetadata', () => {
      if (isFinite(tempAudio.duration)) {
        track.duration = tempAudio.duration;
        this.onListUpdated?.();
      }
    });

    return track;
  }

  addUrl(url: string, title?: string): PlaylistTrack {
    const track: PlaylistTrack = {
      id: generateId(),
      title: title || filenameFromUrl(url),
      source: 'url',
      url,
    };
    this.tracks.push(track);
    this.rebuildPlayOrder();

    // Try to load duration
    const tempAudio = new Audio();
    tempAudio.preload = 'metadata';
    tempAudio.crossOrigin = 'anonymous';
    tempAudio.src = url;
    tempAudio.addEventListener('loadedmetadata', () => {
      if (isFinite(tempAudio.duration)) {
        track.duration = tempAudio.duration;
        this.onListUpdated?.();
      }
    });

    return track;
  }

  removeTrack(id: string): void {
    const idx = this.tracks.findIndex(t => t.id === id);
    if (idx === -1) return;

    const track = this.tracks[idx];

    // Revoke object URL for file tracks
    if (track.source === 'file') {
      URL.revokeObjectURL(track.url);
    }

    const wasPlaying = idx === this.currentIndex;
    this.tracks.splice(idx, 1);

    if (this.tracks.length === 0) {
      this.currentIndex = -1;
      this.rebuildPlayOrder();
      if (wasPlaying) {
        this.onPlaylistEmpty?.();
      }
      return;
    }

    if (wasPlaying) {
      // Advance to next (or wrap/stop)
      if (this.currentIndex >= this.tracks.length) {
        this.currentIndex = 0;
      }
      this.rebuildPlayOrder();
      const nextTrack = this.tracks[this.currentIndex];
      if (nextTrack) {
        this.onTrackChange?.(nextTrack, this.currentIndex, this.tracks.length);
      } else {
        this.onPlaylistEmpty?.();
      }
    } else {
      // Adjust currentIndex if needed
      if (idx < this.currentIndex) {
        this.currentIndex--;
      }
      this.rebuildPlayOrder();
    }
  }

  moveTrack(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this.tracks.length) return;
    if (toIndex < 0 || toIndex >= this.tracks.length) return;
    if (fromIndex === toIndex) return;

    const [moved] = this.tracks.splice(fromIndex, 1);
    this.tracks.splice(toIndex, 0, moved);

    // Update currentIndex to follow the playing track
    if (this.currentIndex === fromIndex) {
      this.currentIndex = toIndex;
    } else if (fromIndex < this.currentIndex && toIndex >= this.currentIndex) {
      this.currentIndex--;
    } else if (fromIndex > this.currentIndex && toIndex <= this.currentIndex) {
      this.currentIndex++;
    }

    this.rebuildPlayOrder();
  }

  clear(): void {
    // Revoke all file object URLs
    for (const track of this.tracks) {
      if (track.source === 'file') {
        URL.revokeObjectURL(track.url);
      }
    }
    const wasPlaying = this.currentIndex >= 0;
    this.tracks = [];
    this.currentIndex = -1;
    this.playOrder = [];
    this.playOrderIndex = -1;
    if (wasPlaying) {
      this.onPlaylistEmpty?.();
    }
  }

  getCurrentTrack(): PlaylistTrack | null {
    if (this.currentIndex < 0 || this.currentIndex >= this.tracks.length) return null;
    return this.tracks[this.currentIndex];
  }

  next(): PlaylistTrack | null {
    if (this.tracks.length === 0) return null;

    if (this.repeatMode === 'one') {
      // Re-play current track
      const track = this.tracks[this.currentIndex];
      if (track) {
        this.onTrackChange?.(track, this.currentIndex, this.tracks.length);
        return track;
      }
    }

    if (this.shuffleEnabled) {
      this.playOrderIndex++;
      if (this.playOrderIndex >= this.playOrder.length) {
        if (this.repeatMode === 'all') {
          this.regenerateShuffleOrder();
          this.playOrderIndex = 0;
        } else {
          this.onPlaylistEmpty?.();
          return null;
        }
      }
      this.currentIndex = this.playOrder[this.playOrderIndex];
    } else {
      this.currentIndex++;
      if (this.currentIndex >= this.tracks.length) {
        if (this.repeatMode === 'all') {
          this.currentIndex = 0;
        } else {
          this.currentIndex = -1;
          this.onPlaylistEmpty?.();
          return null;
        }
      }
    }

    const track = this.tracks[this.currentIndex];
    if (track) {
      this.onTrackChange?.(track, this.currentIndex, this.tracks.length);
    }
    return track;
  }

  prev(): PlaylistTrack | null {
    if (this.tracks.length === 0) return null;

    if (this.shuffleEnabled) {
      this.playOrderIndex--;
      if (this.playOrderIndex < 0) {
        this.playOrderIndex = this.repeatMode === 'all' ? this.playOrder.length - 1 : 0;
      }
      this.currentIndex = this.playOrder[this.playOrderIndex];
    } else {
      this.currentIndex--;
      if (this.currentIndex < 0) {
        this.currentIndex = this.repeatMode === 'all' ? this.tracks.length - 1 : 0;
      }
    }

    const track = this.tracks[this.currentIndex];
    if (track) {
      this.onTrackChange?.(track, this.currentIndex, this.tracks.length);
    }
    return track;
  }

  jumpTo(index: number): PlaylistTrack | null {
    if (index < 0 || index >= this.tracks.length) return null;
    this.currentIndex = index;

    // Update shuffle play order position
    if (this.shuffleEnabled) {
      const orderIdx = this.playOrder.indexOf(index);
      if (orderIdx !== -1) {
        this.playOrderIndex = orderIdx;
      }
    }

    const track = this.tracks[this.currentIndex];
    if (track) {
      this.onTrackChange?.(track, this.currentIndex, this.tracks.length);
    }
    return track;
  }

  getTracks(): PlaylistTrack[] {
    return [...this.tracks];
  }

  get length(): number {
    return this.tracks.length;
  }

  get currentPosition(): number {
    return this.currentIndex;
  }

  get isShuffled(): boolean {
    return this.shuffleEnabled;
  }

  get repeat(): 'none' | 'one' | 'all' {
    return this.repeatMode;
  }

  toggleShuffle(): boolean {
    this.shuffleEnabled = !this.shuffleEnabled;
    if (this.shuffleEnabled) {
      this.regenerateShuffleOrder();
    }
    return this.shuffleEnabled;
  }

  setRepeat(mode: 'none' | 'one' | 'all'): void {
    this.repeatMode = mode;
  }

  cycleRepeat(): 'none' | 'one' | 'all' {
    const modes: Array<'none' | 'one' | 'all'> = ['none', 'one', 'all'];
    const idx = modes.indexOf(this.repeatMode);
    this.repeatMode = modes[(idx + 1) % modes.length];
    return this.repeatMode;
  }

  saveToStorage(key: string = 'lappycap-playlist'): void {
    // Only save URL tracks (file object URLs don't survive reload)
    const urlTracks = this.tracks
      .filter(t => t.source === 'url')
      .map(t => ({ ...t }));
    const data = {
      tracks: urlTracks,
      repeat: this.repeatMode,
      shuffle: this.shuffleEnabled,
    };
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch { /* quota exceeded or unavailable */ }
  }

  loadFromStorage(key: string = 'lappycap-playlist'): void {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.tracks && Array.isArray(data.tracks)) {
        for (const t of data.tracks) {
          if (t.source === 'url' && t.url) {
            this.addUrl(t.url, t.title);
          }
        }
      }
      if (data.repeat) this.repeatMode = data.repeat;
      if (data.shuffle !== undefined) this.shuffleEnabled = data.shuffle;
      if (this.shuffleEnabled) this.regenerateShuffleOrder();
    } catch { /* corrupt data */ }
  }

  exportM3U(): string {
    let m3u = '#EXTM3U\n';
    for (const track of this.tracks) {
      const dur = track.duration ? Math.round(track.duration) : -1;
      m3u += `#EXTINF:${dur},${track.title}\n`;
      m3u += `${track.url}\n`;
    }
    return m3u;
  }

  importM3U(text: string): PlaylistTrack[] {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const added: PlaylistTrack[] = [];
    let nextTitle: string | undefined;

    for (const line of lines) {
      if (line.startsWith('#EXTM3U')) continue;
      if (line.startsWith('#EXTINF:')) {
        // Extract title after the comma
        const commaIdx = line.indexOf(',');
        if (commaIdx !== -1) {
          nextTitle = line.slice(commaIdx + 1).trim();
        }
        continue;
      }
      if (line.startsWith('#')) continue;

      // This is a URL/path line — skip blob: URLs (file tracks that won't work)
      if (line.startsWith('blob:')) {
        nextTitle = undefined;
        continue;
      }

      const track = this.addUrl(line, nextTitle);
      added.push(track);
      nextTitle = undefined;
    }
    return added;
  }

  private rebuildPlayOrder(): void {
    if (this.shuffleEnabled) {
      this.regenerateShuffleOrder();
    } else {
      this.playOrder = [];
      this.playOrderIndex = -1;
    }
  }

  private regenerateShuffleOrder(): void {
    this.playOrder = Array.from({ length: this.tracks.length }, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = this.playOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.playOrder[i], this.playOrder[j]] = [this.playOrder[j], this.playOrder[i]];
    }
    // If currently playing, put current track at the front
    if (this.currentIndex >= 0) {
      const curPosInOrder = this.playOrder.indexOf(this.currentIndex);
      if (curPosInOrder > 0) {
        [this.playOrder[0], this.playOrder[curPosInOrder]] = [this.playOrder[curPosInOrder], this.playOrder[0]];
      }
      this.playOrderIndex = 0;
    } else {
      this.playOrderIndex = -1;
    }
  }
}
