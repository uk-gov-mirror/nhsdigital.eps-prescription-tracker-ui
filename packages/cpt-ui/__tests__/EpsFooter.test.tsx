import "@testing-library/jest-dom"
import {render, screen, fireEvent} from "@testing-library/react"
import EpsFooter from "@/components/EpsFooter"

const mockClearBeforeUnloadGuard = jest.fn()

jest.mock("@/context/AuthProvider", () => ({
  useAuth: jest.fn(() => ({
    clearBeforeUnloadGuard: mockClearBeforeUnloadGuard
  }))
}))

jest.mock("@/constants/ui-strings/FooterStrings", () => ({
  FOOTER_COPYRIGHT: "© NHS England",
  FOOTER_LINKS: [
    {
      text: "Privacy notice (opens in new tab)",
      href: "https://example.com/privacy",
      external: true,
      testId: "eps_footer-link-privacy"
    },
    {
      text: "Terms and conditions",
      href: "terms-and-conditions",
      external: false,
      testId: "eps_footer-link-terms"
    },
    {
      text: "Cookie policy",
      href: "cookies",
      external: false,
      testId: "eps_footer-link-cookies"
    }
  ]
}))

describe("EpsFooter", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders the footer element with role 'contentinfo'", () => {
    render(<EpsFooter />)
    expect(screen.getByRole("contentinfo")).toBeInTheDocument()
  })

  it("displays all footer links with correct text and href", () => {
    render(<EpsFooter />)
    const links = screen.getAllByRole("link")
    expect(links).toHaveLength(3)

    expect(links[0]).toHaveTextContent("Privacy notice (opens in new tab)")
    expect(links[0]).toHaveAttribute("href", "https://example.com/privacy")
    expect(links[0]).toHaveAttribute("target", "_blank")
    expect(links[0]).toHaveAttribute("rel", "noopener noreferrer")

    expect(links[1]).toHaveTextContent("Terms and conditions")
    expect(links[1]).toHaveAttribute("href", "terms-and-conditions")
    expect(links[1]).not.toHaveAttribute("target")

    expect(links[2]).toHaveTextContent("Cookie policy")
    expect(links[2]).toHaveAttribute("href", "cookies")
    expect(links[2]).not.toHaveAttribute("target")
  })

  it("displays the correct copyright message", () => {
    render(<EpsFooter />)
    const copyright = screen.getByTestId("eps_footer-copyright")
    expect(copyright).toHaveTextContent("© NHS England")
  })

  describe("Before Unload Guard", () => {
    it("clears the before unload guard when a footer link is clicked", () => {
      render(<EpsFooter />)
      fireEvent.click(screen.getAllByRole("link")[0])
      expect(mockClearBeforeUnloadGuard).toHaveBeenCalledTimes(1)
    })

    it("clears the before unload guard when any footer link is clicked", () => {
      render(<EpsFooter />)
      screen.getAllByRole("link").forEach((link, index) => {
        fireEvent.click(link)
        expect(mockClearBeforeUnloadGuard).toHaveBeenCalledTimes(index + 1)
      })
    })

    it("does not trigger the browser unload prompt after a footer link is clicked", () => {
      // Simulate an active before-unload guard by registering a real window listener
      let guardHandler: ((e: BeforeUnloadEvent) => void) | null = (e: BeforeUnloadEvent) => {
        e.preventDefault()
        e.returnValue = ""
      }
      window.addEventListener("beforeunload", guardHandler)

      // When the footer link is clicked, clearBeforeUnloadGuard removes the listener
      mockClearBeforeUnloadGuard.mockImplementation(() => {
        if (guardHandler) {
          window.removeEventListener("beforeunload", guardHandler)
          guardHandler = null
        }
      })

      render(<EpsFooter />)
      fireEvent.click(screen.getAllByRole("link")[0])

      // Guard is cleared - the browser prompt should not fire
      const event = new Event("beforeunload", {cancelable: true})
      const preventDefaultSpy = jest.spyOn(event, "preventDefault")
      window.dispatchEvent(event)

      expect(preventDefaultSpy).not.toHaveBeenCalled()
    })
  })
})
