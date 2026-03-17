/**
 User Aggregate
  Defines how User state is built from events.
  The fold function applies events to update the aggregate state.
 */

import { createAggregate } from '@evtstore/src/create-aggregate'
import type { UserEvt, UserAgg } from '../types/user'

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
  fold: (evt: UserEvt) => {
    switch (evt.type) {
      // User creation
      case "user-created":
        return {
          email: evt.email,
          username: evt.username,
          provider: "email",
          emailVerified: false,
          isActive: true,
          isBanned: false,
          role: "user",
          referralCode: evt.referralCode,
          referralEarnings: 0,
          kycVerified: false,
          ninVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

      case "user-created-oauth":
        return {
          email: evt.email,
          username: evt.username,
          provider: evt.provider,
          providerId: evt.providerId,
          emailVerified: true, // OAuth emails are pre-verified
          isActive: true,
          isBanned: false,
          role: "user",
          referralCode: "",
          referralEarnings: 0,
          kycVerified: false,
          ninVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

      // Email verification
      case "user-verified":
        return {
          emailVerified: true,
          updatedAt: new Date(),
        };

      // Profile updates
      case "profile-updated":
        return {
          ...evt.fields,
          updatedAt: new Date(),
        };

      // Wallet linking
      case "wallet-linked":
        // This would update a wallet field in the aggregate
        return {
          updatedAt: new Date(),
        };

      // KYC events
      case "kyc-submitted":
        return {
          updatedAt: new Date(),
        };

      case "kyc-approved":
        return {
          kycVerified: true,
          updatedAt: new Date(),
        };

      case "kyc-rejected":
        return {
          kycVerified: false,
          updatedAt: new Date(),
        };

      // Referral events
      case "referral-used":
        return {
          referredBy: evt.referralCode,
          updatedAt: new Date(),
        };

      case "referral-earned":
        return {
          referralEarnings: evt.amount,
          updatedAt: new Date(),
        };

      // Admin events
      case "user-banned":
        return {
          isBanned: true,
          banReason: evt.reason,
          isActive: false,
          updatedAt: new Date(),
        };

      case "user-unbanned":
        return {
          isBanned: false,
          banReason: undefined,
          isActive: true,
          updatedAt: new Date(),
        };

      case "role-changed":
        return {
          role: evt.newRole,
          updatedAt: new Date(),
        };

      // User activity
      case "user-deactivated":
        return {
          isActive: false,
          updatedAt: new Date(),
        };

      case "user-reactivated":
        return {
          isActive: true,
          updatedAt: new Date(),
        };

      default:
        return {};
    }
  },
});
