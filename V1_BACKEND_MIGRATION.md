# SavFi V2 Backend - V1 Frontend Compatibility Guide

This document outlines the changes made to the SavFi v2 backend to ensure compatibility with the SavFi v1 frontend.

## Overview

The v2 backend has been updated with backward compatibility routes that allow the v1 frontend to work seamlessly. The v1 frontend expects specific API endpoints and response formats that differ from the v2 API structure.

## Key Changes Made

### 1. New Route Files Created

#### `/src/routes/v1-compat.ts`
Provides backward compatibility for account endpoints:
- `POST /accounts/register/` - Direct user creation (no OTP required for v1)
- `POST /accounts/login/` - Returns JWT tokens in v1 format
- `GET /accounts/profile/` - Get user profile with v1 field names
- `PUT /accounts/profile/` - Update user profile

#### `/src/routes/wallet.ts`
Wallet operations:
- `GET /wallets/` - Get user's wallet(s) (returns array)
- `POST /wallets/` - Create a new wallet
- `GET /wallet/info` - Get wallet information
- `POST /wallet/balance` - Update wallet balance

#### `/src/routes/transactions.ts`
Transaction management:
- `GET /transactions` - Get transaction history with pagination
- `GET /transactions/:id` - Get specific transaction details
- `POST /transactions` - Create a new transaction

#### `/src/routes/deposits.ts`
Deposit operations:
- `POST /deposit/ngn/initiate` - Start NGN deposit
- `POST /deposit/ngn/confirm` - Confirm NGN deposit
- `POST /deposit/usdt/initiate` - Start USDT deposit
- `POST /deposit/usdt/confirm` - Confirm USDT deposit

#### `/src/routes/withdrawals.ts`
Withdrawal operations:
- `POST /withdrawal/ngn/initiate` - Start NGN withdrawal
- `POST /withdrawal/ngn/confirm` - Confirm NGN withdrawal
- `POST /withdrawal/usdt/initiate` - Start USDT withdrawal
- `POST /withdrawal/usdt/confirm` - Confirm USDT withdrawal

### 2. Response Format Adjustments

#### Login/Register Response Format
V1 frontend expects:
```json
{
  "access": "jwt_access_token",
  "refresh": "jwt_refresh_token",
  "username": "username",
  "email": "email@example.com",
  "id": "user_id"
}
```

#### Profile Response Format
V1 frontend expects:
```json
{
  "id": "user_id",
  "username": "username",
  "email": "email@example.com",
  "first_name": "First",
  "second_name": "Last",
  "phone": "phone_number",
  "country": "country",
  "state": "state",
  "bio": "bio",
  "avatar": "avatar_url",
  "kycVerified": true
}
```

### 3. Model Updates

#### User Model (`/src/models/User.ts`)
Added fields for v1 compatibility:
- `firstName` - User's first name
- `lastName` - User's last name
- `walletAddress` - Wallet address (separate from phantomWallet)
- `walletBalance` - Current wallet balance
- `state` - User's state/region
- `bio` - User biography

#### Transaction Model (`/src/models/Transaction.ts`)
Added fields for v1 compatibility:
- `planId` - Savings plan ID reference
- `usdtAmount` - Amount in USDT
- `source` - Transaction source (Wallet, Bank, etc.)
- `reference` - Transaction reference code
- `fee` - Transaction fee
- `network` - Blockchain network (TRC20, ERC20)
- `paymentMethod` - Payment method used
- `bankDetails` - Bank information for withdrawals

### 4. Utility Functions

#### Auth Utilities (`/src/utils/auth.ts`)
Added:
- `generateRefreshToken()` - Generate long-lived refresh tokens

### 5. Main Server Updates (`/src/index.ts`)
Registered all v1 compatibility routes:
```typescript
app.use('/accounts', v1CompatRoutes);
app.use('/wallets', walletRoutes);
app.use('/wallet', walletRoutes);
app.use('/transactions', transactionRoutes);
app.use('/deposit', depositRoutes);
app.use('/withdrawal', withdrawalRoutes);
```

