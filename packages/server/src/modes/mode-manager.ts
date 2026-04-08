import type { ControlMode } from '@lore/shared';

export interface IPlayerMode {
  readonly mode: ControlMode;
  filterEvents(events: any[]): any[];
  isActionAllowed(action: string): boolean;
}

export class CharacterMode implements IPlayerMode {
  readonly mode: ControlMode = 'character';
  filterEvents(events: any[]): any[] {
    return events.filter(e => (e.priority ?? 50) >= 30 || (e.involvedAgents ?? []).includes('user'));
  }
  isActionAllowed(action: string): boolean {
    return ['chat', 'post', 'like', 'comment', 'pause', 'resume'].includes(action);
  }
}

export class GodMode implements IPlayerMode {
  readonly mode: ControlMode = 'god';
  filterEvents(events: any[]): any[] { return events; }
  isActionAllowed(_action: string): boolean { return true; }
}

export class ModeManager {
  private current: IPlayerMode = new CharacterMode();

  getHandler(): IPlayerMode { return this.current; }
  getMode(): ControlMode { return this.current.mode; }
  isGodMode(): boolean { return this.current.mode === 'god'; }

  async switchMode(mode: ControlMode): Promise<void> {
    this.current = mode === 'god' ? new GodMode() : new CharacterMode();
  }
}
