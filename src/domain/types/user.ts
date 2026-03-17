/**
 * User Domain Types
 *
 * Defines the events, aggregates, and commands for user-related operations.
 * This follows the Event Sourcing pattern where events represent what happened.
 */

// ============================================================================
// USER AGGREGATE (Current State)
// ============================================================================
export type UserAgg = {
  email: string
  username: string
  provider: 'email' | 'google' | 'apple'
  providerId?: string
  emailVerified: boolean
  isActive: boolean
  isBanned: boolean
  banReason?: string
  role: 'user' | 'admin'
  referralCode: string
  referredBy?: string
  referralEarnings: number
  kycVerified: boolean
  ninVerified: boolean
  // Profile fields referenced in events and commands
  profilePicture?: string
  phoneNumber?: string
  country?: string
  dateOfBirth?: Date
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// USER EVENTS (What happened)
// ============================================================================
export type UserEvt =
  // User creation events
  | { type: 'user-created'; email: string; username: string; password: string; referralCode: string }
  | { type: 'user-created-oauth'; email: string; username: string; provider: 'google' | 'apple'; providerId: string }

  // User profile events
  | { type: 'user-verified'; email: string }
  | { type: 'profile-updated'; fields: Partial<Pick<UserAgg, 'username' | 'profilePicture' | 'phoneNumber' | 'country' | 'dateOfBirth'>> }

  // Wallet events
  | { type: 'wallet-linked'; walletAddress: string; walletType: 'phantom' | 'solflare' }

  // KYC events
  | { type: 'kyc-submitted'; documentType: 'nin' | 'passport' | 'driving-license' }
  | { type: 'kyc-approved'; verifiedBy?: string }
  | { type: 'kyc-rejected'; reason: string }

  // Referral events
  | { type: 'referral-used'; referralCode: string; newUserId: string }
  | { type: 'referral-earned'; amount: number; sourceUserId: string }

  // Admin events
  | { type: 'user-banned'; reason: string; bannedBy: string }
  | { type: 'user-unbanned'; unbannedBy: string }
  | { type: 'role-changed'; newRole: 'admin' | 'user'; changedBy: string }

  // User activity events
  | { type: 'user-deactivated' }
  | { type: 'user-reactivated' }

// ============================================================================
// USER COMMANDS (Actions to take)
// ============================================================================
export type UserCmd =
  | { type: 'create-user'; email: string; username: string; password: string; referralCode?: string }
  | { type: 'create-user-oauth'; email: string; username: string; provider: 'google' | 'apple'; providerId: string }
  | { type: 'verify-email' }
  | { type: 'update-profile'; updates: Partial<Pick<UserAgg, 'username' | 'profilePicture' | 'phoneNumber' | 'country' | 'dateOfBirth'>> }
  | { type: 'link-wallet'; walletAddress: string; walletType?: 'phantom' | 'solflare' }
  | { type: 'submit-kyc'; documentType: 'nin' | 'passport' | 'driving-license'; documentUrls: { idDocument?: string; selfie?: string; proofOfAddress?: string } }
  | { type: 'approve-kyc'; verifiedBy?: string }
  | { type: 'reject-kyc'; reason: string }
  | { type: 'use-referral'; referralCode: string; newUserId: string }
  | { type: 'ban-user'; reason: string; bannedBy: string }
  | { type: 'unban-user'; unbannedBy: string }
  | { type: 'change-role'; newRole: 'admin' | 'user'; changedBy: string }
  | { type: 'deactivate-user' }
  | { type: 'reactivate-user' }
