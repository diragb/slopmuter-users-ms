// Constants:
const EXPIRY_MAP: Record<number, number> = {
  1: 7, // 1st offense: 1 week (days)
  2: 30, // 2nd: 1 month
  3: 180, // 3rd: 6 months
  4: 730, // 4th: 2 years
}

const MAX_EXPIRY_DAYS = 1825 // 5th+: 5 years

// Functions:
const computeExpiryDate = (offenseNumber: number): Date => {
  const days = EXPIRY_MAP[offenseNumber] ?? MAX_EXPIRY_DAYS
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + days)
  return expiry
}

// Exports:
export { computeExpiryDate, EXPIRY_MAP, MAX_EXPIRY_DAYS }
