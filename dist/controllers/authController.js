"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectWallet = exports.changePassword = exports.updateProfile = exports.getCurrentUser = exports.login = exports.register = void 0;
const User_1 = __importDefault(require("../models/User"));
const auth_1 = require("../utils/auth");
// Register user
const register = async (req, res) => {
    try {
        const { email, username, password, referralCode } = req.body;
        // Validate input
        if (!email || !username || !password) {
            res.status(400).json({ error: 'Please provide email, username, and password' });
            return;
        }
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
        // Create new user
        const user = new User_1.default({
            email,
            username,
            password: hashedPassword,
            referralCode: userReferralCode,
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
            },
        });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
};
exports.register = register;
// Login user
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validate input
        if (!email || !password) {
            res.status(400).json({ error: 'Please provide email and password' });
            return;
        }
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
            },
        });
    }
    catch (error) {
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
        const { phoneNumber, country, dateOfBirth, profilePicture } = req.body;
        const user = await User_1.default.findById(req.user?.userId);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        // Update allowed fields
        if (phoneNumber !== undefined)
            user.phoneNumber = phoneNumber;
        if (country !== undefined)
            user.country = country;
        if (dateOfBirth !== undefined)
            user.dateOfBirth = new Date(dateOfBirth);
        if (profilePicture !== undefined)
            user.profilePicture = profilePicture;
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
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.updateProfile = updateProfile;
// Change password
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            res.status(400).json({ error: 'Please provide current and new password' });
            return;
        }
        if (newPassword.length < 6) {
            res.status(400).json({ error: 'New password must be at least 6 characters' });
            return;
        }
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
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.changePassword = changePassword;
// Connect Phantom wallet
const connectWallet = async (req, res) => {
    try {
        const { walletAddress } = req.body;
        if (!walletAddress) {
            res.status(400).json({ error: 'Please provide wallet address' });
            return;
        }
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
        console.error('Connect wallet error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
exports.connectWallet = connectWallet;
//# sourceMappingURL=authController.js.map