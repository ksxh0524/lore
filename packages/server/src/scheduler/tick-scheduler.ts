export class TickScheduler {
  private interval: ReturnType<typeof setInterval> | null = null;
  private tickNumber = 0;
  private paused = false;
  private onTick: (tick: number) => Promise<void>;
  private intervalMs: number;
  private timeoutMs: number;
  private lastTickDuration = 0;

  constructor(intervalMs: number, onTick: (tick: number) => Promise<void>, timeoutMs?: number) {
    this.intervalMs = intervalMs;
    this.onTick = onTick;
    // Default timeout: 80% of interval, leaving buffer for next tick
    this.timeoutMs = timeoutMs ?? Math.floor(intervalMs * 0.8);
  }

  start(): void {
    if (this.interval) return;
    this.interval = setInterval(async () => {
      if (this.paused) return;
      this.tickNumber++;
      
      const startTime = Date.now();
      try {
        // Timeout protection: force finish if tick takes too long
        const timeoutPromise = new Promise<void>((_, reject) => 
          setTimeout(() => reject(new Error(`Tick ${this.tickNumber} timeout after ${this.timeoutMs}ms`)), this.timeoutMs)
        );
        
        await Promise.race([this.onTick(this.tickNumber), timeoutPromise]);
        
        this.lastTickDuration = Date.now() - startTime;
        
        // Warn if tick took > 50% of interval
        if (this.lastTickDuration > this.intervalMs * 0.5) {
          console.warn(`⚠️  Tick ${this.tickNumber} took ${this.lastTickDuration}ms (> 50% of ${this.intervalMs}ms interval)`);
        }
      } catch (err) {
        console.error(`Tick ${this.tickNumber} error:`, err);
        this.lastTickDuration = Date.now() - startTime;
      }
    }, this.intervalMs);
  }

  stop(): void {
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
  }

  pause(): void { this.paused = true; }
  resume(): void { this.paused = false; }
  getTickNumber(): number { return this.tickNumber; }
  getLastTickDuration(): number { return this.lastTickDuration; }
  isRunning(): boolean { return this.interval !== null && !this.paused; }
}
