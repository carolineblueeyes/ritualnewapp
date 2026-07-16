// Real-time procedural audio synthesis using Web Audio API for the Ritual application
// Adheres strictly to the "Единый звуковой стандарт Ritual" defined in the document.

class AudioEngine {
  private ctx: AudioContext | null = null;
  private primaryGain: GainNode | null = null;
  private breatheGain: GainNode | null = null;
  
  // Oscillators and sources for the active soundscape
  private leftOsc: OscillatorNode | null = null;
  private rightOsc: OscillatorNode | null = null;
  private leftChannelGain: GainNode | null = null;
  private rightChannelGain: GainNode | null = null;
  private isochronicGain: GainNode | null = null;
  private isochronicOsc: OscillatorNode | null = null;
  private humOsc: OscillatorNode | null = null;
  private humGain: GainNode | null = null;
  private noiseNode: AudioWorkletNode | ScriptProcessorNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private crackleInterval: any = null;

  // Breathing generator nodes
  private breatheNoise: ScriptProcessorNode | null = null;
  private breatheFilter: BiquadFilterNode | null = null;
  private breatheEnv: GainNode | null = null;

  private isMuted: boolean = false;
  private currentVolume: number = 0.7; // 0.0 to 1.0

  constructor() {
    // Lazy initialized on user interaction
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      
      // Master volume gain
      this.primaryGain = this.ctx.createGain();
      this.primaryGain.gain.setValueAtTime(this.isMuted ? 0 : this.currentVolume, this.ctx.currentTime);
      this.primaryGain.connect(this.ctx.destination);

      // Breathing layer volume gain
      this.breatheGain = this.ctx.createGain();
      this.breatheGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      this.breatheGain.connect(this.primaryGain);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.primaryGain && this.ctx) {
      this.primaryGain.gain.setValueAtTime(muted ? 0 : this.currentVolume, this.ctx.currentTime);
    }
  }

  public setVolume(vol: number) {
    // vol is 0 to 100
    this.currentVolume = vol / 100;
    if (this.primaryGain && this.ctx && !this.isMuted) {
      this.primaryGain.gain.setValueAtTime(this.currentVolume, this.ctx.currentTime);
    }
  }

  public stopAll() {
    this.stopSoundscape();
    this.stopBreathing();
  }

  // ─── Procedural Soundscape Generator ───
  public playSoundscape(id: string) {
    this.initCtx();
    this.stopSoundscape(); // clear any running sound

    if (!this.ctx || !this.primaryGain) return;

    const t = this.ctx.currentTime;

    // Define parameters based on the 10 document presets
    let carrierHz = 100; // Base hum frequency
    let beatHz = 0;      // Binaural beat frequency (Difference between Left and Right)
    let pulseHz = 0;     // Isochronic pulse frequency
    let noiseType: 'white' | 'pink' | 'none' = 'none';
    let filterHz = 400;
    let addCrackle = false;
    let waveMod = false;  // Ocean wave simulation

    switch (id) {
      case 'focus': // Сосредоточиться: гул 40 Гц + изохронные тоны 14 Гц + бинауральные биения 14 Гц
        carrierHz = 40;
        beatHz = 14;
        pulseHz = 14;
        break;
      case 'flow': // Поток: гул 50 Гц + изохронные тоны 18 Гц + бинауральные биения 16 Гц (river/water noise)
        carrierHz = 50;
        beatHz = 16;
        pulseHz = 18;
        noiseType = 'pink';
        filterHz = 300;
        waveMod = true;
        break;
      case 'relax': // Снять напряжение: гул 40 Гц + изохронные тоны 10 Гц + бинауральные биения 8 Гц
        carrierHz = 40;
        beatHz = 8;
        pulseHz = 10;
        noiseType = 'pink';
        filterHz = 200;
        break;
      case 'sleep_prep': // Подготовка ко сну: гул 30 Гц + изохронные тоны 6 Гц + бинауральные биения 4 Гц
        carrierHz = 30;
        beatHz = 4;
        pulseHz = 6;
        noiseType = 'pink';
        filterHz = 150;
        waveMod = true;
        break;
      case 'candle': // Свеча: треск свечи, без частот
        addCrackle = true;
        break;
      case 'wakeup': // Пробуждение: гул 50 Гц + изохронные тоны 18 Гц + бинауральные биения 16 Гц
        carrierHz = 50;
        beatHz = 16;
        pulseHz = 18;
        noiseType = 'white';
        filterHz = 600;
        break;
      case 'recover': // Восстановиться: гул 35 Гц + изохронные тоны 6 Гц + бинауральные биения 5 Гц
        carrierHz = 35;
        beatHz = 5;
        pulseHz = 6;
        noiseType = 'pink';
        filterHz = 250;
        waveMod = true;
        break;
      case 'ideas': // Поток идей: гул 45 Гц + изохронные тоны 10 Гц + бинауральные биения 10 Гц
        carrierHz = 45;
        beatHz = 10;
        pulseHz = 10;
        noiseType = 'pink';
        filterHz = 400;
        break;
      case 'whitenoise': // Белый шум
        noiseType = 'white';
        filterHz = 500;
        break;
      case 'nature': // Природный покой: пение птиц / шелест листвы (simulated via filtered noise waves)
        carrierHz = 80;
        pulseHz = 2;
        noiseType = 'pink';
        filterHz = 350;
        waveMod = true;
        break;
    }

    // 1. Build Base Hum (Carrier)
    if (carrierHz > 0) {
      this.humOsc = this.ctx.createOscillator();
      this.humGain = this.ctx.createGain();
      this.humOsc.type = 'sine';
      this.humOsc.frequency.setValueAtTime(carrierHz, t);
      this.humGain.gain.setValueAtTime(0.2, t);
      
      this.humOsc.connect(this.humGain);
      this.humGain.connect(this.primaryGain);
      this.humOsc.start(t);
    }

    // 2. Build Binaural Beats (Left & Right isolated channels)
    if (beatHz > 0) {
      this.leftOsc = this.ctx.createOscillator();
      this.rightOsc = this.ctx.createOscillator();
      this.leftChannelGain = this.ctx.createGain();
      this.rightChannelGain = this.ctx.createGain();

      const pannerLeft = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      const pannerRight = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

      this.leftOsc.type = 'sine';
      this.leftOsc.frequency.setValueAtTime(carrierHz + 100, t);
      this.rightOsc.type = 'sine';
      this.rightOsc.frequency.setValueAtTime(carrierHz + 100 + beatHz, t);

      this.leftChannelGain.gain.setValueAtTime(0.12, t);
      this.rightChannelGain.gain.setValueAtTime(0.12, t);

      if (pannerLeft && pannerRight) {
        pannerLeft.pan.setValueAtTime(-1.0, t);
        pannerRight.pan.setValueAtTime(1.0, t);

        this.leftOsc.connect(this.leftChannelGain);
        this.leftChannelGain.connect(pannerLeft);
        pannerLeft.connect(this.primaryGain);

        this.rightOsc.connect(this.rightChannelGain);
        this.rightChannelGain.connect(pannerRight);
        pannerRight.connect(this.primaryGain);
      } else {
        // Fallback if Panner is not supported
        this.leftOsc.connect(this.leftChannelGain);
        this.leftChannelGain.connect(this.primaryGain);
        this.rightOsc.connect(this.rightChannelGain);
        this.rightChannelGain.connect(this.primaryGain);
      }

      this.leftOsc.start(t);
      this.rightOsc.start(t);
    }

    // 3. Build Isochronic Pulse LFO modulation
    if (pulseHz > 0) {
      this.isochronicGain = this.ctx.createGain();
      this.isochronicGain.gain.setValueAtTime(0.4, t);
      
      // We will modulate the master or left/right gain with a tremolo effect
      this.isochronicOsc = this.ctx.createOscillator();
      this.isochronicOsc.type = 'triangle';
      this.isochronicOsc.frequency.setValueAtTime(pulseHz, t);

      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(0.25, t); // Depth of pulse tremolo

      this.isochronicOsc.connect(lfoGain);
      if (this.leftChannelGain && this.rightChannelGain) {
        lfoGain.connect(this.leftChannelGain.gain);
        lfoGain.connect(this.rightChannelGain.gain);
      } else if (this.humGain) {
        lfoGain.connect(this.humGain.gain);
      }
      
      this.isochronicOsc.start(t);
    }

    // 4. Noise layers (Rain, sea, wind, white/pink noise)
    if (noiseType !== 'none') {
      const bufferSize = 2 * this.ctx.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      if (noiseType === 'white') {
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
      } else {
        // Pink noise approximation
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          output[i] *= 0.11; // normalise
          b6 = white * 0.115926;
        }
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      this.noiseFilter = this.ctx.createBiquadFilter();
      this.noiseFilter.type = 'lowpass';
      this.noiseFilter.frequency.setValueAtTime(filterHz, t);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(waveMod ? 0.08 : 0.04, t);

      noiseSource.connect(this.noiseFilter);
      this.noiseFilter.connect(noiseGain);
      noiseGain.connect(this.primaryGain);

      noiseSource.start(t);
      this.noiseNode = noiseSource as any;

      // Connect wave modulation (slow swelling LFO)
      if (waveMod) {
        const waveLfo = this.ctx.createOscillator();
        waveLfo.type = 'sine';
        waveLfo.frequency.setValueAtTime(0.08, t); // Slow 12-second ocean wave cycles

        const waveLfoGain = this.ctx.createGain();
        waveLfoGain.gain.setValueAtTime(0.04, t);

        waveLfo.connect(waveLfoGain);
        waveLfoGain.connect(noiseGain.gain);
        waveLfo.start(t);

        // Keep reference in order to stop them
        (this as any).waveLfo = waveLfo;
      }
    }

    // 5. Candle crackles (Random popping pulses)
    if (addCrackle) {
      this.crackleInterval = setInterval(() => {
        if (!this.ctx || !this.primaryGain || Math.random() > 0.35) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300 + Math.random() * 2000, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(0.005 + Math.random() * 0.012, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.04);
        
        osc.connect(gain);
        gain.connect(this.primaryGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
      }, 80);
    }
  }

  private stopSoundscape() {
    if (this.leftOsc) { try { this.leftOsc.stop(); } catch(e){} this.leftOsc = null; }
    if (this.rightOsc) { try { this.rightOsc.stop(); } catch(e){} this.rightOsc = null; }
    if (this.isochronicOsc) { try { this.isochronicOsc.stop(); } catch(e){} this.isochronicOsc = null; }
    if (this.humOsc) { try { this.humOsc.stop(); } catch(e){} this.humOsc = null; }
    if (this.noiseNode) { try { (this.noiseNode as any).stop(); } catch(e){} this.noiseNode = null; }
    if ((this as any).waveLfo) { try { (this as any).waveLfo.stop(); } catch(e){} (this as any).waveLfo = null; }
    if (this.crackleInterval) { clearInterval(this.crackleInterval); this.crackleInterval = null; }
  }

  // ─── Procedural Breathing Guidance Sound ───
  public startBreathing() {
    this.initCtx();
    this.stopBreathing();

    if (!this.ctx || !this.breatheGain) return;

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    this.breatheFilter = this.ctx.createBiquadFilter();
    this.breatheFilter.type = 'lowpass';
    this.breatheFilter.frequency.setValueAtTime(200, this.ctx.currentTime);

    this.breatheEnv = this.ctx.createGain();
    this.breatheEnv.gain.setValueAtTime(0.001, this.ctx.currentTime);

    source.connect(this.breatheFilter);
    this.breatheFilter.connect(this.breatheEnv);
    this.breatheEnv.connect(this.breatheGain);

    source.start();
    this.breatheNoise = source as any;
  }

  public setBreathingPhase(phase: 'inhale' | 'hold' | 'exhale' | 'holdEmpty', duration: number) {
    if (!this.ctx || !this.breatheEnv || !this.breatheFilter) return;

    const t = this.ctx.currentTime;
    
    // Smoothly adjust breathing volume and filter cutoff depending on phase
    if (phase === 'inhale') {
      // Swell volume and open filter cutoff
      this.breatheEnv.gain.cancelScheduledValues(t);
      this.breatheEnv.gain.linearRampToValueAtTime(0.18, t + duration);

      this.breatheFilter.frequency.cancelScheduledValues(t);
      this.breatheFilter.frequency.exponentialRampToValueAtTime(650, t + duration);
    } else if (phase === 'hold') {
      // Hold high static air cushion
      this.breatheEnv.gain.cancelScheduledValues(t);
      this.breatheEnv.gain.linearRampToValueAtTime(0.08, t + 0.3);

      this.breatheFilter.frequency.cancelScheduledValues(t);
      this.breatheFilter.frequency.linearRampToValueAtTime(450, t + 0.3);
    } else if (phase === 'exhale') {
      // Soft whispering release
      this.breatheEnv.gain.cancelScheduledValues(t);
      this.breatheEnv.gain.linearRampToValueAtTime(0.005, t + duration);

      this.breatheFilter.frequency.cancelScheduledValues(t);
      this.breatheFilter.frequency.exponentialRampToValueAtTime(150, t + duration);
    } else {
      // Quiet holdEmpty
      this.breatheEnv.gain.cancelScheduledValues(t);
      this.breatheEnv.gain.linearRampToValueAtTime(0.001, t + duration);

      this.breatheFilter.frequency.cancelScheduledValues(t);
      this.breatheFilter.frequency.linearRampToValueAtTime(100, t + duration);
    }
  }

  private stopBreathing() {
    if (this.breatheNoise) {
      try { this.breatheNoise.disconnect(); } catch(e){}
      this.breatheNoise = null;
    }
  }

  // ─── Play Crystal / Bell Final Chord chime ───
  public playFinalChime() {
    this.initCtx();
    if (!this.ctx || !this.primaryGain) return;

    const t = this.ctx.currentTime;
    
    // Synthesis of a rich crystalline chime (Tibetan singing bowl approximation)
    const partials = [1.0, 1.5, 2.0, 2.61, 3.1, 4.2];
    const baseFreq = 800; // 800 Hz to 1200 Hz standard crystal chime

    partials.forEach((mult, index) => {
      if (!this.ctx || !this.primaryGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = index === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(baseFreq * mult, t);

      // Main strike envelope with long tail
      const attack = 0.01;
      const decay = 2.5 + index * 0.4; // higher partials ring differently
      const volume = 0.08 / (index + 1);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(volume, t + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);

      osc.connect(gain);
      gain.connect(this.primaryGain);
      osc.start(t);
      osc.stop(t + attack + decay + 0.1);
    });
  }
}

export const audioEngine = new AudioEngine();
