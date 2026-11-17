// Solmar Heist — all sound is synthesized with WebAudio: no audio files.
// A tiny scheduler plays a sunny bass-and-keys loop; one-shots cover the rest.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      // Engine hum: a low sawtooth whose pitch follows speed.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 420;
      engineOsc.connect(lp);
      lp.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      // Police siren: two alternating tones.
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      startMusic();
      return true;
    } catch {
      ctx = null;
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, lowpass) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = lowpass || 3000;
    const g = ctx.createGain();
    g.gain.value = vol || 0.3;
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t);
  }

  // Sunny loop: A-minor-ish bass line + sparse keys, 8 steps per bar at 112 BPM.
  const BASS = [110, 0, 110, 0, 130.81, 0, 98, 0, 110, 0, 110, 0, 146.83, 0, 164.81, 0];
  const KEYS = [440, 523.25, 659.25, 523.25, 440, 392, 493.88, 587.33];
  function startMusic() {
    if (musicTimer || !ctx) return;
    musicTimer = window.setInterval(() => {
      if (muted || !ctx) return;
      const step = musicStep % 16;
      const bass = BASS[step];
      if (bass) tone(bass, 0.32, 'triangle', 0.16);
      if (step % 4 === 0) tone(KEYS[(musicStep / 4) % 8 | 0], 0.5, 'sine', 0.05);
      if (step % 2 === 0) noise(0.03, 0.03, 8000);
      musicStep++;
    }, 134);
  }

  let sirenPhase = 0;
  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    get muted() { return muted; },
    setEngine(speed01, on) {
      if (!ctx) return;
      const t = ctx.currentTime;
      engineGain.gain.setTargetAtTime(on ? 0.05 + speed01 * 0.09 : 0, t, 0.1);
      engineOsc.frequency.setTargetAtTime(48 + speed01 * 130, t, 0.08);
    },
    setSiren(on, dt) {
      if (!ctx) return;
      sirenPhase += dt;
      const hi = Math.sin(sirenPhase * 4) > 0;
      sirenGain.gain.setTargetAtTime(on && !muted ? 0.045 : 0, ctx.currentTime, 0.1);
      sirenOsc.frequency.setTargetAtTime(hi ? 880 : 660, ctx.currentTime, 0.05);
    },
    shoot() { noise(0.14, 0.5, 2200); tone(160, 0.1, 'square', 0.2, 60); },
    punch() { noise(0.09, 0.35, 700); tone(90, 0.09, 'sine', 0.3, 50); },
    crash() { noise(0.3, 0.45, 900); tone(70, 0.25, 'sine', 0.35, 35); },
    pickup() { tone(660, 0.12, 'sine', 0.2); window.setTimeout(() => tone(880, 0.16, 'sine', 0.2), 90); },
    cash() { tone(988, 0.1, 'triangle', 0.22); window.setTimeout(() => tone(1319, 0.22, 'triangle', 0.22), 100); },
    missionDone() { [523, 659, 784, 1047].forEach((f, i) => window.setTimeout(() => tone(f, 0.3, 'triangle', 0.22), i * 130)); },
    fail() { [392, 330, 262].forEach((f, i) => window.setTimeout(() => tone(f, 0.35, 'sawtooth', 0.12), i * 160)); },
    sirenBlip() { tone(900, 0.15, 'square', 0.08, 1200); },
    horn() { tone(370, 0.18, 'square', 0.1); },
  };
}
