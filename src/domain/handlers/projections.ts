/**
These handlers listen to events and update the read models (MongoDB collections).
 This keeps my existing Mongoose models in sync with the event store.
 */

import { createHandler } from "@evtstore/src/create-handler";
import type { UserEvt } from "../types/user";
import type { SavingsEvt } from "../types/savings";

// Import your Mongoose models (read models)
import User from "../../models/User";
import SavingsPlan from "../../models/SavingsPlan";
import bcrypt from "bcryptjs";

/**
 Create user projection handler
 
  This handler listens to user events and updates the User collection.
 */
export async function createUserProjectionHandler() {
  const { getDomain } = await import("../domain");
  const domainResult = await getDomain();
  const { createHandler } = domainResult;

  const userProjection = createHandler("user-projection", ["user"], {
    alwaysTailStream: false,
    continueOnError: true, // Continue even if one event fails
    tailStream: false,
  });

  // Handle user creation
  userProjection.handle(
    "user",
    "user-created",
    async (id: string, evt: Extract<UserEvt, { type: "user-created" }>) => {
      // Note: Password is no longer included in events for security
      // Password hashing should be handled at the route/controller level
      await User.findOneAndUpdate(
        { _id: id },
        {
          _id: id,
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
        },
        { upsert: true, new: true },
      );

      console.log(`User projection updated: ${evt.email}`);
    },
  );

  // Handle OAuth user creation
  userProjection.handle(
    "user",
    "user-created-oauth",
    async (
      id: string,
      evt: Extract<UserEvt, { type: "user-created-oauth" }>,
    ) => {
      const profileData =
        evt.provider === "google"
          ? {
              googleProfile: { id: evt.providerId, email: evt.email },
            }
          : {
              appleProfile: { id: evt.providerId, email: evt.email },
            };

      await User.findOneAndUpdate(
        { _id: id },
        {
          _id: id,
          email: evt.email,
          username: evt.username,
          provider: evt.provider,
          providerId: evt.providerId,
          emailVerified: true,
          ...profileData,
          isActive: true,
          isBanned: false,
          role: "user",
          referralCode: "",
          referralEarnings: 0,
          kycVerified: false,
          ninVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { upsert: true, new: true },
      );

      console.log(` OAuth user projection updated: ${evt.email}`);
    },
  );

  // Handle email verification
  userProjection.handle(
    "user",
    "user-verified",
    async (id: string, _evt: Extract<UserEvt, { type: "user-verified" }>) => {
      await User.findByIdAndUpdate(id, {
        emailVerified: true,
        updatedAt: new Date(),
      });
      console.log(` User verified: ${id}`);
    },
  );

  // Handle profile updates
  userProjection.handle(
    "user",
    "profile-updated",
    async (id: string, evt: Extract<UserEvt, { type: "profile-updated" }>) => {
      await User.findByIdAndUpdate(id, {
        $set: { ...evt.fields, updatedAt: new Date() },
      });
      console.log(` User profile updated: ${id}`);
    },
  );

  // Handle wallet linking
  userProjection.handle(
    "user",
    "wallet-linked",
    async (id: string, evt: Extract<UserEvt, { type: "wallet-linked" }>) => {
      await User.findByIdAndUpdate(id, {
        phantomWallet: evt.walletAddress,
        updatedAt: new Date(),
      });
      console.log(` Wallet linked: ${id} -> ${evt.walletAddress}`);
    },
  );

  // Handle KYC submission
  userProjection.handle(
    "user",
    "kyc-submitted",
    async (id: string, _evt: Extract<UserEvt, { type: "kyc-submitted" }>) => {
      await User.findByIdAndUpdate(id, {
        "kycDocuments.submittedAt": new Date(),
        updatedAt: new Date(),
      });
      console.log(` KYC submitted: ${id}`);
    },
  );

  // Handle KYC approval
  userProjection.handle(
    "user",
    "kyc-approved",
    async (id: string, _evt: Extract<UserEvt, { type: "kyc-approved" }>) => {
      await User.findByIdAndUpdate(id, {
        kycVerified: true,
        updatedAt: new Date(),
      });
      console.log(` KYC approved: ${id}`);
    },
  );

  // Handle KYC rejection
  userProjection.handle(
    "user",
    "kyc-rejected",
    async (id: string, _evt: Extract<UserEvt, { type: "kyc-rejected" }>) => {
      await User.findByIdAndUpdate(id, {
        kycVerified: false,
        updatedAt: new Date(),
      });
      console.log(` KYC rejected: ${id}`);
    },
  );

  // Handle referral usage
  userProjection.handle(
    "user",
    "referral-used",
    async (id: string, evt: Extract<UserEvt, { type: "referral-used" }>) => {
      await User.findByIdAndUpdate(id, {
        referredBy: evt.referralCode,
        updatedAt: new Date(),
      });
      console.log(` Referral used: ${id} -> ${evt.referralCode}`);
    },
  );

  // Handle referral earnings
  userProjection.handle(
    "user",
    "referral-earned",
    async (id: string, evt: Extract<UserEvt, { type: "referral-earned" }>) => {
      await User.findByIdAndUpdate(id, {
        referralEarnings: evt.amount,
        updatedAt: new Date(),
      });
      console.log(` Referral earned: ${id} -> $${evt.amount}`);
    },
  );

  // Handle user ban
  userProjection.handle(
    "user",
    "user-banned",
    async (id: string, evt: Extract<UserEvt, { type: "user-banned" }>) => {
      await User.findByIdAndUpdate(id, {
        isBanned: true,
        banReason: evt.reason,
        isActive: false,
        updatedAt: new Date(),
      });
      console.log(` User banned: ${id}`);
    },
  );

  // Handle user unban
  userProjection.handle(
    "user",
    "user-unbanned",
    async (id: string, _evt: Extract<UserEvt, { type: "user-unbanned" }>) => {
      await User.findByIdAndUpdate(id, {
        isBanned: false,
        banReason: undefined,
        isActive: true,
        updatedAt: new Date(),
      });
      console.log(` User unbanned: ${id}`);
    },
  );

  // Handle role change
  userProjection.handle(
    "user",
    "role-changed",
    async (id: string, evt: Extract<UserEvt, { type: "role-changed" }>) => {
      await User.findByIdAndUpdate(id, {
        role: evt.newRole,
        updatedAt: new Date(),
      });
      console.log(` Role changed: ${id} -> ${evt.newRole}`);
    },
  );

  // Handle user deactivation
  userProjection.handle(
    "user",
    "user-deactivated",
    async (
      id: string,
      _evt: Extract<UserEvt, { type: "user-deactivated" }>,
    ) => {
      await User.findByIdAndUpdate(id, {
        isActive: false,
        updatedAt: new Date(),
      });
      console.log(` User deactivated: ${id}`);
    },
  );

  // Handle user reactivation
  userProjection.handle(
    "user",
    "user-reactivated",
    async (
      id: string,
      _evt: Extract<UserEvt, { type: "user-reactivated" }>,
    ) => {
      await User.findByIdAndUpdate(id, {
        isActive: true,
        updatedAt: new Date(),
      });
      console.log(` User reactivated: ${id}`);
    },
  );

  return userProjection;
}

/*
 Create savings projection handler
 This handler listens to savings events and updates the SavingsPlan collection.
 */
export async function createSavingsProjectionHandler() {
  const { getDomain } = await import("../domain");
  const domainResult = await getDomain();
  const { createHandler } = domainResult;

  const savingsProjection = createHandler("savings-projection", ["savings"], {
    alwaysTailStream: false,
    continueOnError: true,
    tailStream: false,
  });

  // Handle plan creation
  savingsProjection.handle(
    "savings",
    "plan-created",
    async (id: string, evt: Extract<SavingsEvt, { type: "plan-created" }>) => {
      const endDate = evt.lockPeriod
        ? new Date(Date.now() + evt.lockPeriod * 24 * 60 * 60 * 1000)
        : undefined;

      await SavingsPlan.findOneAndUpdate(
        { _id: id },
        {
          _id: id,
          userId: evt.userId,
          planType: evt.planType,
          depositAmount: evt.depositAmount,
          currentBalance: evt.depositAmount,
          interestEarned: 0,
          apy: evt.apy,
          status: "active",
          lockPeriod: evt.lockPeriod,
          startDate: new Date(),
          endDate,
          lastInterestCalculation: new Date(),
          withdrawals: [],
          deposits: [{ amount: evt.depositAmount, timestamp: new Date() }],
          earlyWithdrawalPenalty: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { upsert: true, new: true },
      );

      console.log(` Savings plan created: ${id} (${evt.planType})`);
    },
  );

  // Handle deposit confirmation
  savingsProjection.handle(
    "savings",
    "deposit-confirmed",
    async (
      id: string,
      evt: Extract<SavingsEvt, { type: "deposit-confirmed" }>,
    ) => {
      await SavingsPlan.findByIdAndUpdate(id, {
        $push: {
          deposits: {
            amount: evt.amount,
            timestamp: evt.timestamp,
            transactionHash: evt.transactionHash,
          },
        },
        updatedAt: new Date(),
      });
      console.log(` Deposit confirmed: ${id} -> $${evt.amount}`);
    },
  );

  // Handle interest accrual
  savingsProjection.handle(
    "savings",
    "interest-accrued",
    async (
      id: string,
      evt: Extract<SavingsEvt, { type: "interest-accrued" }>,
    ) => {
      await SavingsPlan.findByIdAndUpdate(id, {
        interestEarned: evt.amount,
        currentBalance: evt.newBalance,
        lastInterestCalculation: evt.calculatedAt,
        updatedAt: new Date(),
      });
      console.log(` Interest accrued: ${id} -> $${evt.amount}`);
    },
  );

  // Handle withdrawal completion
  savingsProjection.handle(
    "savings",
    "withdrawal-completed",
    async (
      id: string,
      evt: Extract<SavingsEvt, { type: "withdrawal-completed" }>,
    ) => {
      await SavingsPlan.findByIdAndUpdate(id, {
        $push: {
          withdrawals: {
            amount: evt.amount,
            timestamp: evt.timestamp,
            transactionHash: evt.transactionHash,
            penalty: evt.penalty,
          },
        },
        earlyWithdrawalPenalty: evt.penalty || 0,
        updatedAt: new Date(),
      });
      console.log(` Withdrawal completed: ${id} -> $${evt.amount}`);
    },
  );

  // Handle plan completion
  savingsProjection.handle(
    "savings",
    "plan-completed",
    async (
      id: string,
      evt: Extract<SavingsEvt, { type: "plan-completed" }>,
    ) => {
      await SavingsPlan.findByIdAndUpdate(id, {
        status: "completed",
        endDate: evt.endDate,
        currentBalance: evt.finalBalance,
        updatedAt: new Date(),
      });
      console.log(` Plan completed: ${id}`);
    },
  );

  // Handle plan penalty
  savingsProjection.handle(
    "savings",
    "plan-penalized",
    async (
      id: string,
      evt: Extract<SavingsEvt, { type: "plan-penalized" }>,
    ) => {
      await SavingsPlan.findByIdAndUpdate(id, {
        status: "penalized",
        earlyWithdrawalPenalty: evt.penaltyAmount,
        updatedAt: new Date(),
      });
      console.log(` Plan penalized: ${id} -> $${evt.penaltyAmount}`);
    },
  );

  // Handle plan closure
  savingsProjection.handle(
    "savings",
    "plan-closed",
    async (id: string, _evt: Extract<SavingsEvt, { type: "plan-closed" }>) => {
      await SavingsPlan.findByIdAndUpdate(id, {
        status: "withdrawn",
        updatedAt: new Date(),
      });
      console.log(` Plan closed: ${id}`);
    },
  );

  return savingsProjection;
}

/**
 * Start all projection handlers
 *
 * Call this function when your server starts to begin syncing events to read models.
 */
export async function startAllProjections() {
  console.log(" Starting EvtStore projection handlers...");

  const userProjection = await createUserProjectionHandler();
  const savingsProjection = await createSavingsProjectionHandler();

  userProjection.start();
  savingsProjection.start();

  console.log(" All projection handlers started");

  return { userProjection, savingsProjection };
}
