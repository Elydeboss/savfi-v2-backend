"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectWallet = exports.changePassword = exports.updateProfile = exports.getCurrentUser = exports.login = exports.register = void 0;
const zod_1 = require("zod");
const User_1 = __importDefault(require("../models/User"));
const auth_1 = require("../utils/auth");
const validation_1 = require("../utils/validation");
const wallet_1 = require("../utils/wallet");
// Register user
const register = async (req, res) => {
    try {
        // Validate input with Zod schema
        const validatedData = validation_1.registerSchema.parse(req.body);
        const { email, username, password, referralCode } = validatedData;
        // Check if user already exists
        const existingUser = await User_1.default.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            res.status(400).json({ error: 'User with this email or username already exists' });
            return;
        }
        // Hash password
        const hashedPassword = await (0, auth_1.hashPassword)(password);
        // Generate referral code
        const userReferralCode = (0, auth_1.generateReferralCode)(username);
        // Generate a wallet address for the user
        const walletAddress = (0, wallet_1.generateWalletAddress)();
        // Create new user
        const user = new User_1.default({
            email,
            username,
            password: hashedPassword,
            referralCode: userReferralCode,
            phantomWallet: walletAddress,
        });
        // Handle referral
        if (referralCode) {
            const referrer = await User_1.default.findOne({ referralCode: referralCode.toUpperCase() });
            if (referrer) {
                user.referredBy = referrer.referralCode;
            }
        }
        await user.save();
        // Generate token
        const token = (0, auth_1.generateToken)(user);
        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                role: user.role,
                phantomWallet: user.phantomWallet,
            },
        });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({ error: error.issues[0].message });
            return;
        }
        console.error('Register error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
};
exports.register = register;
// Login user
const login = async (req, res) => {
    try {
        // Validate input with Zod schema
        const validatedData = validation_1.loginSchema.parse(req.body);
        const { email, password } = validatedData;
        // Find user
        const user = await User_1.default.findOne({ email });
        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        // Check if user is banned
        if (user.isBanned) {
            res.status(403).json({ error: 'Account is banned', reason: user.banReason });
            return;
        }
        // Check password
        const isPasswordValid = await (0, auth_1.comparePassword)(password, user.password);
        if (!isPasswordValid) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        // Generate token
        const token = (0, auth_1.generateToken)(user);
        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                role: user.role,
                kycVerified: user.kycVerified,
                phantomWallet: user.phantomWallet,
            },
        });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({ error: error.issues[0].message });
            return;
        }
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
};
exports.login = login;
// Get current user
const getCurrentUser = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user?.userId).select('-password');
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.status(200).json({ user });
    }
    catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.getCurrentUser = getCurrentUser;
// Update user profile
const updateProfile = async (req, res) => {
    try {
        // Validate input with Zod schema
        const validatedData = validation_1.updateProfileSchema.parse(req.body);
        const user = await User_1.default.findById(req.user?.userId);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        // Update allowed fields
        if (validatedData.username !== undefined)
            user.username = validatedData.username;
        if (validatedData.phoneNumber !== undefined)
            user.phoneNumber = validatedData.phoneNumber;
        if (validatedData.country !== undefined)
            user.country = validatedData.country;
        if (validatedData.dateOfBirth !== undefined)
            user.dateOfBirth = new Date(validatedData.dateOfBirth);
        if (validatedData.profilePicture !== undefined)
            user.profilePicture = validatedData.profilePicture;
        await user.save();
        res.status(200).json({
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                phoneNumber: user.phoneNumber,
                country: user.country,
                dateOfBirth: user.dateOfBirth,
                profilePicture: user.profilePicture,
            },
        });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({ error: error.issues[0].message });
            return;
        }
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.updateProfile = updateProfile;
// Change password
const changePassword = async (req, res) => {
    try {
        // Validate input with Zod schema
        const validatedData = validation_1.changePasswordSchema.parse(req.body);
        const { currentPassword, newPassword } = validatedData;
        const user = await User_1.default.findById(req.user?.userId);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        // Verify current password
        const isPasswordValid = await (0, auth_1.comparePassword)(currentPassword, user.password);
        if (!isPasswordValid) {
            res.status(401).json({ error: 'Current password is incorrect' });
            return;
        }
        // Hash new password
        user.password = await (0, auth_1.hashPassword)(newPassword);
        await user.save();
        res.status(200).json({ message: 'Password changed successfully' });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({ error: error.issues[0].message });
            return;
        }
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.changePassword = changePassword;
// Connect Phantom wallet
const connectWallet = async (req, res) => {
    try {
        // Validate input with Zod schema
        const validatedData = validation_1.connectWalletSchema.parse(req.body);
        const { walletAddress } = validatedData;
        const user = await User_1.default.findById(req.user?.userId);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        // Check if wallet is already connected to another account
        const existingWallet = await User_1.default.findOne({ phantomWallet: walletAddress });
        if (existingWallet && existingWallet._id.toString() !== user._id.toString()) {
            res.status(400).json({ error: 'Wallet already connected to another account' });
            return;
        }
        user.phantomWallet = walletAddress;
        await user.save();
        res.status(200).json({
            message: 'Wallet connected successfully',
            walletAddress: user.phantomWallet,
        });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({ error: error.issues[0].message });
            return;
        }
        console.error('Connect wallet error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.connectWallet = connectWallet;
//# sourceMappingURL=authController.js.map