## V1 Frontend API Endpoints

The following endpoints are now available for the v1 frontend:

### Authentication
- `POST /accounts/register/` - Register new user
- `POST /accounts/login/` - Login user
- `GET /accounts/profile/` - Get user profile
- `PUT /accounts/profile/` - Update user profile

### Wallet
- `GET /wallets/` - Get all wallets
- `POST /wallets/` - Create wallet
- `GET /wallet/info` - Get wallet info
- `POST /wallet/balance` - Update balance

### Transactions
- `GET /transactions` - Get transactions (with pagination)
- `GET /transactions/:id` - Get transaction details
- `POST /transactions` - Create transaction

### Deposits
- `POST /deposit/ngn/initiate` - Start NGN deposit
- `POST /deposit/ngn/confirm` - Confirm NGN deposit
- `POST /deposit/usdt/initiate` - Start USDT deposit
- `POST /deposit/usdt/confirm` - Confirm USDT deposit

### Withdrawals
- `POST /withdrawal/ngn/initiate` - Start NGN withdrawal
- `POST /withdrawal/ngn/confirm` - Confirm NGN withdrawal
- `POST /withdrawal/usdt/initiate` - Start USDT withdrawal
- `POST /withdrawal/usdt/confirm` - Confirm USDT withdrawal

### Savings (V2 endpoints, also compatible)
- `GET /api/savings` - Get all savings plans
- `POST /api/savings/create` - Create savings plan
- `POST /api/savings/:planId/deposit` - Add funds to plan
- `POST /api/savings/:planId/withdraw` - Withdraw from plan

## Testing the Integration

To test if your v1 frontend works with the v2 backend:

1. Start the backend server:
   ```bash
   npm run dev
   ```

2. Update your v1 frontend's `VITE_API_BASE_URL` to point to the v2 backend:
   ```env
   VITE_API_BASE_URL=http://localhost:3000
   ```

3. Test key flows:
   - User registration
   - User login
   - Profile viewing/editing
   - Wallet operations
   - Deposit/withdrawal flows
   - Transaction history

## Migration Notes

### Key Differences Between V1 and V2

1. **Authentication**: V2 uses OTP verification for registration, but v1 compatibility bypasses this
2. **Response Format**: V2 returns `{ token, user }`, v1 returns `{ access, refresh, username, email }`
3. **Field Names**: V2 uses camelCase, v1 uses snake_case for some fields
4. **Wallet Structure**: V2 integrates wallet into User model, v1 has separate wallet endpoints

### Future Considerations

1. Gradually migrate v1 frontend to use v2 API endpoints
2. Implement proper 2FA for withdrawal confirmations
3. Add blockchain transaction verification for deposits
4. Implement actual payment processor integration for NGN deposits/withdrawals
5. Add proper rate limiting and fraud detection

## Environment Variables

Ensure these are set in your `.env` file:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/savfi

# JWT
JWT_SECRET=your_secret_key_at_least_32_chars
JWT_EXPIRE=7d

# API
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Solana (optional, for blockchain features)
SOLANA_RPC_URL=https://api.devnet.solana.com
COMPANY_WALLET_PRIVATE_KEY=your_private_key
COMPANY_WALLET_ADDRESS=your_wallet_address
USDC_TOKEN_ADDRESS=EPjFWdd5AufqSSqeE2qN1xzybapC8G4wEGGkZwyTDt1v

# Default USDT address for deposits
DEFAULT_USDT_ADDRESS=YourDefaultUSDTAddress
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your frontend URL is in `ALLOWED_ORIGINS`
2. **404 Errors**: Check that routes are properly registered in `index.ts`
3. **Authentication Errors**: Verify JWT_SECRET is set and at least 32 characters
4. **Database Errors**: Ensure MongoDB is running and MONGODB_URI is correct

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

This will provide detailed error messages and stack traces.
