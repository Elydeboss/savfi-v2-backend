"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReferralCode = exports.comparePassword = exports.hashPassword = exports.verifyToken = exports.generateToken = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Generate JWT token
const generateToken = (user) => {
    const payload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
    };
    const secret = process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production';
    return jsonwebtoken_1.default.sign(payload, secret, { expiresIn: process.env.JWT_EXPIRE || '7d' });
};
exports.generateToken = generateToken;
// Verify JWT token
const verifyToken = (token) => {
    const secret = process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production';
    return jsonwebtoken_1.default.verify(token, secret);
};
exports.verifyToken = verifyToken;
// Hash password
const hashPassword = async (password) => {
    const salt = await bcryptjs_1.default.genSalt(10);
    return bcryptjs_1.default.hash(password, salt);
};
exports.hashPassword = hashPassword;
// Compare password
const comparePassword = async (password, hashedPassword) => {
    return bcryptjs_1.default.compare(password, hashedPassword);
};
exports.comparePassword = comparePassword;
// Generate referral code
const generateReferralCode = (username) => {
    const prefix = username.substring(0, 4).toUpperCase();
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${randomStr}`;
};
exports.generateReferralCode = generateReferralCode;
//# sourceMappingURL=auth.js.map