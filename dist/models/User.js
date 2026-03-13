"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const userSchema = new mongoose_1.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30,
    },
    password: {
        type: String,
        minlength: 6,
    },
    provider: {
        type: String,
        enum: ['email', 'google', 'apple'],
        default: 'email',
    },
    providerId: {
        type: String,
        sparse: true,
    },
    emailVerified: {
        type: Boolean,
        default: false,
    },
    googleProfile: {
        id: String,
        email: String,
        name: String,
        picture: String,
    },
    appleProfile: {
        id: String,
        email: String,
    },
    phantomWallet: {
        type: String,
        sparse: true,
        trim: true,
    },
    profilePicture: {
        type: String,
    },
    phoneNumber: {
        type: String,
        trim: true,
    },
    country: {
        type: String,
        trim: true,
    },
    dateOfBirth: {
        type: Date,
    },
    ninVerified: {
        type: Boolean,
        default: false,
    },
    kycVerified: {
        type: Boolean,
        default: false,
    },
    kycDocuments: {
        idDocumentUrl: String,
        selfieUrl: String,
        proofOfAddressUrl: String,
        submittedAt: Date,
    },
    referralCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
    },
    referredBy: {
        type: String,
        trim: true,
    },
    referralEarnings: {
        type: Number,
        default: 0,
        min: 0,
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    isBanned: {
        type: Boolean,
        default: false,
    },
    banReason: {
        type: String,
        trim: true,
    },
}, {
    timestamps: true,
});
// Note: unique indexes are automatically created for fields with unique: true
// Additional indexes for complex queries can be added here
exports.default = mongoose_1.default.model('User', userSchema);
//# sourceMappingURL=User.js.map