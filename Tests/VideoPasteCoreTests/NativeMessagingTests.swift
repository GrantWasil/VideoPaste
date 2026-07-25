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
