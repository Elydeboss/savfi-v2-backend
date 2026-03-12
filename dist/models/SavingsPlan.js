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
const savingsPlanSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    planType: {
        type: String,
        enum: ['vaultfi', 'growfi', 'flexifi', 'swiftfi'],
        required: true,
    },
    depositAmount: {
        type: Number,
        required: true,
        min: 0,
    },
    currentBalance: {
        type: Number,
        required: true,
        min: 0,
    },
    interestEarned: {
        type: Number,
        default: 0,
        min: 0,
    },
    apy: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'withdrawn', 'penalized'],
        default: 'active',
    },
    lockPeriod: {
        type: Number, // in days
        min: 0,
    },
    startDate: {
        type: Date,
        required: true,
        default: Date.now,
    },
    endDate: {
        type: Date,
    },
    lastInterestCalculation: {
        type: Date,
        default: Date.now,
    },
    withdrawals: [
        {
            amount: { type: Number, required: true },
            timestamp: { type: Date, default: Date.now },
            transactionHash: String,
            penalty: Number,
        },
    ],
    deposits: [
        {
            amount: { type: Number, required: true },
            timestamp: { type: Date, default: Date.now },
            transactionHash: String,
        },
    ],
    earlyWithdrawalPenalty: {
        type: Number,
        default: 0,
        min: 0,
    },
    blockchainReceipt: {
        type: String,
    },
}, {
    timestamps: true,
});
// Indexes for faster queries
savingsPlanSchema.index({ userId: 1 });
savingsPlanSchema.index({ planType: 1 });
savingsPlanSchema.index({ status: 1 });
savingsPlanSchema.index({ createdAt: -1 });
exports.default = mongoose_1.default.model('SavingsPlan', savingsPlanSchema);
//# sourceMappingURL=SavingsPlan.js.map