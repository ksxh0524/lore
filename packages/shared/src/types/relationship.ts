export type RelationshipType =
  | 'stranger'
  | 'acquaintance'
  | 'friend'
  | 'close_friend'
  | 'partner'
  | 'ex'
  | 'enemy'
  | 'rival'
  | 'family'
  | 'colleague'
  | 'boss'
  | 'subordinate';

export interface Relationship {
  agentId: string;
  targetAgentId: string;
  worldId: string;
  type: RelationshipType;
  intimacy: number;
  history: string[];
  updatedAt: Date;
}
