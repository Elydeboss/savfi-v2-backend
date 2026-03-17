/**
 User Aggregate
  Defines how User state is built from events.
  The fold function applies events to update the aggregate state.
 */

import { createAggregate } from '@evtstore/src/create-aggregate'
import type { UserEvt, UserAgg } from '../types/user'
import type { EventMeta, BaseAggregate } from '@evtstore/src/types'

export const user = createAggregate<UserEvt, UserAgg, "user">({
  stream: "user",

  // Initial state for a new user
  create: () => ({
    email: "",
    username: "",
    provider: "email",
    providerId: undefined,
    emailVerified: false,
    isActive: true,
    isBanned: false,
    banReason: undefined,
    role: "user",
    referralCode: "",
    referredBy: undefined,
    referralEarnings: 0,
    kycVerified: false,
    ninVerified: false,
    profilePicture: undefined,
    phoneNumber: undefined,
    country: undefined,
    dateOfBirth: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),

  // Fold function: apply events to update state
  fold: (evt: UserEvt, agg: UserAgg & BaseAggregate, meta: EventMeta) => {
    switch (evt.type) {
      // User creation
      case "user-created":
        return {
          email: evt.email,
          username: evt.username,
          referralCode: evt.referralCode,
          createdAt: meta.timestamp,
          updatedAt: meta.timestamp,
        };

      case "user-created-oauth":
        return {
          email: evt.email,
          username: evt.username,
          provider: evt.provider,
          providerId: evt.providerId,
          emailVerified: true, // OAuth emails are pre-verified
          referralCode: agg.referralCode || "",
          createdAt: meta.timestamp,
          updatedAt: meta.timestamp,
        };

      // Email verification
      case "user-verified":
        return {
          emailVerified: true,
          updatedAt: meta.timestamp,
        };

      // Profile updates
      case "profile-updated":
        return {
          ...evt.fields,
          updatedAt: meta.timestamp,
        };

      // Wallet linking
      case "wallet-linked":
        return {
          walletAddress: evt.walletAddress,
          walletType: evt.walletType,
          updatedAt: meta.timestamp,
        };

      // KYC events
      case "kyc-submitted":
        return {
          updatedAt: meta.timestamp,
        };

      case "kyc-approved":
        return {
          kycVerified: true,
          updatedAt: meta.timestamp,
        };

      case "kyc-rejected":
        return {
          kycVerified: false,
          updatedAt: meta.timestamp,
        };

      // Referral events
      case "referral-used":
        return {
          referredBy: evt.referralCode,
          updatedAt: meta.timestamp,
        };

      case "referral-earned":
        return {
          referralEarnings: agg.referralEarnings + evt.amount,
          updatedAt: meta.timestamp,
        };

      // Admin events
      case "user-banned":
        return {
          isBanned: true,
          banReason: evt.reason,
          isActive: false,
          updatedAt: meta.timestamp,
        };

      case "user-unbanned":
        return {
          isBanned: false,
          banReason: undefined,
          isActive: true,
          updatedAt: meta.timestamp,
        };

      case "role-changed":
        return {
          role: evt.newRole,
          updatedAt: meta.timestamp,
        };

      // User activity
      case "user-deactivated":
        return {
          isActive: false,
          updatedAt: meta.timestamp,
        };

      case "user-reactivated":
        return {
          isActive: true,
          updatedAt: meta.timestamp,
        };

      default:
        return {};
    }
  },
});
