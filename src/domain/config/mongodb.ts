/**
 * EvtStore MongoDB Provider Configuration
 *
 * This module sets up the MongoDB connection and provider for EvtStore event sourcing.
 * Events are stored in a separate MongoDB database from the read models.
 */

import { MongoClient, Collection } from 'mongodb'
import { createProvider, migrate, type Bookmark } from '@evtstore/provider/mongo'
import type { StoreEvent } from '@evtstore/src/types'

// Declare global variable for MongoDB client caching in serverless environments
declare global {
  var _mongoEventClient: MongoClient | null;
  var _mongoEventConnected: boolean;
}

// Initialize globals if they don't exist
if (!global._mongoEventClient) {
  global._mongoEventClient = null;
}
if (!global._mongoEventConnected) {
  global._mongoEventConnected = false;
}

// MongoDB connection configuration
// FIX: Use the same MongoDB Atlas connection string as the main app
// Leave MONGO_PORT and MONGO_HOST for local development only
const MONGO_PORT = process.env.EVTSTORE_MONGO_PORT || process.env.MONGO_PORT || '27017'
const MONGO_HOST = process.env.EVTSTORE_MONGO_HOST || process.env.MONGO_HOST || 'localhost'
const EVTSTORE_DB = process.env.EVTSTORE_DB || 'savfi_evtstore'

// Use MONGODB_URI (Atlas connection string) if available, otherwise fall back to localhost
const mongoUrl = process.env.MONGODB_URI || `mongodb://${MONGO_HOST}:${MONGO_PORT}`

/**
 * Connect to MongoDB and return the client instance
 * Uses GLOBAL caching for serverless environments (Vercel)
 */
export async function connectToEventStoreDB(): Promise<MongoClient> {
  // Return cached client if available and connected (warm function instance)
  if (global._mongoEventClient && global._mongoEventConnected) {
    return global._mongoEventClient;
  }

  const client = new MongoClient(mongoUrl, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 30000,
  })

  await client.connect()

  // Store in global for reuse across Vercel function invocations
  global._mongoEventClient = client;
  global._mongoEventConnected = true;

  console.log(`✅ Connected to EvtStore MongoDB at ${mongoUrl}`)

  return client
}

/**
 * Get MongoDB collections for events and bookmarks
 */
export async function getEventStoreCollections() {
  const client = await connectToEventStoreDB()
  const db = client.db(EVTSTORE_DB)

  const events = db.collection<StoreEvent<any>>('events')
  const bookmarks = db.collection<Bookmark>('bookmarks')

  return { events, bookmarks }
}

/**
 * Create MongoDB provider with proper migrations
 */
export async function createEventStoreProvider() {
  const { events, bookmarks } = await getEventStoreCollections()

  // Run migrations to create indexes
  await migrate(events as any, bookmarks as any)
  console.log('✅ EvtStore MongoDB indexes created')

  // Create and return the provider
  return createProvider({
    events: events as any,
    bookmarks: bookmarks as any,
    onError: (err: Error, stream: string, bookmark: string, event: any) => {
      console.error('❌ EvtStore Provider Error:', {
        stream,
        bookmark,
        event,
        error: err.message,
      })
    },
  })
}

/**
 * Close MongoDB connection
 */
export async function closeEventStoreDB() {
  if (global._mongoEventClient) {
    await global._mongoEventClient.close();
    global._mongoEventClient = null;
    global._mongoEventConnected = false;
    console.log('✅ EvtStore MongoDB connection closed')
  }
}
