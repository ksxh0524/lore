export class WorldClock {
  private worldTime: Date;
  private timeSpeed: number;

  constructor(startTime: Date, timeSpeed = 1) {
    this.worldTime = startTime;
    this.timeSpeed = timeSpeed;
  }

  advance(tickIntervalMs: number): void {
    this.worldTime = new Date(this.worldTime.getTime() + tickIntervalMs * this.timeSpeed);
  }

  getTime(): Date { return this.worldTime; }
  getDay(): number { return Math.floor(this.worldTime.getTime() / (1000 * 60 * 60 * 24)); }
  setTimeSpeed(speed: number): void { this.timeSpeed = Math.max(0.1, Math.min(100, speed)); }
  getTimeSpeed(): number { return this.timeSpeed; }
}
