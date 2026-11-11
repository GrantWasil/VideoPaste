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

  func testPassesSignedRedditManifestURLsToYTDLPUnchanged() throws {
    let manifestURLs = [
      "https://v.redd.it/sb1bhrydqu0i1/HLSPlaylist.m3u8?a=1765432100%2CZGFkYmVlZg%3D%3D&v=1&f=sd",
      "https://v.redd.it/sb1bhrydqu0i1/DASHPlaylist.mpd?a=1765432100%2CZGFkYmVlZg%3D%3D&v=1&f=sd",
      "https://v.redd.it/sb1bhrydqu0i1/HLSPlaylist.m3u8",
      "https://cf.v.redd.it/sb1bhrydqu0i1/HLSPlaylist.m3u8?a=1765432100%2CZGFkYmVlZg%3D%3D&v=1&f=sd",
    ]

    for manifestURL in manifestURLs {
      let url = try VideoDownloader.parsedURL(from: manifestURL)

      XCTAssertTrue(
        VideoDownloader.isSupportedSourceURL(url),
        "Expected \(manifestURL) to be accepted"
      )
      XCTAssertEqual(try ytdlpArgument(for: manifestURL), manifestURL)
    }
  }

  func testRepairsSingleRenditionFilesToTheUnsignedHLSManifest() throws {
    let renditionFiles = [
      "https://v.redd.it/sb1bhrydqu0i1/DASH_480.mp4",
      "https://v.redd.it/sb1bhrydqu0i1/CMAF_720.mp4",
      "https://v.redd.it/sb1bhrydqu0i1/DASH_96.mp4?source=fallback",
      "https://v.redd.it/sb1bhrydqu0i1/CMAF_AUDIO_128.mp4",
    ]

    for renditionFile in renditionFiles {
      XCTAssertEqual(
        try ytdlpArgument(for: renditionFile),
        "https://v.redd.it/sb1bhrydqu0i1/HLSPlaylist.m3u8",
        "Expected \(renditionFile) to be repaired"
      )
    }
  }

  func testRepairsSingleRenditionPlaylistsToTheUnsignedHLSManifest() throws {
    let renditionPlaylists = [
      "https://v.redd.it/sb1bhrydqu0i1/HLS_720.m3u8",
      "https://v.redd.it/sb1bhrydqu0i1/HLS_AUDIO_128.m3u8",
      "https://v.redd.it/sb1bhrydqu0i1/HLS_720.m3u8?a=1765432100%2CZGFkYmVlZg%3D%3D&v=1&f=sd",
      "https://v.redd.it/sb1bhrydqu0i1/CMAF_720.m3u8",
      "https://v.redd.it/sb1bhrydqu0i1/DASH_720.mpd",
      "https://v.redd.it/sb1bhrydqu0i1/DASH_AUDIO_128",
    ]

    for renditionPlaylist in renditionPlaylists {
      XCTAssertEqual(
        try ytdlpArgument(for: renditionPlaylist),
        "https://v.redd.it/sb1bhrydqu0i1/HLSPlaylist.m3u8",
        "Expected \(renditionPlaylist) to be repaired"
      )
    }
  }

  func testRepairsLinksOnASubdomainOfTheVideoHostKeepingTheirHost() throws {
    let unusableLinks = [
      "https://cf.v.redd.it/sb1bhrydqu0i1/DASH_480.mp4",
      "https://cf.v.redd.it/sb1bhrydqu0i1/HLS_720.m3u8",
      "https://CF.V.Redd.It/sb1bhrydqu0i1",
    ]

    for unusableLink in unusableLinks {
      XCTAssertEqual(
        try ytdlpArgument(for: unusableLink),
        "https://cf.v.redd.it/sb1bhrydqu0i1/HLSPlaylist.m3u8",
        "Expected \(unusableLink) to be repaired"
      )
    }
  }

  func testRepairsBareRedditVideoLinksToTheUnsignedHLSManifest() throws {
    let bareLinks = [
      "https://v.redd.it/sb1bhrydqu0i1",
      "https://v.redd.it/sb1bhrydqu0i1/",
      "http://V.Redd.It/sb1bhrydqu0i1?utm_source=share",
    ]

    for bareLink in bareLinks {
      XCTAssertEqual(
        try ytdlpArgument(for: bareLink),
        "https://v.redd.it/sb1bhrydqu0i1/HLSPlaylist.m3u8",
        "Expected \(bareLink) to be repaired"
      )
    }
  }

  func testParsesSignedPackagedMediaURL() throws {
    let input = """
      https://packaged-media.redd.it/example/pb/m2-res_854p.mp4?m=DASHPlaylist.mpd&s=signed
      """

    let url = try VideoDownloader.parsedURL(from: input)

    XCTAssertEqual(url.host, "packaged-media.redd.it")
    XCTAssertEqual(VideoDownloader.route(for: url), .directFile(url))
  }

  func testFetchesAGIFPostsCompleteMP4AsAFile() throws {
    let gifPostFiles = [
      "https://preview.redd.it/abc123example.gif?width=480&format=mp4&s=signature",
      "https://external-preview.redd.it/abc123example.gif?format=mp4&s=signature",
    ]

    for gifPostFile in gifPostFiles {
      let url = try VideoDownloader.parsedURL(from: gifPostFile)

      XCTAssertTrue(VideoDownloader.isSupportedSourceURL(url))
      XCTAssertEqual(
        VideoDownloader.route(for: url),
        .directFile(url),
        "Expected \(gifPostFile) to be fetched as a file"
      )
    }
  }

  func testLeavesOtherFormatMP4LinksToYTDLP() throws {
    let links = [
      // An image, not a video.
      "https://preview.redd.it/abc123example.gif?width=480&s=signature",
      // The video host never serves a complete file.
      "https://v.redd.it/sb1bhrydqu0i1/HLSPlaylist.m3u8?format=mp4",
      "https://www.reddit.com/r/gifs/comments/example/gif/?format=mp4",
      "https://x.com/videopaste/status/1800000000000000000?format=mp4",
    ]

    for link in links {
      XCTAssertEqual(try ytdlpArgument(for: link), link)
    }
  }

  func testRecognizesOrdinaryRedditPostAsHelperDownload() throws {
    let url = try XCTUnwrap(URL(string: "https://www.reddit.com/r/videos/comments/example/post/"))

    XCTAssertEqual(VideoDownloader.route(for: url), .ytdlp(url))
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

  /// The address `yt-dlp` is given for a pasted or handed-over link, or `nil`
  /// when the link is fetched as a file without `yt-dlp`.
  private func ytdlpArgument(for input: String) throws -> String? {
    let url = try VideoDownloader.parsedURL(from: input)
    guard case .ytdlp(let link) = VideoDownloader.route(for: url) else {
      return nil
    }

    return VideoDownloader.ytdlpArguments(
      sourceURL: link,
      outputTemplate: "/tmp/videopaste-video.%(ext)s"
    ).last
  }
}
