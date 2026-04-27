import {validateShortFormId} from "@/helpers/prescriptionIdChecksum"

// Enum-like type representing all possible validation errors.
export type PrescriptionValidationError =
  | "PRESCRIPTION_ID_REQUIRED"
  | "PRESCRIPTION_ID_INVALID_CHARS"
  | "PRESCRIPTION_ID_INVALID_LENGTH"
  | "PRESCRIPTION_ID_INVALID_CHECKSUM"

// Converts a raw prescription ID string into a normalized format
export const normalizePrescriptionId = (raw: string): string => {
  const cleaned = raw.replace(/[^a-zA-Z0-9+]/g, "")
  return cleaned.match(/.{1,6}/g)?.join("-").toUpperCase() ?? ""
}

// Validates Prescription ID and returns all errors
export const validatePrescriptionId = (
  rawInput: string
): Array<PrescriptionValidationError> => {
  const raw = rawInput.trim()

  // Check for empty input
  if (!raw) {
    return ["PRESCRIPTION_ID_REQUIRED"]
  }

  // Determine whether input contains invalid characters
  const hasInvalidChars = !/^[a-zA-Z0-9+ -]*$/.test(raw)

  // Remove all characters except alphanumeric and '+' to get a cleaned version
  const cleaned = raw.replace(/[^a-zA-Z0-9+]/g, "").toUpperCase()
  const isInvalidLength = cleaned.length !== 18

  // Return multiple errors for independent validation issues
  const errors: Array<PrescriptionValidationError> = []
  if (hasInvalidChars) errors.push("PRESCRIPTION_ID_INVALID_CHARS")
  if (isInvalidLength) errors.push("PRESCRIPTION_ID_INVALID_LENGTH")

  // If we have character or length errors, don't proceed to checksum validation
  if (errors.length > 0) {
    return errors
  }

  // Format the cleaned input into expected prescription ID structure
  const formatted = normalizePrescriptionId(cleaned)

  // Validate structure of formatted ID
  const shortFormPattern = /^[0-9A-F]{6}-[0-9A-Z]{6}-[0-9A-F]{5}[0-9A-Z+]$/
  if (!shortFormPattern.test(formatted)) {
    return ["PRESCRIPTION_ID_INVALID_CHECKSUM"]
  }

  // Validate checksum using MOD 37-2 algorithm
  if (!validateShortFormId(formatted)) {
    return ["PRESCRIPTION_ID_INVALID_CHECKSUM"]
  }

  // Return empty array if no validation errors were found
  return []
}
