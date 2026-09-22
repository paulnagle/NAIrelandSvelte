import XCTest

/// Fastlane snapshot UI tests.
///
/// Each `snapshot()` call saves a PNG for the current simulator at the point it is called.
/// Tabs are identified by their `aria-label` attribute values, which in this Svelte/Capacitor
/// app are the raw i18n keys (e.g. "MEETINGLIST", not the translated "Meetings List").
/// The nav renders as `<a>` elements, so XCUITest exposes them as `app.links`, not tab bar buttons.
///
/// The Map tab is intentionally omitted — the native Google Maps SDK does not render inside
/// the iOS Simulator. Capture that screenshot manually on a real device.
@MainActor
class AppUITests: XCTestCase {

    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        setupSnapshot(app)
        app.launch()
    }

    override func tearDownWithError() throws {
        app = nil
    }

    func testTakeScreenshots() throws {
        // Allow the home screen to fully load (API call + render).
        waitForWebContent()

        // 1 — Home
        snapshot("01_Home")

        // 2 — Meetings List (live API data)
        tapNavLink("MEETINGLIST")
        waitForWebContent()
        snapshot("02_MeetingsList")

        // 3 — Just For Today (live API data)
        tapNavLink("JUSTFORTODAY")
        waitForWebContent()
        snapshot("03_JustForToday")

        // 4 — Events & Conventions (live API data)
        tapNavLink("POSTS")
        waitForWebContent()
        snapshot("04_Events")

        // 5 — NA Speakers (live API data)
        tapNavLink("SPEAKERS")
        waitForWebContent()
        snapshot("05_Speakers")

        // 6 — Cleantime Calculator (fully local, no API)
        tapNavLink("DATETIME")
        snapshot("06_Cleantime")

        // 7 — Contact (mostly static)
        tapNavLink("CONTACT")
        waitForWebContent()
        snapshot("07_Contact")

        // 8 — Settings (fully local)
        tapNavLink("SETTINGS")
        snapshot("08_Settings")
    }

    // MARK: - Helpers

    /// Tap a bottom-nav link by its aria-label / i18n key.
    private func tapNavLink(_ labelKey: String) {
        let link = app.links[labelKey]
        XCTAssertTrue(link.waitForExistence(timeout: 5), "Nav link '\(labelKey)' not found")
        link.tap()
    }

    /// Wait briefly for any async content (API responses) to settle before snapshotting.
    /// Uses a short existence wait on the webview rather than a hard sleep.
    private func waitForWebContent(timeout: TimeInterval = 4) {
        let webView = app.webViews.firstMatch
        _ = webView.waitForExistence(timeout: timeout)
        // Additional short pause for network-dependent renders.
        Thread.sleep(forTimeInterval: 1.5)
    }
}
