/**
 * User Command Handlers
 *
 * Command handlers validate business rules and produce events.
 * They ensure business invariants are maintained.
 */

import { createCommands } from '@evtstore/src/create-command'
import type { BaseAggregate, ProvidedAggregate } from '@evtstore/src/types'
import type { UserEvt, UserAgg, UserCmd } from '../types/user'

// Type alias for the full aggregate with base properties
export type UserAggregate = UserAgg & BaseAggregate

/**
 * Create user command handlers
 *
 * This function creates the command handlers for user operations.
 * Each command validates business rules and returns events or throws errors.
 */
export function createUserCommands(userAggregate: ProvidedAggregate<UserEvt, UserAgg>) {
  return createCommands<UserEvt, UserAgg, UserCmd>(userAggregate, {
    // Create a new user with email/password
    'create-user': async (cmd, agg) => {
      // Business rule: User cannot already exist
      if (agg.version > 0) {
        throw new Error('User already exists')
      }

      // Business rule: Email must be valid (basic validation)
      if (!cmd.email || !cmd.email.includes('@')) {
        throw new Error('Invalid email address')
      }

      // Business rule: Username must meet requirements
      if (!cmd.username || cmd.username.length < 3 || cmd.username.length > 30) {
        throw new Error('Username must be between 3 and 30 characters')
      }

      // Emit user-created event
      // Note: Password handling is done at the route level, not in events
      return {
        type: 'user-created',
        email: cmd.email,
        username: cmd.username,
        referralCode: cmd.referralCode || generateReferralCode(),
      }
    },

    // Create user with OAuth
    'create-user-oauth': async (cmd, agg) => {
      if (agg.version > 0) {
        throw new Error('User already exists')
      }

      if (!cmd.email || !cmd.email.includes('@')) {
        throw new Error('Invalid email address')
      }

      // Generate unique username with timestamp to avoid collisions
      // Format: {email_prefix}_{provider}_{timestamp} where provider is 'g' for Google, 'a' for Apple, 'o' for other
      const baseUsername = cmd.email.split('@')[0]
      const timestamp = Date.now().toString(36)
      const providerSuffix = cmd.provider === 'google' ? 'g' : cmd.provider === 'apple' ? 'a' : 'o'
      const username = `${baseUsername}_${providerSuffix}_${timestamp}`

      return {
        type: 'user-created-oauth',
        email: cmd.email,
        username: username, // Use the generated unique username
        provider: cmd.provider,
        providerId: cmd.providerId,
      }
    },

    // Verify email
    'verify-email': async (_cmd, agg) => {
      if (!agg.emailVerified) {
        return { type: 'user-verified', email: agg.email }
      }
      // No change needed
      return
    },

    // Update profile
    'update-profile': async (cmd, agg) => {
      // Validate username if being updated
      if (cmd.updates.username !== undefined) {
        if (cmd.updates.username.length < 3 || cmd.updates.username.length > 30) {
          throw new Error('Username must be between 3 and 30 characters')
        }
      }

      return {
        type: 'profile-updated',
        fields: cmd.updates,
      }
    },

    // Link wallet
    'link-wallet': async (cmd, _agg) => {
      if (!cmd.walletAddress || cmd.walletAddress.length < 32) {
        throw new Error('Invalid wallet address')
      }

      return {
        type: 'wallet-linked',
        walletAddress: cmd.walletAddress,
        walletType: cmd.walletType || 'phantom',
      }
    },

    // Submit KYC
    'submit-kyc': async (cmd, _agg) => {
      if (_agg.kycVerified) {
        throw new Error('KYC already verified')
      }

      if (!cmd.documentUrls.idDocument && !cmd.documentUrls.selfie) {
        throw new Error('At least one document is required')
      }

      return {
        type: 'kyc-submitted',
        documentType: cmd.documentType,
      }
    },

    // Approve KYC (admin only)
    'approve-kyc': async (cmd, agg) => {
      if (agg.kycVerified) {
        return // Already verified
      }

      return {
        type: 'kyc-approved',
        verifiedBy: cmd.verifiedBy,
      }
    },

    // Reject KYC (admin only)
    'reject-kyc': async (cmd, agg) => {
      if (!cmd.reason || cmd.reason.trim().length === 0) {
        throw new Error('Rejection reason is required')
      }

      return {
        type: 'kyc-rejected',
        reason: cmd.reason,
      }
    },

    // Use referral code
    'use-referral': async (cmd, agg) => {
      if (agg.referredBy) {
        throw new Error('Referral already used')
      }

      if (!cmd.referralCode || cmd.referralCode.length < 4) {
        throw new Error('Invalid referral code')
      }

      return {
        type: 'referral-used',
        referralCode: cmd.referralCode,
        newUserId: cmd.newUserId,
      }
    },

    // Ban user (admin only)
    'ban-user': async (cmd, agg) => {
      if (agg.isBanned) {
        throw new Error('User is already banned')
      }

      if (!cmd.reason || cmd.reason.trim().length === 0) {
        throw new Error('Ban reason is required')
      }

      return {
        type: 'user-banned',
        reason: cmd.reason,
        bannedBy: cmd.bannedBy,
      }
    },

    // Unban user (admin only)
    'unban-user': async (cmd, agg) => {
      if (!agg.isBanned) {
        throw new Error('User is not banned')
      }

      return {
        type: 'user-unbanned',
        unbannedBy: cmd.unbannedBy,
      }
    },

    // Change user role (admin only)
    'change-role': async (cmd, agg) => {
      if (agg.role === cmd.newRole) {
        return // No change needed
      }

      if (!['admin', 'user'].includes(cmd.newRole)) {
        throw new Error('Invalid role')
      }

      return {
        type: 'role-changed',
        newRole: cmd.newRole,
        changedBy: cmd.changedBy,
      }
    },

    // Deactivate user
    'deactivate-user': async (_cmd, agg) => {
      if (!agg.isActive) {
        throw new Error('User is already deactivated')
      }

      return { type: 'user-deactivated' }
    },

    // Reactivate user
    'reactivate-user': async (_cmd, agg) => {
      if (agg.isActive) {
        throw new Error('User is already active')
      }

      return { type: 'user-reactivated' }
    },
  })
}

/**
 * Generate a random referral code
 */
function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
