import {AuthContextType} from "@/context/AuthProvider"
import {logger} from "@/helpers/logger"

export type SearchType = "Basic Details" | "NHS Number" | "Prescription ID"

// Logs a search-submit event to the local debug log and forwards it to RUM.

export function logSearchSubmitted(auth: AuthContextType, searchType: SearchType): void {
  logger.debug("Search submitted", {
    sessionId: auth.sessionId,
    userId: auth.userDetails?.sub,
    orgName: auth.selectedRole?.org_name,
    orgCode: auth.selectedRole?.org_code,
    searchType
  }, true)
}
