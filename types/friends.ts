// ============================================
// FRIENDS TYPES & INTERFACES
// ============================================

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined';

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserCode: string;
  toUserId: string;
  toUserName: string;
  toUserCode: string;
  status: FriendRequestStatus;
  createdAt: number;
  updatedAt: number;
}

export interface Friend {
  odUserId: string;
  displayName: string;
  friendCode: string;
  addedAt: number;
}

// For creating a new friend request
export type CreateFriendRequest = Omit<FriendRequest, 'id' | 'createdAt' | 'updatedAt'>;

// Friend code configuration
export const FRIEND_CODE_CONFIG = {
  // Character set excluding confusing chars: 0/O, 1/I/L
  CHARSET: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  LENGTH: 6,
  MAX_GENERATION_ATTEMPTS: 10,
  MAX_FRIENDS: 100,
} as const;
