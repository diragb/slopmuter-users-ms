// Packages:
import { getUserFullProfile, updateUserProfile, exportUserData, deleteAccount } from './users.service'

// Typescript:
import type { Request, Response } from 'express'

// Functions:
const getProfile = async (req: Request, res: Response) => {
  const result = await getUserFullProfile(req.userId)
  return res.status(200).json(result)
}

const patchProfile = async (req: Request, res: Response) => {
  const result = await updateUserProfile(req.userId, req.body)
  return res.status(200).json(result)
}

const deleteProfile = async (req: Request, res: Response) => {
  await deleteAccount(req.userId)
  return res.status(204).send()
}

const getExport = async (req: Request, res: Response) => {
  const result = await exportUserData(req.userId)
  return res.status(200).json(result)
}

// Exports:
export { getProfile, patchProfile, deleteProfile, getExport }
