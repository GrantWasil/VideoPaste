import Foundation
import XCTest

@testable import VideoPasteCore

final class NativeMessagingTests: XCTestCase {
  func testFramesResponseWithLittleEndianLength() throws {
    let response = NativeDownloadResponse(
      ok: true,
      status: "copied",
      fileName: "video.mp4"
    )

    let frame = try NativeMessageFraming.frame(response)
    let header = frame.prefix(MemoryLayout<UInt32>.size)
    let payload = frame.dropFirst(MemoryLayout<UInt32>.size)

    XCTAssertEqual(
      try NativeMessageFraming.payloadLength(from: Data(header)),
      payload.count
    )
    XCTAssertEqual(
      try JSONDecoder().decode(
        NativeDownloadResponse.self,
        from: Data(payload)
      ),
      response
    )
  }

  func testRejectsIncompleteHeader() {
    XCTAssertThrowsError(
      try NativeMessageFraming.payloadLength(from: Data([1, 2, 3]))
    )
  }

  func testRejectsOversizedMessage() {
    var oversizedLength = UInt32(
      NativeMessageFraming.maximumPayloadSize + 1
    ).littleEndian
    let header = withUnsafeBytes(of: &oversizedLength) { Data($0) }

    XCTAssertThrowsError(
      try NativeMessageFraming.payloadLength(from: header)
    )
  }
}

extension NativeMessagingTests {
  func testPrivatePostFailureCarriesItsCodeInTheEncodedResponse() throws {
    let response = NativeDownloadResponse.failure(
      VideoDownloadError.privatePost
    )

    let message = try encodedMessage(response)

    XCTAssertEqual(message["ok"] as? Bool, false)
    XCTAssertEqual(message["status"] as? String, "error")
    XCTAssertEqual(message["code"] as? String, "private_post")
    XCTAssertEqual(
      message["error"] as? String,
      "This post is private. VideoPaste can only download public posts."
    )
  }

  func testEachDownloadFailureCarriesItsCodeInTheEncodedResponse() throws {
    let expectedCodes: [(VideoDownloadError, String)] = [
      (.privatePost, "private_post"),
      (.authenticationRequired, "login_required"),
      (.noVideo, "no_video"),
      (.unavailablePost, "unavailable"),
      (.serverRejected(403), "unavailable"),
      (.serverRejected(404), "unavailable"),
      (.downloaderUnavailable, "ytdlp_missing"),
      (.badServerResponse, "failed"),
      (.serverRejected(500), "failed"),
      (.emptyDownload, "failed"),
      (.outputMissing, "failed"),
      (.helperFailed("ERROR: ffmpeg and ffprobe not found."), "failed"),
      (.invalidURL, "failed"),
      (.unsupportedURL, "failed"),
    ]

    for (error, expectedCode) in expectedCodes {
      let message = try encodedMessage(
        NativeDownloadResponse.failure(error)
      )

      XCTAssertEqual(
        message["code"] as? String,
        expectedCode,
        "Unexpected code for \(error)"
      )
      XCTAssertEqual(
        message["error"] as? String,
        error.localizedDescription,
        "The prose error must stay as it is for \(error)"
      )
    }
  }

  func testRefusedRequestsAreFailedResponsesWithTheirProse() throws {
    let refusals: [(NativeDownloadRequest, String)] = [
      (
        NativeDownloadRequest(
          action: "deleteDownloads",
          url: "https://x.com/videopaste/status/1800000000000000000"
        ),
        "The browser requested an unsupported action."
      ),
      (
        NativeDownloadRequest(url: "https://example.com/video.mp4"),
        "The helper only accepts Reddit and X links."
      ),
      (
        NativeDownloadRequest(url: "not a link"),
        "That doesn’t look like a complete web address."
      ),
    ]

    for (request, expectedProse) in refusals {
      XCTAssertThrowsError(try request.acceptedURL()) { error in
        let message = try? encodedMessage(
          NativeDownloadResponse.failure(error)
        )

        XCTAssertEqual(message?["ok"] as? Bool, false)
        XCTAssertEqual(message?["code"] as? String, "failed")
        XCTAssertEqual(message?["error"] as? String, expectedProse)
      }
    }
  }

  func testAcceptedRequestYieldsItsLink() throws {
    let request = NativeDownloadRequest(
      url: "https://x.com/videopaste/status/1800000000000000000"
    )

    XCTAssertEqual(
      try request.acceptedURL().absoluteString,
      "https://x.com/videopaste/status/1800000000000000000"
    )
  }

  func testUnreadableRequestIsAFailedResponse() throws {
    let message = try encodedMessage(
      NativeDownloadResponse.failure(NativeMessageError.incompleteMessage)
    )

    XCTAssertEqual(message["code"] as? String, "failed")
    XCTAssertEqual(
      message["error"] as? String,
      "The browser sent an incomplete native message."
    )
  }

  func testCopiedResponseCarriesNoCode() throws {
    let message = try encodedMessage(
      NativeDownloadResponse.copied(fileName: "video.mp4")
    )

    XCTAssertEqual(message["ok"] as? Bool, true)
    XCTAssertEqual(message["status"] as? String, "copied")
    XCTAssertEqual(message["fileName"] as? String, "video.mp4")
    XCTAssertNil(message["code"])
    XCTAssertNil(message["error"])
  }

  /// The JSON object the browser receives: the frame's payload, decoded
  /// without going through `NativeDownloadResponse`.
  private func encodedMessage(
    _ response: NativeDownloadResponse
  ) throws -> [String: Any] {
    let frame = try NativeMessageFraming.frame(response)
    let payload = frame.dropFirst(MemoryLayout<UInt32>.size)
    return try XCTUnwrap(
      JSONSerialization.jsonObject(with: Data(payload)) as? [String: Any]
    )
  }
}
