import {jest} from "@jest/globals"
import {Logger} from "@aws-lambda-powertools/logger"
import {mockContext, mockAPIGatewayProxyEvent} from "./mockObjects"

// Mocked functions from authFunctions
const mockGetTokenMapping = jest.fn().mockName("mockGetTokenMapping")
const mockInitializeOidcConfig = jest.fn().mockName("mockInitializeOidcConfig")
const mockUpdateTokenMapping = jest.fn().mockName("mockUpdateTokenMapping")
const mockFetchUserInfo = jest.fn().mockName("mockFetchUserInfo")
mockInitializeOidcConfig.mockImplementation(() => ({cis2OidcConfig: {}, mockOidcConfig: {}}))

jest.unstable_mockModule("@cpt-ui-common/dynamoFunctions", () => {
  return {
    getTokenMapping: mockGetTokenMapping,
    updateTokenMapping: mockUpdateTokenMapping
  }
})
jest.unstable_mockModule("@cpt-ui-common/authFunctions", () => {
  return {
    authParametersFromEnv: () => ({
      tokenMappingTableName: "TokenMappingTable",
      sessionManagementTableName: "SessionManagementTable"
    }),
    authenticationConcurrentAwareMiddleware: () => ({before: () => {}}),
    initializeOidcConfig: mockInitializeOidcConfig,
    fetchUserInfo: mockFetchUserInfo
  }
})

const {handler} = await import("../src/handler")

