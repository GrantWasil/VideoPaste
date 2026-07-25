import XCTest

@testable import VideoPasteCore

final class ExternalDownloadRequestTests: XCTestCase {
  func testExtractsEncodedRedditVideoURL() throws {
    let handoffURL = try XCTUnwrap(
      URL(
        string:
          "videopaste://download?url=https%3A%2F%2Fpackaged-media.redd.it%2Fvideo.mp4%3Fx%3D1%26y%3D2"
      )
    )

    let sourceURL = try ExternalDownloadRequest.sourceURL(from: handoffURL)

    XCTAssertEqual(
      sourceURL.absoluteString,
      "https://packaged-media.redd.it/video.mp4?x=1&y=2"
    )
  }

  func testExtractsEncodedXPostURL() throws {
    let handoffURL = try XCTUnwrap(
      URL(
        string:
          "videopaste://download?url=https%3A%2F%2Fx.com%2Fvideopaste%2Fstatus%2F1800000000000000000%3Fs%3D20"
      )
    )

    let sourceURL = try ExternalDownloadRequest.sourceURL(from: handoffURL)

    XCTAssertEqual(
      sourceURL.absoluteString,
      "https://x.com/videopaste/status/1800000000000000000?s=20"
    )
  }

  func testRejectsUnexpectedHandoffHost() throws {
    let handoffURL = try XCTUnwrap(
      URL(
        string:
          "videopaste://other?url=https%3A%2F%2Fpackaged-media.redd.it%2Fvideo.mp4"
      )
    )

    XCTAssertThrowsError(
      try ExternalDownloadRequest.sourceURL(from: handoffURL)
    )
  }

  func testRejectsNonWebSourceURL() throws {
    let handoffURL = try XCTUnwrap(
      URL(
        string:
          "videopaste://download?url=file%3A%2F%2F%2Ftmp%2Fvideo.mp4"
      )
    )

    XCTAssertThrowsError(
      try ExternalDownloadRequest.sourceURL(from: handoffURL)
    )
  }
}
