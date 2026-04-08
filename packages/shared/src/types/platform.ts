export interface PlatformPost {
  id: string;
  platformId: string;
  worldId: string;
  authorId: string;
  authorType: 'agent' | 'user';
  content: string;
  imageUrl?: string;
  likes: number;
  comments: number;
  views: number;
  timestamp: Date;
}
