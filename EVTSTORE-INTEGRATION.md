# EvtStore Integration Guide for SavFi Backend

This guide shows how to integrate the EvtStore event sourcing system into your existing SavFi backend.

## Step 1: Update .env

Add these environment variables to your `.env` file:

```bash
# Event Store MongoDB (separate from main database)
EVTSTORE_MONGO_HOST=localhost
EVTSTORE_MONGO_PORT=27017
EVTSTORE_DB=savfi_evtstore
```

## Step 2: Update src/index.ts

Add the EvtStore initialization before starting the server. Here's how to integrate it:

```typescript
// ... existing imports ...

// Import EvtStore domain
import { createDomain, startAllProjections } from './domain/domain';
import { closeEventStoreDB } from './domain/config/mongodb';

// ... existing middleware setup ...

// ===== START SERVER LOCALLY ONLY =====
if (!process.env.VERCEL) {
  const startServer = async (): Promise<void> => {
    try {
      // Connect to MongoDB (existing)
      await connectDB();

      // ✅ NEW: Initialize EvtStore Domain
      console.log('🔄 Initializing EvtStore domain...');
      await createDomain();
      console.log('✅ EvtStore domain initialized');

      // ✅ NEW: Start projection handlers
      console.log('🔄 Starting EvtStore projection handlers...');
      await startAllProjections();
      console.log('✅ EvtStore projection handlers started');

      // Start listening
      app.listen(env.PORT, () => {
        console.log(`🚀 Server running on port ${env.PORT}`);
        console.log(`📝 Environment: ${env.NODE_ENV}`);
        console.log(`🔗 API: http://localhost:${env.PORT}`);
        console.log(`🏥 Health: http://localhost:${env.PORT}/health`);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  };

  // Graceful shutdown handler
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n⚠️  ${signal} received. Starting graceful shutdown...`);

    try {
      // Close EvtStore connections
      await closeEventStoreDB();
      console.log('✅ EvtStore connections closed');

      // Close MongoDB connections
      await mongoose.connection.close();
      console.log('✅ MongoDB connections closed');

      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  startServer();
}
```

## Step 3: Add Event Sourcing Routes

Update the routes section in `src/index.ts`:

```typescript
// ... existing imports ...
import userRoutes from './routes/user';
import savingsRoutes from './routes/savings-events';

// ... existing routes ...
app.use('/api/auth', authRoutes);
app.use('/api/auth/oauth', oauthRoutes);

// ✅ NEW: Event sourcing routes
app.use('/api', userRoutes);
app.use('/api/savings', savingsRoutes);

// Existing savings routes (can be migrated gradually)
app.use('/api/savings', savingsRoutes);
```

## Step 4: Update Health Check

Update the health check to include EvtStore status:

```typescript
app.get('/health', async (req: Request, res: Response) => {
  try {
    // ... existing database connection check ...

    // ✅ NEW: Check EvtStore connection (optional)
    let evtStoreStatus = 'not_configured';
    try {
      // You could add a health check function to the domain
      // For now, we'll just report if it's configured
      if (process.env.EVTSTORE_DB) {
        evtStoreStatus = 'configured';
      }
    } catch (error) {
      evtStoreStatus = 'error';
    }

    const health = {
      status: isDbConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: env.NODE_ENV,
      database: {
        status: isDbConnected ? 'connected' : 'disconnected',
        name: mongoose.connection.name,
        host: mongoose.connection.host,
      },
      // ✅ NEW: EvtStore status
      evtstore: {
        status: evtStoreStatus,
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
      },
      cpu: process.cpuUsage(),
    };

    const statusCode = isDbConnected ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    // ... existing error handling ...
  }
});
```

## Step 5: Gradual Migration Strategy

You don't have to migrate everything at once. Here's a recommended approach:

### Phase 1: Parallel Systems (Current State)
- Keep existing routes working as-is
- Add new event sourcing routes alongside
- Both systems write to the same read models (MongoDB collections)

### Phase 2: Write Migration
- Start using event sourcing for writes (commands)
- Keep existing read endpoints
- Projections keep both in sync

### Phase 3: Read Migration
- Gradually move read queries to use aggregates
- Keep MongoDB collections for caching/backup

### Phase 4: Full Event Sourcing
- All operations go through event sourcing
- MongoDB collections are purely read projections

## Step 6: Testing the Integration

After making these changes, test the integration:

```bash
# Start the server
npm run dev

# Test user creation
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123"
  }'

# Test savings plan creation
curl -X POST http://localhost:3000/api/savings/plans \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-id-from-above",
    "planType": "flexifi",
    "depositAmount": 100,
    "apy": 8
  }'

# Check health endpoint
curl http://localhost:3000/health
```

## Troubleshooting

### MongoDB Connection Error

If you see "EvtStore MongoDB connection failed", ensure:
1. MongoDB is running on the configured port
2. The EVTSTORE_MONGO_HOST and PORT are correct
3. The database exists or can be created

### Projection Handlers Not Starting

If projections fail to start:
1. Check if the domain initialized successfully
2. Ensure MongoDB collections are accessible
3. Check the logs for specific error messages

### Events Not Being Stored

If events aren't being persisted:
1. Verify the provider is connected
2. Check if the indexes were created (should see in logs)
3. Test with the evtstore example first to isolate the issue

## Next Steps

1. **Add Authentication**: Integrate JWT auth with the new routes
2. **Add Validation**: Add Zod schemas for request validation
3. **Add Error Handling**: Enhance error responses
4. **Add Tests**: Create tests for commands and aggregates
5. **Monitor Events**: Add logging/metrics for events

## Need Help?

- Check [src/domain/README.md](src/domain/README.md) for domain documentation
- Review [evtstore/example/](../evtstore/example/) for examples
- Check [EvtStore docs](https://seikho.github.io/evtstore) for API reference
