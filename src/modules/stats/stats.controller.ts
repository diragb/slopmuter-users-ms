// Functions:
import { getUserStats } from './stats.service'

// Typescript:
import type { Request, Response } from 'express'

// Functions:
const getMyStats = async (req: Request, res: Response) => {
  const result = await getUserStats(req.userId)
  return res.status(200).json(result)
}

// Exports:
export { getMyStats }
