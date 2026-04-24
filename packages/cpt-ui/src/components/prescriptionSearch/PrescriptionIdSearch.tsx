import React, {
  useState,
  useEffect,
  useRef,
  Fragment
} from "react"
import {useNavigate} from "react-router-dom"

import {
  Label,
  HintText,
  TextInput,
  Form,
  ErrorSummary,
  ErrorMessage,
  FormGroup,
  Button
} from "nhsuk-react-components"

import {PRESCRIPTION_ID_SEARCH_STRINGS} from "@/constants/ui-strings/SearchForAPrescriptionStrings"
import {FRONTEND_PATHS} from "@/constants/environment"
import {
  validatePrescriptionId,
  normalizePrescriptionId,
  PrescriptionValidationError
} from "@/helpers/validatePrescriptionDetailsSearch"
import {useAuth} from "@/context/AuthProvider"
import {logSearchSubmitted} from "@/helpers/searchLogging"
import {useSearchContext} from "@/context/SearchProvider"
import {useNavigationContext} from "@/context/NavigationProvider"
import {usePageTitle} from "@/hooks/usePageTitle"
import {logger} from "@/helpers/logger"
import {useAuth} from "@/context/AuthProvider"

export default function PrescriptionIdSearch() {
  const auth = useAuth()
  const navigate = useNavigate()
  const errorRef = useRef<HTMLDivElement | null>(null)
  const searchContext = useSearchContext()
  const navigationContext = useNavigationContext()
  const authContext = useAuth()

  const [prescriptionId, setPrescriptionId] = useState<string>(searchContext.prescriptionId || "")
  const [errors, setErrors] = useState<Array<PrescriptionValidationError>>([])

  const errorMessages = PRESCRIPTION_ID_SEARCH_STRINGS.ERRORS

  useEffect(() => {
    const relevantParams = navigationContext.getRelevantSearchParameters("prescriptionId")
    if (relevantParams && relevantParams.prescriptionId) {
      setPrescriptionId(relevantParams.prescriptionId || "")
    }
  }, [navigationContext])

  usePageTitle(errors.length > 0
    ? PRESCRIPTION_ID_SEARCH_STRINGS.PAGE_TITLE_ERROR
    : PRESCRIPTION_ID_SEARCH_STRINGS.PAGE_TITLE)

  useEffect(() => {
    if (
      searchContext.prescriptionId &&
      searchContext.searchType === "prescriptionId"
    ) {
      setPrescriptionId(searchContext.prescriptionId)
    }
  }, [searchContext.prescriptionId, searchContext.searchType])

  useEffect(() => {
    if (errors.length > 0 && errorRef.current) errorRef.current.focus()
  }, [errors])

  // Handle input field change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrescriptionId(e.target.value)
  }

  // Form submit handler
  const handlePrescriptionDetails = (e: React.FormEvent) => {
    e.preventDefault()
    const validationErrors = validatePrescriptionId(prescriptionId)

    if (validationErrors.length > 0) {
      setErrors(validationErrors)

      logger.debug("Form validation errors", {
        sessionId: authContext.sessionId,
        userId: authContext.userDetails?.sub,
        orgName: authContext.selectedRole?.org_name,
        orgCode: authContext.selectedRole?.org_code,
        searchType: "prescriptionIDSearch",
        errors: validationErrors.join(", "),
        errorCount: validationErrors.length
      }, true)

      return
    }
    setErrors([]) // Clear errors on valid submit

    const formatted = normalizePrescriptionId(prescriptionId)

    logSearchSubmitted(auth, "Prescription ID")

    //clear previous search context
    navigationContext.startNewNavigationSession()

    const originalParams = {
      prescriptionId: formatted
    }
    navigationContext.captureOriginalSearchParameters(
      "prescriptionId",
      originalParams
    )

    searchContext.clearSearchParameters()
    searchContext.setPrescriptionId(formatted)
    searchContext.setSearchType("prescriptionId")
    navigate(`${FRONTEND_PATHS.PRESCRIPTION_LIST_CURRENT}`)
  }

  return (
    <Fragment>
      {errors.length > 0 && (
        <ErrorSummary
          data-testid="error-summary"
          ref={errorRef}
          className="prescription-id-aligned-element"
        >
          <ErrorSummary.Title>
            {PRESCRIPTION_ID_SEARCH_STRINGS.ERROR_SUMMARY_HEADING}
          </ErrorSummary.Title>
          <ErrorSummary.Body>
            <ErrorSummary.List>
              {errors.map((error) => (
                <ErrorSummary.Item key={error} href="#presc-id-input">
                  {errorMessages[error]}
                </ErrorSummary.Item>
              ))}
            </ErrorSummary.List>
          </ErrorSummary.Body>
        </ErrorSummary>
      )}
      <div className="prescription-id-aligned-element">
        <Form onSubmit={handlePrescriptionDetails} noValidate>
          <FormGroup className={errors.length > 0 ? "nhsuk-form-group--error" : ""}>
            <Label htmlFor="presc-id-input" id="presc-id-label">
              <h2
                className="nhsuk-heading-m nhsuk-u-margin-bottom-1 no-outline"
                data-testid="prescription-id-search-heading"
              >
                {PRESCRIPTION_ID_SEARCH_STRINGS.LABEL_TEXT}
              </h2>
              <HintText id="presc-id-hint" data-testid="prescription-id-hint">
                {PRESCRIPTION_ID_SEARCH_STRINGS.HINT_TEXT}
              </HintText>
            </Label>
            {errors.length > 0 && (
              <ErrorMessage id="presc-id-error" data-testid="error-message-multiple">
                {errors.map((error, index) => (
                  <div key={error}>
                    {errorMessages[error]}
                    {index < errors.length - 1 && <br />}
                  </div>
                ))}
              </ErrorMessage>
            )}
            <TextInput
              id="presc-id-input"
              name="prescriptionId"
              value={prescriptionId}
              onChange={handleInputChange}
              className={errors.length > 0 ? "nhsuk-input nhsuk-input--error" : "nhsuk-input"}
              autoComplete="off"
              data-testid="prescription-id-input"
              aria-describedby={errors.length > 0 ? "presc-id-hint presc-id-error" : "presc-id-hint"}
            />
          </FormGroup>
          <Button type="submit" data-testid="find-prescription-button">
            {PRESCRIPTION_ID_SEARCH_STRINGS.BUTTON_TEXT}
          </Button>
        </Form>
      </div>
    </Fragment>
  )
}
