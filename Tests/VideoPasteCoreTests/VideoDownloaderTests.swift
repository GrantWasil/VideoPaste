import XCTest

@testable import VideoPasteCore

final class VideoDownloaderTests: XCTestCase {
  func testParsesSignedPackagedMediaURL() throws {
    let input = """
      https://packaged-media.redd.it/example/pb/m2-res_854p.mp4?m=DASHPlaylist.mpd&s=signed
      """

    let url = try VideoDownloader.parsedURL(from: input)

    XCTAssertEqual(url.host, "packaged-media.redd.it")
    XCTAssertTrue(VideoDownloader.isDirectVideoURL(url))
  }

  func testRecognizesOrdinaryRedditPostAsHelperDownload() throws {
    let url = try XCTUnwrap(URL(string: "https://www.reddit.com/r/videos/comments/example/post/"))

    XCTAssertFalse(VideoDownloader.isDirectVideoURL(url))
  }

  func testRejectsNonWebURL() {
    XCTAssertThrowsError(
      try VideoDownloader.parsedURL(from: "file:///tmp/video.mp4")
    )
  }

  func testDownloadsSampleWhenEnvironmentVariableIsPresent() async throws {
    guard let rawURL = ProcessInfo.processInfo.environment["REDDIT_SAMPLE_URL"] else {
      throw XCTSkip("Set REDDIT_SAMPLE_URL to run the live download test.")
    }

    let sourceURL = try VideoDownloader.parsedURL(from: rawURL)
    let outputDirectory = FileManager.default.temporaryDirectory
      .appendingPathComponent(UUID().uuidString, isDirectory: true)
    defer {
      try? FileManager.default.removeItem(at: outputDirectory)
    }

    let result = try await VideoDownloader.download(
      from: sourceURL,
      outputDirectory: outputDirectory
    )

    XCTAssertTrue(FileManager.default.fileExists(atPath: result.fileURL.path))
    XCTAssertGreaterThan(result.byteCount, 1_000)
    XCTAssertEqual(result.fileURL.pathExtension, "mp4")
  }
}
