"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.adminOnly = exports.authenticate = void 0;
const auth_1 = require("../utils/auth");
const User_1 = __importDefault(require("../models/User"));
// Authenticate user middleware
const authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const decoded = (0, auth_1.verifyToken)(token);
        // Verify user exists and is active
        const user = await User_1.default.findById(decoded.userId);
        if (!user || !user.isActive || user.isBanned) {
            res.status(401).json({ error: 'Invalid authentication' });
            return;
        }
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
        };
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid authentication token' });
    }
};
exports.authenticate = authenticate;
// Admin only middleware
const adminOnly = async (req, res, next) => {
    if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
    }
    next();
};
exports.adminOnly = adminOnly;
// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (token) {
            const decoded = (0, auth_1.verifyToken)(token);
            req.user = {
                userId: decoded.userId,
                email: decoded.email,
                role: decoded.role,
            };
        }
    }
    catch (error) {
        // Ignore errors, just continue without authentication
    }
    next();
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth.js.map