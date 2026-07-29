import XCTest

@testable import VideoPasteCore

final class VideoDownloaderTests: XCTestCase {
  func testRecognizesXAndTwitterStatusURLsAsSupportedSources() throws {
    let urls = [
      "https://x.com/videopaste/status/1800000000000000000",
      "https://www.x.com/videopaste/status/1800000000000000000/video/1",
      "https://twitter.com/videopaste/status/1800000000000000000?s=20",
      "https://mobile.twitter.com/i/web/status/1800000000000000000",
      "https://mobile.x.com/videopaste/status/1800000000000000000",
      "https://m.twitter.com/videopaste/status/1800000000000000000",
    ]

    for rawURL in urls {
      let url = try XCTUnwrap(URL(string: rawURL))
      XCTAssertTrue(
        VideoDownloader.isSupportedSourceURL(url),
        "Expected \(rawURL) to be supported"
      )
    }
  }

  func testRejectsNonPostAndLookalikeXURLs() throws {
    let urls = [
      "https://x.com/home",
      "https://twitter.com/explore",
      "https://notx.com/videopaste/status/1800000000000000000",
      "https://x.com.evil.example/videopaste/status/1800000000000000000",
      "https://staging.x.com/videopaste/status/1800000000000000000",
      "https://x.com/status/1800000000000000000",
      "https://x.com/foo/bar/status/1800000000000000000",
      "https://x.com/username-that-is-too-long/status/1800000000000000000",
      "ftp://x.com/videopaste/status/1800000000000000000",
    ]

    for rawURL in urls {
      let url = try XCTUnwrap(URL(string: rawURL))
      XCTAssertFalse(
        VideoDownloader.isSupportedSourceURL(url),
        "Expected \(rawURL) to be rejected"
      )
    }
  }

  func testKeepsRedditSourcesSupported() throws {
    let urls = [
      "https://www.reddit.com/r/videos/comments/example/post/",
      "https://v.redd.it/example/DASH_720.mp4",
    ]

    for rawURL in urls {
      let url = try XCTUnwrap(URL(string: rawURL))
      XCTAssertTrue(
        VideoDownloader.isSupportedSourceURL(url),
        "Expected \(rawURL) to remain supported"
      )
    }
  }

  func testMapsPrivateXPostFailureToUsefulError() throws {
    let error = VideoDownloader.helperError(
      from: """
        ERROR: [twitter] 1800000000000000000: You are not authorized to view \
        this Tweet. This account is protected.
        """
    )

    XCTAssertEqual(
      error.localizedDescription,
      "This post is private. VideoPaste can only download public posts."
    )
  }

  func testMapsUnavailableXPostFailureToUsefulError() throws {
    let error = VideoDownloader.helperError(
      from: """
        ERROR: [twitter] 1800000000000000000: This tweet is unavailable
        """
    )

    XCTAssertEqual(
      error.localizedDescription,
      "This post is unavailable or has been deleted."
    )
  }

  func testMapsAuthenticationRequiredXPostFailureWithoutSuggestingCookies() {
    let error = VideoDownloader.helperError(
      from: """
        ERROR: [twitter] 1800000000000000000: NSFW tweet requires \
        authentication. Use --cookies-from-browser for authentication.
        """
    )

    XCTAssertEqual(
      error.localizedDescription,
      "This post requires a signed-in account. VideoPaste only downloads public posts without using browser cookies."
    )
  }

  func testMapsXPostWithoutVideoToUsefulError() throws {
    let error = VideoDownloader.helperError(
      from: """
        ERROR: [twitter] 1800000000000000000: No video could be found in this tweet
        """
    )

    XCTAssertEqual(
      error.localizedDescription,
      "This post doesn’t contain a supported video."
    )
  }

  func testDoesNotMapMissingLocalToolToUnavailablePost() {
    let error = VideoDownloader.helperError(
      from: "ERROR: ffmpeg and ffprobe not found. Please install them."
    )

    XCTAssertEqual(
      error.localizedDescription,
      "ERROR: ffmpeg and ffprobe not found. Please install them."
    )
  }

  func testYTDLPArgumentsDisableCookiesAndLimitMultiVideoPostsToOneItem() throws {
    let sourceURL = try XCTUnwrap(
      URL(string: "https://x.com/videopaste/status/1800000000000000000")
    )

    let arguments = VideoDownloader.ytdlpArguments(
      sourceURL: sourceURL,
      outputTemplate: "/tmp/videopaste-video.%(ext)s"
    )

    XCTAssertEqual(
      Array(arguments.prefix(7)),
      [
        "--ignore-config",
        "--no-cookies",
        "--no-cookies-from-browser",
        "--no-playlist",
        "--playlist-items", "1",
        "--no-progress",
      ]
    )
    XCTAssertEqual(arguments.last, sourceURL.absoluteString)
  }

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
