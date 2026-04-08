export class TickScheduler {
  private interval: ReturnType<typeof setInterval> | null = null;
  private tickNumber = 0;
  private paused = false;
  private onTick: (tick: number) => Promise<void>;
  private intervalMs: number;

  constructor(intervalMs: number, onTick: (tick: number) => Promise<void>) {
    this.intervalMs = intervalMs;
    this.onTick = onTick;
  }

  start(): void {
    if (this.interval) return;
    this.interval = setInterval(async () => {
      if (this.paused) return;
      this.tickNumber++;
      try { await this.onTick(this.tickNumber); } catch (err) { console.error('Tick error:', err); }
    }, this.intervalMs);
  }

  stop(): void {
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
  }

  pause(): void { this.paused = true; }
  resume(): void { this.paused = false; }
  getTickNumber(): number { return this.tickNumber; }
  isRunning(): boolean { return this.interval !== null && !this.paused; }
}
