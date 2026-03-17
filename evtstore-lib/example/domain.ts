import { createDomainV2 } from '../src/domain-v2'
import { user } from './aggregate/user'
import { createMongoProvider } from './config/mongodb'

// Lazy provider initialization
let providerInstance: Awaited<ReturnType<typeof createMongoProvider>> | null = null

export async function getProvider() {
  if (!providerInstance) {
    providerInstance = await createMongoProvider()
  }
  return providerInstance
}

// Create domain with async provider
export async function createDomain() {
  const provider = await getProvider()
  return createDomainV2({ provider }, { user })
}

// Example: Initialize domain on startup
let domainResult: Awaited<ReturnType<typeof createDomain>> | null = null

export async function getDomain() {
  if (!domainResult) {
    domainResult = await createDomain()
  }
  return domainResult
}

// Helper to get the user aggregate directly
export async function getUserAggregate() {
  const result = await getDomain()
  return result.domain.user
}

// Example handler setup
export async function createUserProfilesHandler() {
  const { createHandler } = await getDomain()

  const userProfiles = createHandler('user-profiles', ['user-events'], {
    alwaysTailStream: false,
    continueOnError: false,
    tailStream: false,
  })

  userProfiles.handle('user-events', 'created', async (id, ev, meta) => {
    // Create a profile in your database
    console.log(`Creating user profile for ${id}:`, ev)
  })

  userProfiles.handle('user-events', 'enabled', async (id, ev, meta) => {
    console.log(`User ${id} was enabled`)
  })

  userProfiles.handle('user-events', 'disabled', async (id, ev, meta) => {
    console.log(`User ${id} was disabled`)
  })

  userProfiles.handle('user-events', 'nameChanged', async (id, ev, meta) => {
    console.log(`User ${id} name changed to: ${ev.name}`)
  })

  return userProfiles
}
