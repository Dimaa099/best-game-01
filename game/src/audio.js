// All sound is synthesised with WebAudio: no audio files, nothing fetched.
// A tiny sequencer plays a bright pentatonic arpeggio under the game, and
// one-shot blips cover shooting, hits, pickups, explosions and the win jingle.
export function createAudio() {
  let context = null;
  let master = null;
  let musicTimer = null;
  let musicStep = 0;
  let muted = false;
  const MELODY = [523.25, 587.33, 659.25, 783.99, 880.0, 783.99, 659.25, 587.33];

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.35;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, duration, type, volume, when = 0, slideTo = 0) {
    if (!ensure() || muted) return;
    const start = context.currentTime + when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function noise(duration, volume, when = 0) {
    if (!ensure() || muted) return;
    const start = context.currentTime + when;
    const length = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    source.connect(gain);
    gain.connect(master);
    source.start(start);
  }

  return {
    unlock() {
      if (ensure() && context.state === 'suspended') context.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    shoot() {
      tone(880, 0.08, 'square', 0.08, 0, 440);
    },
    hit() {
      tone(220, 0.07, 'triangle', 0.12, 0, 110);
    },
    pickup() {
      tone(1046.5, 0.1, 'sine', 0.14);
      tone(1318.5, 0.14, 'sine', 0.12, 0.06);
    },
    heart() {
      tone(659.25, 0.12, 'sine', 0.14);
      tone(987.77, 0.2, 'sine', 0.14, 0.1);
    },
    explosion() {
      noise(0.35, 0.25);
      tone(160, 0.3, 'sawtooth', 0.16, 0, 50);
    },
    hurt() {
      tone(180, 0.25, 'sawtooth', 0.2, 0, 70);
    },
    dash() {
      noise(0.12, 0.1);
      tone(1200, 0.1, 'sine', 0.06, 0, 1800);
    },
    sunburst() {
      tone(523.25, 0.4, 'sine', 0.18, 0, 1567.98);
      tone(783.99, 0.4, 'sine', 0.14, 0.08, 2093);
      noise(0.5, 0.15, 0.05);
    },
    waveHorn() {
      tone(392, 0.25, 'triangle', 0.16);
      tone(523.25, 0.3, 'triangle', 0.16, 0.18);
      tone(659.25, 0.4, 'triangle', 0.16, 0.36);
    },
    bossRoar() {
      tone(110, 0.6, 'sawtooth', 0.2, 0, 55);
      noise(0.5, 0.18);
    },
    victory() {
      const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5];
      notes.forEach((freq, i) => tone(freq, 0.3, 'triangle', 0.16, i * 0.14));
    },
    defeat() {
      const notes = [392, 329.63, 261.63, 196];
      notes.forEach((freq, i) => tone(freq, 0.35, 'triangle', 0.15, i * 0.2));
    },
    startMusic() {
      if (!ensure() || musicTimer) return;
      musicTimer = window.setInterval(() => {
        if (muted || context.state !== 'running') return;
        const freq = MELODY[musicStep % MELODY.length];
        tone(freq, 0.22, 'sine', 0.05);
        if (musicStep % 4 === 2) tone(freq / 2, 0.3, 'sine', 0.04);
        musicStep += 1;
      }, 260);
    },
    stopMusic() {
      if (musicTimer) {
        window.clearInterval(musicTimer);
        musicTimer = null;
      }
    },
  };
}
