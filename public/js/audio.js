/**
 * WILDKIN: AETHER BOUND — Web Audio 8-Bit / Handheld Chiptune & SFX Engine
 * Zero external audio files required; works reliably on iOS Safari after first tap.
 */
(function (root) {
  class ChiptuneAudio {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.bgmEnabled = false;
      this.bgmTimer = null;
      this.bgmMode = 'overworld';
      this.bgmStep = 0;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state !== 'running') {
        this.ctx.resume().catch(() => {});
      }
    }

    toggleMute() {
      this.init();
      this.muted = !this.muted;
      if (this.muted) {
        this.stopBgm();
      } else {
        this.playBlip(660, 0.06);
      }
      return this.muted;
    }

    toggleBgm() {
      this.init();
      this.bgmEnabled = !this.bgmEnabled;
      if (this.bgmEnabled && !this.muted) {
        this.startBgm(this.bgmMode);
      } else {
        this.stopBgm();
      }
      return this.bgmEnabled;
    }

    playTone(freq, duration = 0.08, type = 'square', volume = 0.09, delay = 0, slideTo = null) {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
      }

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch (e) {} };
      osc.stop(now + duration + 0.01);
    }

    playBlip(freq = 580, dur = 0.045) {
      this.playTone(freq, dur, 'square', 0.06);
    }

    playStep(inGrass = false) {
      if (inGrass) {
        this.playTone(260, 0.04, 'triangle', 0.05, 0, 140);
        this.playTone(420, 0.03, 'square', 0.03, 0.02, 220);
      } else {
        this.playTone(170, 0.03, 'triangle', 0.04, 0, 110);
      }
    }

    playEncounterAlert() {
      const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
      notes.forEach((n, idx) => {
        this.playTone(n, 0.075, 'square', 0.10, idx * 0.065);
      });
    }

    playAttack(effectiveness = 1.0) {
      if (effectiveness > 1.0) {
        // Super effective crunch!
        this.playTone(520, 0.08, 'sawtooth', 0.12, 0, 180);
        this.playTone(740, 0.09, 'square', 0.12, 0.06, 260);
        this.playTone(980, 0.12, 'square', 0.11, 0.12, 320);
      } else if (effectiveness < 1.0) {
        // Resisted dull thud
        this.playTone(210, 0.09, 'triangle', 0.08, 0, 95);
      } else {
        // Standard hit
        this.playTone(380, 0.07, 'sawtooth', 0.10, 0, 130);
        this.playTone(260, 0.08, 'square', 0.09, 0.04, 110);
      }
    }

    playPrismThrow() {
      this.playTone(320, 0.16, 'sine', 0.09, 0, 880);
      this.playTone(640, 0.12, 'triangle', 0.07, 0.12, 440);
    }

    playPrismShake(shakeNum = 1) {
      const base = 360 + shakeNum * 60;
      this.playTone(base, 0.07, 'triangle', 0.09, 0, base * 0.75);
      this.playTone(base * 1.25, 0.07, 'sine', 0.08, 0.07, base);
    }

    playPrismCatchSuccess() {
      // Nostalgic 5-note capture lock fanfare!
      const seq = [
        { f: 523.25, d: 0.10, t: 0.00 },
        { f: 659.25, d: 0.10, t: 0.11 },
        { f: 783.99, d: 0.10, t: 0.22 },
        { f: 659.25, d: 0.12, t: 0.34 },
        { f: 1046.5, d: 0.34, t: 0.47 }
      ];
      seq.forEach((n) => this.playTone(n.f, n.d, 'square', 0.10, n.t));
    }

    playShrineHeal() {
      // Classic 5-note Wellspring Sanctuary chime
      const seq = [587.33, 587.33, 587.33, 493.88, 783.99];
      const delays = [0, 0.14, 0.28, 0.42, 0.60];
      const durs = [0.11, 0.11, 0.11, 0.14, 0.36];
      seq.forEach((f, i) => {
        this.playTone(f, durs[i], 'triangle', 0.12, delays[i]);
        this.playTone(f * 1.5, durs[i], 'sine', 0.05, delays[i]);
      });
    }

    playLevelUp() {
      const seq = [440, 554.37, 659.25, 880, 659.25, 880];
      seq.forEach((f, i) => {
        this.playTone(f, i === 5 ? 0.28 : 0.09, 'square', 0.09, i * 0.09);
      });
    }

    playEvolution() {
      const seq = [392, 493.88, 587.33, 783.99, 987.77, 1174.66];
      seq.forEach((f, i) => {
        this.playTone(f, 0.14, 'square', 0.10, i * 0.11);
        this.playTone(f * 0.5, 0.14, 'triangle', 0.08, i * 0.11);
      });
    }

    startBgm(mode = 'overworld') {
      this.bgmMode = mode;
      if (!this.bgmEnabled || this.muted) return;
      this.stopBgm();

      const melodies = {
        overworld: [392, 440, 493.88, 587.33, 659.25, 587.33, 493.88, 440],
        battle: [330, 392, 440, 330, 493.88, 440, 392, 293.66],
        warden: [293.66, 349.23, 440, 587.33, 523.25, 440, 349.23, 329.63]
      };

      const notes = melodies[mode] || melodies.overworld;
      const tempoMs = mode === 'overworld' ? 320 : 210;

      this.bgmTimer = setInterval(() => {
        if (this.muted || !this.bgmEnabled) return;
        const f = notes[this.bgmStep % notes.length];
        this.playTone(f, 0.14, 'triangle', 0.035);
        this.bgmStep++;
      }, tempoMs);
    }

    stopBgm() {
      if (this.bgmTimer) {
        clearInterval(this.bgmTimer);
        this.bgmTimer = null;
      }
    }
  }

  root.WILDKIN_AUDIO = new ChiptuneAudio();
})(typeof self !== 'undefined' ? self : this);
