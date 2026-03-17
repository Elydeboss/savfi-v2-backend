/**
 * EvtStore MongoDB Provider Configuration
 *
 * This module sets up the MongoDB connection and provider for EvtStore event sourcing.
 * Events are stored in a separate MongoDB database from the read models.
 */

import { MongoClient, Collection } from 'mongodb'
import { createProvider, migrate, type Bookmark } from '@evtstore/provider/mongo'
import type { StoreEvent } from '@evtstore/src/types'

// MongoDB connection configuration
// FIX: Use the same MongoDB Atlas connection string as the main app
// Leave MONGO_PORT and MONGO_HOST for local development only
const MONGO_PORT = process.env.EVTSTORE_MONGO_PORT || process.env.MONGO_PORT || '27017'
const MONGO_HOST = process.env.EVTSTORE_MONGO_HOST || process.env.MONGO_HOST || 'localhost'
const EVTSTORE_DB = process.env.EVTSTORE_DB || 'savfi_evtstore'

// Use MONGODB_URI (Atlas connection string) if available, otherwise fall back to localhost
const mongoUrl = process.env.MONGODB_URI || `mongodb://${MONGO_HOST}:${MONGO_PORT}`

// Singleton client instance
let client: MongoClient | null = null
let isConnected = false

/**
 * Connect to MongoDB and return the client instance
 */
export async function connectToEventStoreDB(): Promise<MongoClient> {
  if (client && isConnected) {
    return client
  }

  client = new MongoClient(mongoUrl, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 30000,
  })

  await client.connect()
  isConnected = true
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
  await migrate(events, bookmarks)
  console.log('✅ EvtStore MongoDB indexes created')

  // Create and return the provider
  return createProvider({
    events,
    bookmarks,
    onError: (err: Error, stream: string, bookmark: string, event: StoreEvent<any>) => {
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
  if (client) {
    await client.close()
    isConnected = false
    console.log('✅ EvtStore MongoDB connection closed')
  }
}
