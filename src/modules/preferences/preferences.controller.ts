// Packages:
import { getPreferences, updatePreferences } from './preferences.service'

// Typescript:
import type { Request, Response } from 'express'

// Functions:
const getMyPreferences = async (req: Request, res: Response) => {
  const result = await getPreferences(req.userId)
  return res.status(200).json(result)
}

const putMyPreferences = async (req: Request, res: Response) => {
  const result = await updatePreferences(req.userId, req.body)
  return res.status(200).json(result)
}

// Exports:
export { getMyPreferences, putMyPreferences }
