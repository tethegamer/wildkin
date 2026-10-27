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


    playEncounterStinger(mode = 'wild') {
      const notes = mode === 'warden' || mode === 'pvp'
        ? [392, 466.16, 523.25, 587.33, 698.46, 783.99, 932.33, 1046.5]
        : [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
      notes.forEach((n, idx) => {
        this.playTone(n, 0.065, 'square', 0.11, idx * 0.055);
        this.playTone(n * 0.5, 0.065, 'sawtooth', 0.06, idx * 0.055);
      });
      return { ok: true, mode, noteCount: notes.length };
    }

    playKinCry(kinId = 1, element = 'Pyre', stage = 1, isFaint = false) {
      const idNum = Math.max(1, Number(kinId) || 1);
      const stg = Math.max(1, Math.min(3, Number(stage) || 1));
      const elMap = {
        Pyre: 340, Ember: 340, Tide: 290, Grove: 380, Volt: 510,
        Terra: 195, Frost: 460, Cryo: 460, Gale: 440, Solar: 490, Aether: 420, Umbra: 240
      };
      const baseFreq = (elMap[element] || 330) + ((idNum * 29) % 160) - (stg - 1) * 48;
      const wave = (stg === 3 || element === 'Terra' || element === 'Pyre') ? 'sawtooth' : 'square';
      const durScale = 0.85 + stg * 0.22;

      if (isFaint) {
        this.playTone(baseFreq * 1.15, 0.11 * durScale, wave, 0.10, 0, baseFreq * 0.72);
        this.playTone(baseFreq * 0.72, 0.14 * durScale, wave, 0.09, 0.10 * durScale, baseFreq * 0.42);
        this.playTone(baseFreq * 0.42, 0.22 * durScale, 'triangle', 0.08, 0.22 * durScale, Math.max(65, baseFreq * 0.24));
        return { ok: true, kinId: idNum, element, stage: stg, isFaint: true, baseFreq };
      }

      // 3-part classic handheld formant/vibrato creature cry
      this.playTone(baseFreq, 0.08 * durScale, wave, 0.10, 0, baseFreq * 1.32);
      this.playTone(baseFreq * 1.28, 0.07 * durScale, 'square', 0.09, 0.07 * durScale, baseFreq * 0.92);
      this.playTone(baseFreq * 1.05, 0.15 * durScale, wave, 0.10, 0.13 * durScale, baseFreq * (stg === 3 ? 0.78 : 1.42));
      this.playTone(baseFreq * 0.5, 0.18 * durScale, 'triangle', 0.06, 0.05 * durScale, baseFreq * 0.65);
      return { ok: true, kinId: idNum, element, stage: stg, isFaint: false, baseFreq };
    }

    playElementMoveSfx(element = 'Pyre', isSpecial = false) {
      const el = String(element || 'Pyre');
      if (el === 'Pyre' || el === 'Ember') {
        this.playTone(220, 0.10, 'sawtooth', 0.11, 0, 520);
        this.playTone(440, 0.12, 'square', 0.09, 0.06, 180);
        this.playTone(310, 0.14, 'sawtooth', 0.08, 0.11, 140);
      } else if (el === 'Tide') {
        [360, 480, 620, 520].forEach((f, i) => {
          this.playTone(f, 0.07, 'sine', 0.10, i * 0.045, f * 1.2);
          this.playTone(f * 0.75, 0.07, 'triangle', 0.06, i * 0.045);
        });
      } else if (el === 'Grove') {
        [520, 680, 840].forEach((f, i) => {
          this.playTone(f, 0.055, 'square', 0.09, i * 0.04, f * 0.65);
        });
      } else if (el === 'Volt') {
        [880, 440, 960, 520, 1040].forEach((f, i) => {
          this.playTone(f, 0.045, 'sawtooth', 0.10, i * 0.032, f * 0.8);
        });
      } else if (el === 'Terra') {
        this.playTone(150, 0.14, 'sawtooth', 0.12, 0, 65);
        this.playTone(110, 0.18, 'triangle', 0.12, 0.07, 52);
      } else if (el === 'Frost' || el === 'Cryo') {
        [740, 987.77, 1174.66, 1480].forEach((f, i) => {
          this.playTone(f, 0.08, 'sine', 0.09, i * 0.045);
        });
      } else if (el === 'Gale') {
        this.playTone(340, 0.14, 'triangle', 0.09, 0, 760);
        this.playTone(680, 0.12, 'sine', 0.08, 0.06, 320);
      } else {
        // Solar / Aether / Umbra cosmic resonance
        [440, 554.37, 659.25, 880].forEach((f, i) => {
          this.playTone(f, 0.09, isSpecial ? 'sawtooth' : 'triangle', 0.09, i * 0.05, f * 0.9);
        });
      }
      return { ok: true, element: el, isSpecial: Boolean(isSpecial) };
    }

    playHitImpactSfx(effectiveness = 1.0, isCrit = false) {
      if (isCrit) {
        this.playTone(1046.5, 0.06, 'square', 0.12, 0, 1567.98);
        this.playTone(1318.5, 0.08, 'sawtooth', 0.11, 0.04, 880);
      }
      this.playAttack(effectiveness);
      return {
        ok: true,
        effectiveness,
        isCrit: Boolean(isCrit),
        profile: effectiveness > 1 ? 'super' : effectiveness < 1 ? 'resisted' : 'normal'
      };
    }

    playLowHpBeep() {
      this.playTone(659.25, 0.07, 'square', 0.07, 0);
      this.playTone(523.25, 0.07, 'square', 0.07, 0.09);
      return { ok: true };
    }

    playSnareWobble(step = 1) {
      this.playPrismShake(step);
      return { ok: true, step };
    }

    startBattleBgm(type = 'battle') {
      this.bgmMode = type === 'warden' || type === 'pvp' ? 'warden' : 'battle';
      if (this.muted) return { ok: false, muted: true };
      this.init();
      this.stopBgm();

      const leadNotes = this.bgmMode === 'warden'
        ? [329.63, 392.00, 493.88, 659.25, 587.33, 493.88, 440.00, 392.00, 349.23, 440.00, 523.25, 698.46, 659.25, 523.25, 493.88, 392.00]
        : [330, 392, 440, 330, 493.88, 440, 392, 293.66, 349.23, 440, 523.25, 440, 392, 349.23, 329.63, 293.66];
      const bassNotes = [164.81, 196.00, 146.83, 174.61];
      this.bgmStep = 0;

      this.bgmTimer = setInterval(() => {
        if (this.muted) return;
        const lead = leadNotes[this.bgmStep % leadNotes.length];
        const bass = bassNotes[Math.floor(this.bgmStep / 2) % bassNotes.length];
        this.playTone(lead, 0.13, 'square', 0.032);
        if (this.bgmStep % 2 === 0) {
          this.playTone(bass, 0.19, 'triangle', 0.038);
        }
        this.bgmStep++;
      }, 175);
      return { ok: true, mode: this.bgmMode };
    }

    stopBattleBgm() {
      this.stopBgm();
      if (this.bgmEnabled && !this.muted) {
        this.startBgm('overworld');
      }
      return { ok: true };
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

  const instance = new ChiptuneAudio();
  root.WILDKIN_AUDIO = instance;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = instance;
  }
})(typeof self !== 'undefined' ? self : globalThis);
