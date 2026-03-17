/**
 * Example Express handler with MongoDB
 *
 * This demonstrates how to use EvtStore commands in an Express.js route.
 */

import { userCmd } from '../command/user'

interface CreateUserRequest {
  email: string
  name: string
}

// Wrap in your own try-catch logic
// If you throw in your command handler, this will throw as well
export const createUser = async (req: { body: CreateUserRequest }, res: any) => {
  try {
    // Command handlers return the updated aggregate
    const user = await userCmd.create(req.body.email, { name: req.body.name })

    res.json({
      success: true,
      id: user.aggregateId,
      version: user.version,
      name: user.name,
      enabled: user.enabled,
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Additional example routes for completeness
 */
export const enableUser = async (req: { body: { email: string } }, res: any) => {
  try {
    const user = await userCmd.enable(req.body.email)
    res.json({
      success: true,
      id: user.aggregateId,
      enabled: user.enabled,
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

export const disableUser = async (req: { body: { email: string } }, res: any) => {
  try {
    const user = await userCmd.disable(req.body.email)
    res.json({
      success: true,
      id: user.aggregateId,
      enabled: user.enabled,
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

export const setUserName = async (req: { body: { email: string; name: string } }, res: any) => {
  try {
    const user = await userCmd.setName(req.body.email, { name: req.body.name })
    res.json({
      success: true,
      id: user.aggregateId,
      name: user.name,
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
