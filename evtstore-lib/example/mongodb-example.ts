/**
 * EvtStore MongoDB Example
 *
 * This example demonstrates how to use EvtStore with MongoDB for event sourcing.
 *
 * Prerequisites:
 * 1. Start MongoDB: docker-compose up -d mongo
 * 2. Or set MONGO_HOST and MONGO_PORT environment variables
 *
 * Usage:
 * ts-node example/mongodb-example.ts
 */

import { getDomain, createUserProfilesHandler, getUserAggregate } from './domain'
import { userCmd, type UserAggregate } from './command/user'
import { closeMongoDB } from './config/mongodb'

async function main() {
  console.log('🚀 Starting EvtStore MongoDB Example...\n')

  try {
    // 1. Initialize the domain (connects to MongoDB and creates indexes)
    console.log('1️⃣ Initializing domain...')
    await getDomain()
    console.log('✅ Domain initialized\n')

    // 2. Set up event handlers
    console.log('2️⃣ Setting up event handlers...')
    const handler = await createUserProfilesHandler()
    handler.start()
    console.log('✅ Event handlers started\n')

    // 3. Create a user
    console.log('3️⃣ Creating user...')
    const userId = 'user-123'
    const createdUser = await userCmd.create(userId, { name: 'John Doe' })
    console.log('✅ User created:', {
      id: createdUser.aggregateId,
      version: createdUser.version,
      name: createdUser.name,
      enabled: createdUser.enabled,
    })
    console.log()

    // 4. Enable the user
    console.log('4️⃣ Enabling user...')
    const enabledUser = await userCmd.enable(userId)
    console.log('✅ User enabled:', {
      version: enabledUser.version,
      enabled: enabledUser.enabled,
    })
    console.log()

    // 5. Change user name
    console.log('5️⃣ Changing user name...')
    const renamedUser = await userCmd.setName(userId, { name: 'Jane Doe' })
    console.log('✅ User renamed:', {
      version: renamedUser.version,
      name: renamedUser.name,
    })
    console.log()

    // 6. Disable the user
    console.log('6️⃣ Disabling user...')
    const disabledUser = await userCmd.disable(userId)
    console.log('✅ User disabled:', {
      version: disabledUser.version,
      enabled: disabledUser.enabled,
    })
    console.log()

    // 7. Read current user state
    console.log('7️⃣ Reading current user state...')
    const userAggregate = await getUserAggregate()
    const currentUser: UserAggregate = await userAggregate.getAggregate(userId)
    console.log('✅ Current user state:', {
      id: currentUser.aggregateId,
      version: currentUser.version,
      name: currentUser.name,
      enabled: currentUser.enabled,
    })
    console.log()

    // 8. Stop handlers
    console.log('8️⃣ Stopping event handlers...')
    handler.stop()
    console.log('✅ Event handlers stopped\n')

    console.log('✨ Example completed successfully!')
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    // Close MongoDB connection
    await closeMongoDB()
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error)
}

export { main }