describe("Lambda Handler Tests with mock disabled", () => {
  let event: typeof mockAPIGatewayProxyEvent & {
    requestContext: {
      authorizer: {
        username?: string
        sessionId?: string
        apigeeAccessToken?: string
        isConcurrentSession?: boolean
      }
    }
  }
  let context = {...mockContext}

  beforeEach(() => {
    jest.resetAllMocks()
    // Reset event to clean state before each test
    event = {
      ...mockAPIGatewayProxyEvent,
      requestContext: {
        ...mockAPIGatewayProxyEvent.requestContext,
        authorizer: {}
      }
    }
    context = {...mockContext}
  })

  it("should return a successful response when cached details returned", async () => {
    mockGetTokenMapping.mockImplementation(() => {
      return {
        rolesWithAccess: [
          {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}
        ],
        rolesWithoutAccess: [],
        currentlySelectedRole: {role_id: "555", org_code: "GHI", role_name: "MockRole_4"},
        userDetails: {
          family_name: "foo",
          given_name: "bar"
        }
      }
    })

    event.requestContext.authorizer = {
      username: "test_user",
      isConcurrentSession: false
    }

    const response = await handler(event, context)

    expect(response).toBeDefined()
    expect(response).toHaveProperty("statusCode", 200)
    expect(response).toHaveProperty("body")

    const body = JSON.parse(response.body)
    expect(body).toHaveProperty("message", "UserInfo fetched successfully from DynamoDB")
    expect(body).toHaveProperty("userInfo")
  })

  it("should return a successful response when no cached details returned", async () => {
    mockGetTokenMapping.mockImplementation(() => {
      return {
        userDetails: {
          family_name: "foo",
          given_name: "bar"
        },
        cis2IdToken: "cis2_id_token",
        cis2AccessToken: "cis2_access_token"
      }
    })
    event.requestContext.authorizer = {
      username: "test_user",
      apigeeAccessToken: "apigee_access_token",
      isConcurrentSession: false
    }
    mockFetchUserInfo.mockImplementation(() => {
      return Promise.resolve({
        roles_with_access: [
          {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}
        ],
        roles_without_access: [],
        currently_selected_role: {role_id: "555", org_code: "GHI", role_name: "MockRole_4"},
        user_details: {
          family_name: "foo",
          given_name: "bar"
        }
      })
    })
    const response = await handler(event, context)

    expect(response).toBeDefined()
    expect(response).toHaveProperty("statusCode", 200)
    expect(response).toHaveProperty("body")

    const body = JSON.parse(response.body)
    expect(body).toHaveProperty("message", "UserInfo fetched successfully from the OIDC endpoint")
    expect(body).toHaveProperty("userInfo")
    expect(mockUpdateTokenMapping).toHaveBeenCalledWith(
      expect.anything(),
      "TokenMappingTable",
      expect.objectContaining({
        username: "test_user"
      }),
      expect.anything()
    )
  })

  it("should return error when a mock token and no apigee access token", async () => {
    const loggerSpy = jest.spyOn(Logger.prototype, "error")

    mockGetTokenMapping.mockImplementation(() => {
      return {
        userDetails: {
          family_name: "foo",
          given_name: "bar"
        },
        cis2IdToken: "cis2_id_token",
        cis2AccessToken: "cis2_access_token"
      }
    })
    event.requestContext.authorizer = {
      username: "Mock_test_user",
      isConcurrentSession: false
    }

    const response = await handler(event, context)

    // Check response format matches what the middleware produces
    expect(response).toMatchObject({
      message: "A system error has occurred"
    })

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.any(Object),
      "Error: Authentication failed for mock: missing tokens"
    )
  })

  it("should return error when not a mock token and no cis access token", async () => {
    const loggerSpy = jest.spyOn(Logger.prototype, "error")

    mockGetTokenMapping.mockImplementation(() => {
      return {
        userDetails: {
          family_name: "foo",
          given_name: "bar"
        },
        cis2AccessToken: "cis2_access_token"
      }
    })
    event.requestContext.authorizer = {
      username: "test_user",
      apigeeAccessToken: "apigee_access_token",
      isConcurrentSession: false
    }

    const response = await handler(event, context)

    // Check response format matches what the middleware produces
    expect(response).toMatchObject({
      message: "A system error has occurred"
    })

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.any(Object),
      "Error: Authentication failed for cis2: missing tokens"
    )
  })

  it("should return user info if roles_with_access is not empty", async () => {
    mockGetTokenMapping.mockImplementation(() => {
      return {
        rolesWithAccess: [
          {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}
        ],
        rolesWithoutAccess: [],
        currentlySelectedRole: {role_id: "555", org_code: "GHI", role_name: "MockRole_4"},
        userDetails: {
          family_name: "Doe",
          given_name: "John"
        }
      }
    })

    const response = await handler(event, context)

    expect(response.statusCode).toBe(200)
    expect(response.body).toContain("UserInfo fetched successfully from DynamoDB")

    const responseBody = JSON.parse(response.body)
    expect(responseBody.userInfo).toEqual({
      "currently_selected_role": {role_id: "555", org_code: "GHI", role_name: "MockRole_4"},
      "roles_with_access": [
        {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}
      ],
      "roles_without_access": [],
      "user_details": {"family_name": "Doe", "given_name": "John"}
    })
  })

  it("should return user info if roles_without_access is not empty", async () => {
    mockGetTokenMapping.mockImplementation(() => {
      return {
        rolesWithAccess: [
          {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}
        ],
        rolesWithoutAccess: [
          {role_name: "Receptionist", role_id: "456", org_code: "DEF", org_name: "Test Hospital"}
        ],
        currentlySelectedRole: {role_id: "555", org_code: "GHI", role_name: "MockRole_4"},
        userDetails: {
          family_name: "Doe",
          given_name: "John"
        }
      }
    })

    const response = await handler(event, context)

    expect(response.statusCode).toBe(200)
    expect(response.body).toContain("UserInfo fetched successfully from DynamoDB")

    const responseBody = JSON.parse(response.body)
    expect(responseBody.userInfo).toEqual({
      "currently_selected_role": {role_id: "555", org_code: "GHI", role_name: "MockRole_4"},
      "roles_with_access": [
        {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}
      ],
      "roles_without_access": [
        {role_name: "Receptionist", role_id: "456", org_code: "DEF", org_name: "Test Hospital"}
      ],
      "user_details": {"family_name": "Doe", "given_name": "John"}
    }
    )
  })

  it("should return cached user info even if currently_selected_role is undefined", async () => {
    mockGetTokenMapping.mockImplementation(() => {
      return {
        rolesWithAccess: [
          {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}
        ],
        rolesWithoutAccess: [
          {role_name: "Receptionist", role_id: "456", org_code: "DEF", org_name: "Test Hospital"}
        ],
        currentlySelectedRole: {},
        userDetails: {
          family_name: "Doe",
          given_name: "John"
        }
      }
    })

    event.requestContext.authorizer = {
      username: "test_user",
      isConcurrentSession: false
    }

    const response = await handler(event, context)

    expect(response.statusCode).toBe(200)
    expect(response.body).toContain("UserInfo fetched successfully from DynamoDB")

    const responseBody = JSON.parse(response.body)
    expect(responseBody.userInfo).toMatchObject({
      "currently_selected_role":  {},
      "roles_with_access": [
        {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}
      ],
      "roles_without_access": [
        {role_name: "Receptionist", role_id: "456", org_code: "DEF", org_name: "Test Hospital"}
      ],
      "user_details": {"family_name": "Doe", "given_name": "John"},
      "is_concurrent_session": false}
    )
  })

  it("should return a successful response with concurrency values set, \
    when cached details returned and token session found with matching ID", async () => {
    mockGetTokenMapping.mockImplementation(() => {
      return {
        rolesWithAccess: [
          {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}
        ],
        rolesWithoutAccess: [],
        sessionId: "mock-session-id",
        currentlySelectedRole: {role_id: "555", org_code: "GHI", role_name: "MockRole_4"},
        userDetails: {
          family_name: "foo",
          given_name: "bar"
        }
      }
    })

    event.requestContext.authorizer = {
      username: "Mock_test_user",
      sessionId: "mock-session-id",
      isConcurrentSession: true
    }

    const response = await handler(event, context)

    expect(mockGetTokenMapping).toHaveBeenCalledWith(expect.anything(),
      "SessionManagementTable",
      event.requestContext.authorizer.username, expect.anything())
    expect(response).toBeDefined()
    expect(response).toHaveProperty("statusCode", 200)
    expect(response).toHaveProperty("body")

    const body = JSON.parse(response.body)
    expect(body.userInfo).toEqual({
      "currently_selected_role":  {
        "org_code": "GHI",
        "role_id": "555",
        "role_name": "MockRole_4"
      },
      "roles_with_access": [
        {"org_code": "XYZ",
          "role_id": "123",
          "role_name": "MockRole_1"
        }
      ],
      "roles_without_access": [],
      "sessionId": "mock-session-id",
      "user_details": {"family_name": "foo", "given_name": "bar"},
      "is_concurrent_session": true
    })

    expect(body).toHaveProperty("message", "UserInfo fetched successfully from DynamoDB")
    expect(body).toHaveProperty("userInfo")
  })

  it("should return a successful response with concurrency values set, \
    when user details returned and token session found with matching ID", async () => {
    const cis2_id = "cis2_id_token"
    const cis2_a_t = "cis2_access_token"
    // Mock Date.now() to have predictable time calculations
    const fixedTime = 1000000000000
    const dateNowSpy = jest.spyOn(Date, "now").mockReturnValue(fixedTime)

    mockGetTokenMapping.mockImplementation(() => {
      return {
        userDetails: {
          family_name: "foo",
          given_name: "bar"
        },
        cis2IdToken: cis2_id,
        cis2AccessToken: cis2_a_t,
        lastActivityTime: fixedTime // Set to current time for ~15 min remaining
      }
    })

    mockFetchUserInfo.mockImplementation(() => {
      return Promise.resolve({
        roles_with_access: [
          {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}
        ],
        roles_without_access: [],
        currently_selected_role: {role_id: "555", org_code: "GHI", role_name: "MockRole_4"},
        user_details: {
          family_name: "foo",
          given_name: "bar"
        }
      })
    })
    event.requestContext.authorizer = {
      username: "test_user",
      sessionId: "mock-session-id",
      apigeeAccessToken: "mock",
      isConcurrentSession: true
    }

    const response = await handler(event, context)

    expect(mockGetTokenMapping).toHaveBeenCalledWith(expect.anything(),
      "SessionManagementTable",
      event.requestContext.authorizer.username, expect.anything())
    expect(mockFetchUserInfo).toHaveBeenCalledWith(
      cis2_a_t,
      cis2_id,
      event.requestContext.authorizer.apigeeAccessToken,
      false,
      expect.anything(),
      {} // oidc
    )
    expect(mockUpdateTokenMapping).toHaveBeenCalledWith(
      expect.anything(),
      "SessionManagementTable",
      expect.objectContaining({
        username: "test_user"
      }),
      expect.anything()
    )
    expect(response).toBeDefined()
    expect(response).toHaveProperty("statusCode", 200)
    expect(response).toHaveProperty("body")

    const body = JSON.parse(response.body)
    expect(body.userInfo).toMatchObject({
      "currently_selected_role":  {
        "org_code": "GHI",
        "role_id": "555",
        "role_name": "MockRole_4"
      },
      "roles_with_access": [
        {"org_code": "XYZ",
          "role_id": "123",
          "role_name": "MockRole_1"
        }
      ],
      "roles_without_access": [],
      "user_details": {"family_name": "foo", "given_name": "bar"},
      "is_concurrent_session": true,
      "sessionId": "mock-session-id"
    })
    // remainingSessionTime should be exactly 15 minutes (900000ms) since lastActivityTime = now
    expect(body.userInfo.remainingSessionTime).toBe(900000)

    expect(body).toHaveProperty("message", "UserInfo fetched successfully from the OIDC endpoint")
    expect(body).toHaveProperty("userInfo")

    dateNowSpy.mockRestore()
  })

  it("should return depreciating remainingSessionTime based on lastActivityTime", async () => {
    // Mock Date.now() to have predictable time calculations
    const fixedTime = 1000000000000
    const fiveMinutesAgo = fixedTime - (5 * 60 * 1000)
    const tenMinutesExpected = 10 * 60 * 1000
    const dateNowSpy = jest.spyOn(Date, "now").mockReturnValue(fixedTime)

    mockGetTokenMapping.mockImplementation(() => {
      return {
        rolesWithAccess: [
          {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}
        ],
        rolesWithoutAccess: [],
        currentlySelectedRole: {role_id: "555", org_code: "GHI", role_name: "MockRole_4"},
        userDetails: {
          family_name: "foo",
          given_name: "bar"
        },
        lastActivityTime: fiveMinutesAgo
      }
    })

    event.requestContext.authorizer = {
      username: "test_user",
      sessionId: "mock-session-id",
      isConcurrentSession: false
    }

    const response = await handler(event, context)

    expect(response.statusCode).toBe(200)

    const body = JSON.parse(response.body)
    expect(body.userInfo.remainingSessionTime).toBeDefined()
    // Should be exactly 10 minutes since we're using mocked time
    expect(body.userInfo.remainingSessionTime).toBe(tenMinutesExpected)

    dateNowSpy.mockRestore()
  })

  it("should return different remainingSessionTime values for different lastActivityTime", async () => {
    // Mock Date.now() to have predictable time calculations
    const fixedTime = 2000000000000
    const twoMinutesAgo = fixedTime - (2 * 60 * 1000)
    const thirteenMinutesExpected = 13 * 60 * 1000
    const dateNowSpy = jest.spyOn(Date, "now").mockReturnValue(fixedTime)

    mockGetTokenMapping.mockImplementation(() => {
      return {
        rolesWithAccess: [
          {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}
        ],
        rolesWithoutAccess: [],
        currentlySelectedRole: {role_id: "555", org_code: "GHI", role_name: "MockRole_4"},
        userDetails: {
          family_name: "foo",
          given_name: "bar"
        },
        lastActivityTime: twoMinutesAgo
      }
    })

    event.requestContext.authorizer = {
      username: "test_user",
      sessionId: "mock-session-id",
      isConcurrentSession: false
    }

    const response = await handler(event, context)

    expect(response.statusCode).toBe(200)

    const body = JSON.parse(response.body)
    expect(body.userInfo.remainingSessionTime).toBeDefined()
    // Should be exactly 13 minutes since we're using mocked time
    expect(body.userInfo.remainingSessionTime).toBe(thirteenMinutesExpected)

    dateNowSpy.mockRestore()
  })

  it("should return 0 remainingSessionTime when lastActivityTime exceeds 15 minutes", async () => {
    // Mock Date.now() to have predictable time calculations
    const fixedTime = 3000000000000
    const sixteenMinutesAgo = fixedTime - (16 * 60 * 1000)
    const dateNowSpy = jest.spyOn(Date, "now").mockReturnValue(fixedTime)

    mockGetTokenMapping.mockImplementation(() => {
      return {
        rolesWithAccess: [
          {role_id: "123", org_code: "XYZ", role_name: "MockRole_1"}
        ],
        rolesWithoutAccess: [],
        currentlySelectedRole: {role_id: "555", org_code: "GHI", role_name: "MockRole_4"},
        userDetails: {
          family_name: "foo",
          given_name: "bar"
        },
        lastActivityTime: sixteenMinutesAgo
      }
    })

    event.requestContext.authorizer = {
      username: "test_user",
      sessionId: "mock-session-id",
      isConcurrentSession: false
    }

    const response = await handler(event, context)

    expect(response.statusCode).toBe(200)

    const body = JSON.parse(response.body)
    expect(body.userInfo.remainingSessionTime).toBe(0)

    dateNowSpy.mockRestore()
  })
})
