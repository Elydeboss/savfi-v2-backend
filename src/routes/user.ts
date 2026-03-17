/**
 * User Routes using EvtStore Commands
 *
 * These routes use the event sourcing command handlers for user operations.
 * All state changes go through commands that emit events.
 */

import { Router } from "express";
import { getUserCommands, getUserAggregate } from "../domain/domain";
import { startAllProjections } from "../domain/handlers/projections";
import User from "../models/User";

const router = Router();

/**
 POST /api/users
  Create a new user
 */
router.post("/users", async (req, res) => {
  try {
    const { email, username, password, referralCode } = req.body;

    // Hash password for storage
    const bcrypt = require("bcrypt");
    const hashedPassword = await bcrypt.hash(password, 10);

    const userCommands = await getUserCommands();
    const user = await userCommands["create-user"](email, {
      email,
      username,
      referralCode,
    });

    // Save hashed password directly to User model (not stored in events for security)
    await User.findOneAndUpdate(
      { _id: user.aggregateId },
      { password: hashedPassword },
      { upsert: true, new: true },
    );

    res.status(201).json({
      success: true,
      data: {
        id: user.aggregateId,
        email: user.email,
        username: user.username,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/*
  POST /api/users/oauth
  Create a new user via OAuth
 */
router.post("/users/oauth", async (req, res) => {
  try {
    const { email, username, provider, providerId } = req.body;

    const userCommands = await getUserCommands();
    const user = await userCommands["create-user-oauth"](email, {
      email,
      username,
      provider,
      providerId,
    });

    res.status(201).json({
      success: true,
      data: {
        id: user.aggregateId,
        email: user.email,
        username: user.username,
        provider: user.provider,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/*
  GET /api/users/:userId
  Get user by ID
 */
router.get("/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const userAggregate = await getUserAggregate();
    const user = await userAggregate.getAggregate(userId);

    res.json({
      success: true,
      data: {
        id: user.aggregateId,
        email: user.email,
        username: user.username,
        provider: user.provider,
        emailVerified: user.emailVerified,
        isActive: user.isActive,
        isBanned: user.isBanned,
        role: user.role,
        referralCode: user.referralCode,
        referralEarnings: user.referralEarnings,
        kycVerified: user.kycVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error instanceof Error ? error.message : "User not found",
    });
  }
});

/**
  PUT /api/users/:userId/profile
  Update user profile
 */
router.put("/users/:userId/profile", async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, profilePicture, phoneNumber, country, dateOfBirth } =
      req.body;

    const userCommands = await getUserCommands();
    const user = await userCommands["update-profile"](userId, {
      updates: { username, profilePicture, phoneNumber, country, dateOfBirth },
    });

    res.json({
      success: true,
      data: {
        id: user.aggregateId,
        username: user.username,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
  POST /api/users/:userId/wallet
  Link wallet to user
 */
router.post("/users/:userId/wallet", async (req, res) => {
  try {
    const { userId } = req.params;
    const { walletAddress, walletType } = req.body;

    const userCommands = await getUserCommands();
    const user = await userCommands["link-wallet"](userId, {
      walletAddress,
      walletType,
    });

    res.json({
      success: true,
      data: {
        id: user.aggregateId,
        walletLinked: true,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/*
 POST /api/users/:userId/kyc
  Submit KYC verification
 */
router.post("/users/:userId/kyc", async (req, res) => {
  try {
    const { userId } = req.params;
    const { documentType, idDocument, selfie, proofOfAddress } = req.body;

    const userCommands = await getUserCommands();
    const user = await userCommands["submit-kyc"](userId, {
      documentType,
      documentUrls: { idDocument, selfie, proofOfAddress },
    });

    res.json({
      success: true,
      data: {
        id: user.aggregateId,
        kycSubmitted: true,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/*
  POST /api/users/:userId/kyc/approve
  Approve KYC (admin only)
 */
router.post("/users/:userId/kyc/approve", async (req, res) => {
  try {
    const { userId } = req.params;
    const { verifiedBy } = req.body;

    const userCommands = await getUserCommands();
    const user = await userCommands["approve-kyc"](userId, { verifiedBy });

    res.json({
      success: true,
      data: {
        id: user.aggregateId,
        kycVerified: user.kycVerified,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/*
  POST /api/users/:userId/kyc/reject
  Reject KYC (admin only)
 */
router.post("/users/:userId/kyc/reject", async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const userCommands = await getUserCommands();
    const user = await userCommands["reject-kyc"](userId, { reason });

    res.json({
      success: true,
      data: {
        id: user.aggregateId,
        kycVerified: user.kycVerified,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
  POST /api/users/:userId/ban
  Ban user (admin only)
 */
router.post("/users/:userId/ban", async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, bannedBy } = req.body;

    const userCommands = await getUserCommands();
    const user = await userCommands["ban-user"](userId, { reason, bannedBy });

    res.json({
      success: true,
      data: {
        id: user.aggregateId,
        isBanned: user.isBanned,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/*
  POST /api/users/:userId/unban
  Unban user (admin only)
 */
router.post("/users/:userId/unban", async (req, res) => {
  try {
    const { userId } = req.params;
    const { unbannedBy } = req.body;

    const userCommands = await getUserCommands();
    const user = await userCommands["unban-user"](userId, { unbannedBy });

    res.json({
      success: true,
      data: {
        id: user.aggregateId,
        isBanned: user.isBanned,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
  POST /api/users/:userId/deactivate
  Deactivate user
 */
router.post("/users/:userId/deactivate", async (req, res) => {
  try {
    const { userId } = req.params;

    const userCommands = await getUserCommands();
    const user = await userCommands["deactivate-user"](userId, {});

    res.json({
      success: true,
      data: {
        id: user.aggregateId,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/*
  POST /api/users/:userId/reactivate
  Reactivate user
 */
router.post("/users/:userId/reactivate", async (req, res) => {
  try {
    const { userId } = req.params;

    const userCommands = await getUserCommands();
    const user = await userCommands["reactivate-user"](userId, {});

    res.json({
      success: true,
      data: {
        id: user.aggregateId,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
