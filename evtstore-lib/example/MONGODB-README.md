# EvtStore MongoDB Example

This example demonstrates how to use **EvtStore** with **MongoDB** for event sourcing.

## Prerequisites

1. **Node.js** and **TypeScript** installed
2. **MongoDB** running (use Docker Compose or your own instance)

## Quick Start

### 1. Start MongoDB

Using Docker Compose (from the evtstore root):

```bash
cd evtstore
docker-compose up -d mongo
```

Or use your own MongoDB instance and set environment variables:

```bash
export MONGO_HOST=localhost
export MONGO_PORT=27017
export MONGO_DB=evtstore
```

### 2. Run the Example

```bash
npm install
npm run build
npx ts-node example/mongodb-example.ts
```

## Project Structure

```
example/
├── config/
│   └── mongodb.ts       # MongoDB connection & provider setup
├── types/
│   └── user.ts          # Event, Aggregate, and Command types
├── aggregate/
│   └── user.ts          # User aggregate definition
├── command/
│   └── user.ts          # Command handlers
├── routes/
│   └── create-user.ts   # Express.js route examples
├── domain.ts            # Domain setup
└── mongodb-example.ts   # Complete usage example
```

## Key Files

### [config/mongodb.ts](config/mongodb.ts)

Handles MongoDB connection and provider creation:

```typescript
import { createMongoProvider, closeMongoDB } from './config/mongodb'

// Connect and create provider
const provider = await createMongoProvider()

// Close connection when done
await closeMongoDB()
```

### [domain.ts](domain.ts)

Domain setup with MongoDB provider:

```typescript
import { getDomain, createUserProfilesHandler } from './domain'

// Initialize domain
const domain = await getDomain()

// Create event handlers
const handler = await createUserProfilesHandler()
handler.start()
```

### [mongodb-example.ts](mongodb-example.ts)

Complete example showing:
- Creating users
- Enabling/disabling users
- Changing user names
- Reading current state
- Event handling

## API Usage

### Commands

```typescript
import { userCmd } from './command/user'

// Create a user
const user = await userCmd.create('user-123', { name: 'John Doe' })

// Enable user
await userCmd.enable('user-123')

// Disable user
await userCmd.disable('user-123')

// Change name
await userCmd.setName('user-123', { name: 'Jane Doe' })
```

### Reading State

```typescript
import { getDomain } from './domain'

const domain = await getDomain()
const user = await domain.user.getAggregate('user-123')

console.log(user.aggregate)  // Current state
console.log(user.version)    // Event version
```

### Event Handlers

```typescript
import { createUserProfilesHandler } from './domain'

const handler = await createUserProfilesHandler()
handler.start()

// Handler will process events from the 'user-events' stream
// and execute the registered handlers
```

## MongoDB Collections

EvtStore creates two collections:

### `events` Collection

Stores all events with the following indexes:

| Index | Fields | Unique |
|-------|--------|--------|
| `stream-position-index` | stream + position | ✅ |
| `stream-id-version-index` | stream + aggregateId + version | ✅ |

### `bookmarks` Collection

Stores event handler positions with the following index:

| Index | Fields | Unique |
|-------|--------|--------|
| `bookmark-index` | bookmark | ✅ |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGO_HOST` | `localhost` | MongoDB host |
| `MONGO_PORT` | `30001` | MongoDB port |
| `MONGO_DB` | `evtstore` | Database name |

## Express.js Integration

See [routes/create-user.ts](routes/create-user.ts) for examples:

```typescript
import express from 'express'
import { createUser, enableUser, disableUser, setUserName } from './routes/create-user'

const app = express()
app.use(express.json())

// POST /users - Create user
app.post('/users', createUser)

// PUT /users/enable - Enable user
app.put('/users/enable', enableUser)

// PUT /users/disable - Disable user
app.put('/users/disable', disableUser)

// PUT /users/name - Change user name
app.put('/users/name', setUserName)
```

## Troubleshooting

### MongoDB Connection Error

```
MongoServerError: Authentication failed
```

Check your MongoDB credentials and update the connection string in `config/mongodb.ts`.

### Port Already in Use

```
Error: port 30001 is already in use
```

Stop the existing MongoDB container or change the `MONGO_PORT` environment variable.

### Index Creation Error

```
MongoServerError: Index already exists
```

This is normal if you've run the example before. The `migrate()` function uses `createIndex()` which is idempotent.

## Next Steps

1. **Add your own events**: Extend `UserEvt` in [types/user.ts](types/user.ts)
2. **Add your own commands**: Extend `UserCmd` in [types/user.ts](types/user.ts)
3. **Create aggregates**: Add new aggregates following the pattern in [aggregate/user.ts](aggregate/user.ts)
4. **Build event handlers**: Create projection handlers using `createHandler()`

## Resources

- [EvtStore Documentation](https://seikho.github.io/evtstore)
- [MongoDB Node.js Driver](https://mongodb.github.io/node-mongodb-native/)
- [Event Sourcing Pattern](https://martinfowler.com/eaaDev/EventSourcing.html)
