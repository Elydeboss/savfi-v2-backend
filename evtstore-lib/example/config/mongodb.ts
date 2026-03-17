import { MongoClient, Collection } from 'mongodb'
import { createProvider, migrate, Bookmark } from '../../provider/mongo'
import { StoreEvent } from '../../src/types'

// MongoDB connection configuration
const MONGO_PORT = process.env.MONGO_PORT || '30001'
const MONGO_HOST = process.env.MONGO_HOST || 'localhost'
const MONGO_DB = process.env.MONGO_DB || 'evtstore'

const mongoUrl = `mongodb://${MONGO_HOST}:${MONGO_PORT}`

// Singleton client instance
let client: MongoClient | null = null
let isConnected = false

/**
 * Connect to MongoDB and return the client instance
 */
export async function connectToMongoDB(): Promise<MongoClient> {
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
  console.log(`✅ Connected to MongoDB at ${mongoUrl}`)

  return client
}

/**
 * Get MongoDB collections for events and bookmarks
 */
export async function getCollections() {
  const client = await connectToMongoDB()
  const db = client.db(MONGO_DB)

  const events: Collection<StoreEvent<any>> = db.collection('events')
  const bookmarks: Collection<Bookmark> = db.collection('bookmarks')

  return { events, bookmarks }
}

/**
 * Create MongoDB provider with proper migrations
 */
export async function createMongoProvider() {
  const { events, bookmarks } = await getCollections()

  // Run migrations to create indexes
  await migrate(events, bookmarks)
  console.log('✅ MongoDB indexes created')

  // Create and return the provider
  return createProvider({
    events,
    bookmarks,
    onError: (err, stream, bookmark, event) => {
      console.error('❌ MongoDB Provider Error:', {
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
export async function closeMongoDB() {
  if (client) {
    await client.close()
    isConnected = false
    console.log('✅ MongoDB connection closed')
  }
}
