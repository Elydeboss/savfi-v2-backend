"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = (0, express_1.Router)();
// Public routes with rate limiting
router.post('/register', rateLimiter_1.authLimiter, authController_1.register);
router.post('/login', rateLimiter_1.authLimiter, authController_1.login);
// Protected routes (require authentication)
router.get('/me', auth_1.authenticate, authController_1.getCurrentUser);
router.put('/profile', auth_1.authenticate, authController_1.updateProfile);
router.put('/change-password', auth_1.authenticate, rateLimiter_1.sensitiveLimiter, authController_1.changePassword);
router.post('/connect-wallet', auth_1.authenticate, rateLimiter_1.sensitiveLimiter, authController_1.connectWallet);
exports.default = router;
//# sourceMappingURL=auth.js.map