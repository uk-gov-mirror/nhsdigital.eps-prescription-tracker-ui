import {logSearchSubmitted} from "@/helpers/searchLogging"
import {logger} from "@/helpers/logger"
import {mockAuthState} from "./mocks/AuthStateMock"
import {AuthContextType} from "@/context/AuthProvider"

jest.mock("@/helpers/logger", () => ({
  logger: {
    debug: jest.fn()
  }
}))

const baseAuth: AuthContextType = {
  ...mockAuthState,
  sessionId: "test-session-id",
  userDetails: undefined,
  selectedRole: undefined
}

describe("logSearchSubmitted", () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it("calls logger.debug with sessionId and searchType", () => {
    logSearchSubmitted(baseAuth, "NHS Number")

    expect(logger.debug).toHaveBeenCalledWith(
      "Search submitted",
      {
        sessionId: "test-session-id",
        userId: undefined,
        orgName: undefined,
        orgCode: undefined,
        searchType: "NHS Number"
      },
      true
    )
  })

  it("includes userId, orgName and orgCode when userDetails and selectedRole are present", () => {
    const auth: AuthContextType = {
      ...baseAuth,
      userDetails: {
        sub: "user-123",
        email: "user@example.com",
        name: "Test User",
        family_name: "User",
        given_name: "Test"
      },
      selectedRole: {
        org_code: "ORG001",
        org_name: "Test Organisation",
        user_id: "user-123",
        role_id: "ROLE123",
        users_role_id: "UR123"
      }
    }

    logSearchSubmitted(auth, "Basic Details")

    expect(logger.debug).toHaveBeenCalledWith(
      "Search submitted",
      {
        sessionId: "test-session-id",
        userId: "user-123",
        orgName: "Test Organisation",
        orgCode: "ORG001",
        searchType: "Basic Details"
      },
      true
    )
  })

})
