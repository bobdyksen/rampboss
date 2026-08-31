export class Sfx {
  private ctx: AudioContext | null = null;
  enabled = true;

  private audio(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  tone(freq: number, duration = 0.12, type: OscillatorType = "square", gain = 0.04): void {
    if (!this.enabled) return;
    const ctx = this.audio();
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(gain, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  dispatch(): void {
    this.tone(420, 0.08, "triangle", 0.05);
    this.tone(620, 0.1, "triangle", 0.03);
  }

  complete(): void {
    this.tone(520, 0.08);
    setTimeout(() => this.tone(740, 0.12), 70);
  }

  depart(): void {
    this.tone(360, 0.1, "sawtooth", 0.03);
    setTimeout(() => this.tone(540, 0.12, "square", 0.04), 80);
    setTimeout(() => this.tone(720, 0.16, "square", 0.05), 160);
  }

  warning(): void {
    this.tone(180, 0.18, "square", 0.05);
  }

  perfect(): void {
    [523, 659, 784, 1046].forEach((freq, i) => {
      setTimeout(() => this.tone(freq, 0.14, "triangle", 0.05), i * 90);
    });
  }
}
