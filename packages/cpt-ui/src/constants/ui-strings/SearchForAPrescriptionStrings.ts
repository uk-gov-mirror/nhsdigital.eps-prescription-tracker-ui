export const HERO_TEXT = "Search for a prescription"

export const PRESCRIPTION_ID_SEARCH_STRINGS = {
  pageTitle: "Search for a prescription - Prescription Tracker",
  pageTitle_ERROR: "No prescriptions found - Prescription Tracker",
  labelText: "Search using a prescription ID",
  hintText: "This is 18 characters and may also be called barcode or token ID.",
  buttonText: "Find a prescription",
  errorSummaryHeading: "There is a problem",
  errors: {
    PRESCRIPTION_ID_REQUIRED: "Enter a prescription ID number",
    PRESCRIPTION_ID_INVALID_LENGTH: "The prescription ID number must contain 18 characters",
    PRESCRIPTION_ID_INVALID_CHARS: "The prescription ID number must contain only letters, "
    + "numbers, dashes or the + character",
    PRESCRIPTION_ID_INVALID_CHECKSUM: "The prescription ID number is not recognised"
  }
}
