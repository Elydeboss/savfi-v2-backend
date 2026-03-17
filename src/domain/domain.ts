/**
 * SavFi Domain Setup
 *
 * Main domain configuration that initializes EvtStore with MongoDB
 * and sets up all aggregates and commands.
 */

import { createDomainV2 } from '@evtstore/src/domain-v2'
import type { ProvidedAggregate } from '@evtstore/src/types'
import type { UserEvt, UserAgg } from './types/user'
import type { SavingsEvt, SavingsAgg } from './types/savings'
import { user } from './aggregates/user'
import { savings } from './aggregates/savings'
import { createEventStoreProvider } from './config/mongodb'
import { createUserCommands } from './commands/user'
import { createSavingsCommands } from './commands/savings'

// ============================================================================
// PROVIDER & DOMAIN INITIALIZATION
// ============================================================================

// Lazy provider initialization
let providerInstance: Awaited<ReturnType<typeof createEventStoreProvider>> | null = null

export async function getEventStoreProvider() {
  if (!providerInstance) {
    providerInstance = await createEventStoreProvider()
  }
  return providerInstance
}

// Domain result type - using any to avoid circular reference
// The actual type is properly inferred by createDomainV2
type DomainResult = any

let domainResult: DomainResult | null = null

/**
 * Initialize the SavFi domain with MongoDB event store
 */
export async function createDomain(): Promise<any> {
  if (domainResult) {
    return domainResult
  }

  const provider = await getEventStoreProvider()
  domainResult = createDomainV2({ provider }, { user, savings })

  console.log('✅ SavFi domain initialized with EvtStore')

  return domainResult
}

/**
 * Get the domain (aggregates and handlers)
 */
export async function getDomain() {
  if (!domainResult) {
    domainResult = await createDomain()
  }
  return domainResult
}

// ============================================================================
// COMMAND HELPERS
// ============================================================================

let userCommandsInstance: ReturnType<typeof createUserCommands> | null = null

/**
 * Get user command handlers
 */
export async function getUserCommands() {
  if (!userCommandsInstance) {
    const result = await getDomain()
    userCommandsInstance = createUserCommands(result.domain.user)
  }
  return userCommandsInstance
}

let savingsCommandsInstance: ReturnType<typeof createSavingsCommands> | null = null

/**
 * Get savings command handlers
 */
export async function getSavingsCommands() {
  if (!savingsCommandsInstance) {
    const result = await getDomain()
    savingsCommandsInstance = createSavingsCommands(result.domain.savings)
  }
  return savingsCommandsInstance
}

// ============================================================================
// AGGREGATE HELPERS
// ============================================================================

/**
 * Get user aggregate
 */
export async function getUserAggregate() {
  const result = await getDomain()
  return result.domain.user
}

/**
 * Get savings aggregate
 */
export async function getSavingsAggregate() {
  const result = await getDomain()
  return result.domain.savings
}

// ============================================================================
// EXPORTS FOR CONVENIENCE
// ============================================================================

export { user, savings }
export type { UserEvt, UserAgg, UserCmd } from './types/user'
export type { SavingsEvt, SavingsAgg, SavingsCmd } from './types/savings'
