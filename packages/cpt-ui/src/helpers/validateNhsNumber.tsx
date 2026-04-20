export type NhsNumberValidationError = "NHS_NUMBER_REQUIRED" | "NHS_NUMBER_INVALID_LENGTH" |
"NHS_NUMBER_INVALID_CHARS" | "NHS_NUMBER_INVALID_CHECKSUM"

export const normalizeNhsNumber = (input: string): string =>
  input.replace(/\s/g, "")

/**
 * Validates NHS number using MOD 11 algorithm.
 * Source: https://digital.nhs.uk/services/nhs-number
 */
export const isValidNhsNumber = (nhsNumber: string): boolean => {
  if (!/^\d{10}$/.test(nhsNumber)) return false

  const digits = nhsNumber.split("").map(Number)
  const checksum = digits
    .slice(0, 9)
    .reduce((sum, digit, idx) => sum + digit * (10 - idx), 0)

  const remainder = checksum % 11
  const checkDigit = 11 - remainder === 11 ? 0 : 11 - remainder

  return checkDigit !== 10 && checkDigit === digits[9]
}

export const validateNhsNumber = (
  rawInput: string
): NhsNumberValidationError | null => {
  const cleaned = normalizeNhsNumber(rawInput)

  if (!cleaned) return "NHS_NUMBER_REQUIRED"
  if (cleaned.length !== 10) return "NHS_NUMBER_INVALID_LENGTH"
  if (!/^\d+$/.test(cleaned)) return "NHS_NUMBER_INVALID_CHARS"
  if (!isValidNhsNumber(cleaned)) return "NHS_NUMBER_INVALID_CHECKSUM"

  return null
}
