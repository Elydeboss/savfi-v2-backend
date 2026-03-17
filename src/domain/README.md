# SavFi Event Sourcing Domain

This directory contains the event sourcing domain logic for SavFi using EvtStore with MongoDB.

## 📁 Folder Structure

```
src/domain/
├── config/
│   └── mongodb.ts           # MongoDB event store provider setup
├── types/
│   ├── user.ts              # User events, aggregates, commands
│   └── savings.ts           # Savings events, aggregates, commands
├── aggregates/
│   ├── user.ts              # User aggregate fold logic
│   └── savings.ts           # Savings aggregate fold logic
├── commands/
│   ├── user.ts              # User command handlers
│   └── savings.ts           # Savings command handlers
├── handlers/
│   └── projections.ts       # Event handlers for read models
├── domain.ts                # Main domain setup & initialization
└── README.md                # This file
```

## 🏗️ Architecture

### Event Sourcing Pattern

```
┌─────────────┐     Command     ┌──────────────┐
│   Client    │ ────────────────> │  Command     │
│  (Frontend) │                  │  Handler     │
└─────────────┘                  └──────┬───────┘
                                         │
                                         ▼
                                    ┌─────────┐
                                    │ Validate│
                                    │ Business│
                                    │  Rules  │
                                    └────┬────┘
                                         │
                                         ▼
                                    ┌─────────┐
                                    │  Emit   │
                                    │  Event  │
                                    └────┬────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                    ▼                    ▼                    ▼
            ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
            │ Event Store  │    │  Aggregate   │    │  Projection  │
            │  (MongoDB)   │    │   State      │    │ (Read Model) │
            └──────────────┘    └──────────────┘    └──────────────┘
```

## 🚀 Getting Started

### 1. Environment Variables

Add these to your `.env` file:

```bash
# Event Store MongoDB (separate from main database)
EVTSTORE_MONGO_HOST=localhost
EVTSTORE_MONGO_PORT=27017
EVTSTORE_DB=savfi_evtstore
```

### 2. Initialize Domain on Server Start

Update your `src/index.ts`:

```typescript
import { createDomain, startAllProjections } from './domain/domain'

// Initialize domain and start projections
async function startServer() {
  await createDomain()
  await startAllProjections()

  // Start Express server
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}

startServer().catch(console.error)
```

### 3. Mount Event Sourcing Routes

```typescript
import userRoutes from './routes/user'
import savingsRoutes from './routes/savings-events'

app.use('/api', userRoutes)
app.use('/api/savings', savingsRoutes)
```

## 📝 Domain Types

### User Domain

**Events:**
- `user-created` - New user registration
- `user-created-oauth` - OAuth registration
- `user-verified` - Email verification
- `profile-updated` - Profile changes
- `wallet-linked` - Phantom/Solflare wallet
- `kyc-submitted` - KYC document submission
- `kyc-approved` - Admin approval
- `kyc-rejected` - Admin rejection
- `user-banned` - Admin ban
- `user-unbanned` - Admin unban
- `role-changed` - Role modification

**Commands:**
- `create-user` - Register with email/password
- `create-user-oauth` - Register with OAuth
- `update-profile` - Update profile fields
- `link-wallet` - Link Solana wallet
- `submit-kyc` - Submit KYC documents
- `approve-kyc` - Approve KYC (admin)
- `reject-kyc` - Reject KYC (admin)
- `ban-user` - Ban user (admin)
- `unban-user` - Unban user (admin)

### Savings Domain

**Events:**
- `plan-created` - New savings plan
- `deposit-confirmed` - Deposit added
- `interest-accrued` - Interest calculated
- `withdrawal-completed` - Withdrawal processed
- `plan-completed` - Plan maturity
- `plan-penalized` - Early withdrawal penalty
- `plan-closed` - Plan closure

**Commands:**
- `create-plan` - Create savings plan
- `add-deposit` - Add funds
- `initiate-withdrawal` - Start withdrawal
- `accrue-interest` - Calculate interest
- `complete-plan` - Mark complete
- `apply-penalty` - Apply penalty (admin)
- `close-plan` - Close plan (admin)

## 🔌 API Usage

### Create User

```bash
POST /api/users
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securepass123",
  "referralCode": "REF12345"
}
```

### Create Savings Plan

```bash
POST /api/savings/plans
{
  "userId": "user-id",
  "planType": "vaultfi",
  "depositAmount": 1000,
  "apy": 12,
  "lockPeriod": 90
}
```

### Add Deposit

```bash
POST /api/savings/plans/plan-id/deposit
{
  "amount": 500,
  "transactionHash": "tx-hash"
}
```

## 🔄 Projections

Projections automatically update your read models (Mongoose models) when events are emitted:

- **User Projection** → Updates `User` collection
- **Savings Projection** → Updates `SavingsPlan` collection

## 🛡️ Business Rules

### User Rules
- Username must be 3-30 characters
- Email must be valid format
- Password must be at least 6 characters
- Users cannot be banned twice
- KYC cannot be submitted if already verified

### Savings Rules
- Minimum deposits by plan type:
  - VaultFi: $100
  - GrowFi: $50
  - FlexiFi: $10
  - SwiftFi: $20
- Lock periods enforced (except FlexiFi)
- Early withdrawals incur penalties (5-20%)
- Maximum APY: 100%

## 📊 MongoDB Collections

EvtStore creates these collections in the event store database:

### `events` Collection
```javascript
{
  stream: "user",
  aggregateId: "user-id",
  version: 1,
  position: { high: 1, low: 0 },
  timestamp: ISODate,
  event: { type: "user-created", ... }
}
```

### `bookmarks` Collection
```javascript
{
  bookmark: "user-projection",
  position: { high: 1, low: 0 }
}
```

## 🔍 Querying

### Get User State (Aggregate)

```typescript
import { getUserAggregate } from './domain/domain'

const userAggregate = await getUserAggregate()
const user = await userAggregate.getAggregate('user-id')

console.log(user.email, user.isActive, user.kycVerified)
```

### Get Savings Plan State

```typescript
import { getSavingsAggregate } from './domain/domain'

const savingsAggregate = await getSavingsAggregate()
const plan = await savingsAggregate.getAggregate('plan-id')

console.log(plan.currentBalance, plan.status, plan.interestEarned)
```

## 🧪 Testing

```typescript
import { getUserCommands } from './domain/domain'

describe('User Commands', () => {
  it('should create a user', async () => {
    const commands = await getUserCommands()
    const user = await commands['create-user']('test-id', {
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
    })

    expect(user.email).toBe('test@example.com')
    expect(user.username).toBe('testuser')
  })
})
```

## 📚 Additional Resources

- [EvtStore Documentation](https://seikho.github.io/evtstore)
- [Event Sourcing Pattern](https://martinfowler.com/eaaDev/EventSourcing.html)
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html)
