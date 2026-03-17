import { createCommands } from '../../src/create-command'
import { getDomain } from '../domain'
import { UserAgg, UserCmd, UserEvt } from '../types/user'
import { BaseAggregate } from '../../src/types'

// Type alias for the full aggregate with base properties
export type UserAggregate = UserAgg & BaseAggregate

// Lazy command initialization
let userCmdInstance: ReturnType<typeof createCommands<UserEvt, UserAgg, UserCmd>> | null = null

export async function getUserCommands() {
  if (!userCmdInstance) {
    const result = await getDomain()
    userCmdInstance = createCommands<UserEvt, UserAgg, UserCmd>(result.domain.user, {
      create: async (cmd, agg) => {
        if (agg.version > 0) throw new Error('User already exists')
        return { type: 'created', name: cmd.name }
      },
      disable: async (_cmd, agg) => {
        if (!agg.enabled) return
        return { type: 'disabled' }
      },
      enable: async (_cmd, agg) => {
        if (agg.enabled) return
        return { type: 'enabled' }
      },
      setName: async (cmd, agg) => {
        if (cmd.name === agg.name) return
        return { type: 'nameChanged', name: cmd.name }
      },
    })
  }
  return userCmdInstance
}

// Convenience wrapper for common operations
export const userCmd = {
  create: async (email: string, data: { name: string }): Promise<UserAggregate> => {
    const commands = await getUserCommands()
    return commands.create(email, data)
  },
  disable: async (email: string): Promise<UserAggregate> => {
    const commands = await getUserCommands()
    return commands.disable(email, {})
  },
  enable: async (email: string): Promise<UserAggregate> => {
    const commands = await getUserCommands()
    return commands.enable(email, {})
  },
  setName: async (email: string, data: { name: string }): Promise<UserAggregate> => {
    const commands = await getUserCommands()
    return commands.setName(email, data)
  },
}
