// Functions:
const popcount = (num: number): number => {
  let count = 0
  let value = num
  while (value) {
    count += value & 1
    value >>>= 1
  }

  return count
}

// Exports:
export { popcount }
