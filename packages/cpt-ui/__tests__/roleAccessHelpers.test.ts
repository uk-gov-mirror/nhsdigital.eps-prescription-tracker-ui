import {hasSelectedRoleAccess} from "@/helpers/roleAccessHelpers"
import {AuthContextType} from "@/context/AuthProvider"
import {RoleDetails} from "@cpt-ui-common/common-types"

const mockAuthContext = (overrides: Partial<AuthContextType> = {}): AuthContextType => ({
  error: null,
  user: null,
  isSignedIn: false,
  isSigningIn: false,
  isSigningOut: false,
  isConcurrentSession: false,
  invalidSessionCause: undefined,
  sessionId: undefined,
  deviceId: undefined,
  rolesWithAccess: [],
  rolesWithoutAccess: [],
  selectedRole: undefined,
  userDetails: undefined,
  remainingSessionTime: undefined,
  logoutMarker: undefined,
  sessionTimeoutModalInfo: {
    isOpen: false,
    remainingTime: 0
  },
  logoutModalType: undefined,
  setSessionTimeoutModalInfo: jest.fn(),
  setLogoutMarker: jest.fn(),
  setLogoutModalType: jest.fn(),
  cognitoSignIn: jest.fn(),
  cognitoSignOut: jest.fn(),
  clearAuthState: jest.fn(),
  hasSingleRoleAccess: jest.fn(),
  updateSelectedRole: jest.fn(),
  updateTrackerUserInfo: jest.fn(),
  updateInvalidSessionCause: jest.fn(),
  setIsSigningOut: jest.fn(),
  setStateForSignOut: jest.fn(),
  setStateForSignIn: jest.fn(),
  ...overrides
})

const mockRole1: RoleDetails = {
  role_id: "role-1",
  role_name: "Pharmacist",
  org_code: "ORG001",
  org_name: "Test Pharmacy"
}

const mockRole2: RoleDetails = {
  role_id: "role-2",
  role_name: "Technician",
  org_code: "ORG002",
  org_name: "Tech Org"
}

describe("hasSelectedRoleAccess", () => {
  describe("when selectedRole is null/undefined", () => {
    it("returns false when selectedRole is null", () => {
      const auth = mockAuthContext({
        selectedRole: null,
        rolesWithAccess: [mockRole1]
      })

      expect(hasSelectedRoleAccess(auth)).toBe(false)
    })

    it("returns false when selectedRole is undefined", () => {
      const auth = mockAuthContext({
        selectedRole: undefined,
        rolesWithAccess: [mockRole1]
      })

      expect(hasSelectedRoleAccess(auth)).toBe(false)
    })
  })

  describe("when selectedRole exists", () => {
    it("returns true when selectedRole is in rolesWithAccess", () => {
      const auth = mockAuthContext({
        selectedRole: mockRole1,
        rolesWithAccess: [mockRole1, mockRole2]
      })

      expect(hasSelectedRoleAccess(auth)).toBe(true)
    })

    it("returns false when selectedRole is not in rolesWithAccess", () => {
      const selectedRoleNotInAccess: RoleDetails = {
        role_id: "role-3",
        role_name: "Admin",
        org_code: "ORG003",
        org_name: "Admin Org"
      }

      const auth = mockAuthContext({
        selectedRole: selectedRoleNotInAccess,
        rolesWithAccess: [mockRole1, mockRole2]
      })

      expect(hasSelectedRoleAccess(auth)).toBe(false)
    })

    it("returns false when rolesWithAccess is empty", () => {
      const auth = mockAuthContext({
        selectedRole: mockRole1,
        rolesWithAccess: []
      })

      expect(hasSelectedRoleAccess(auth)).toBe(false)
    })

    it("returns true when selectedRole matches by role_id (even with different other properties)", () => {
      const selectedRole: RoleDetails = {
        role_id: "role-1",
        role_name: "Different Name",
        org_code: "DIFFERENT",
        org_name: "Different Org"
      }

      const auth = mockAuthContext({
        selectedRole: selectedRole,
        rolesWithAccess: [mockRole1]
      })

      expect(hasSelectedRoleAccess(auth)).toBe(true)
    })
  })

  describe("edge cases", () => {
    it("handles selectedRole with undefined role_id", () => {
      const selectedRoleNoId: RoleDetails = {
        role_id: undefined as unknown as string,
        role_name: "No ID Role",
        org_code: "NO_ID",
        org_name: "No ID Org"
      }

      const auth = mockAuthContext({
        selectedRole: selectedRoleNoId,
        rolesWithAccess: [mockRole1]
      })

      expect(hasSelectedRoleAccess(auth)).toBe(false)
    })

    it("handles role in rolesWithAccess with undefined role_id", () => {
      const roleWithoutId: RoleDetails = {
        role_id: undefined as unknown as string,
        role_name: "Role Without ID",
        org_code: "NO_ID",
        org_name: "No ID Org"
      }

      const auth = mockAuthContext({
        selectedRole: mockRole1,
        rolesWithAccess: [roleWithoutId]
      })

      expect(hasSelectedRoleAccess(auth)).toBe(false)
    })
  })
})
