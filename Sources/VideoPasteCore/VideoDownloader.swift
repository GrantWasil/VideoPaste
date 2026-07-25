import Foundation

public struct DownloadedVideo: Sendable {
  public let fileURL: URL
  public let byteCount: Int64

  public init(fileURL: URL, byteCount: Int64) {
    self.fileURL = fileURL
    self.byteCount = byteCount
  }
}

public enum VideoDownloadError: LocalizedError {
  case invalidURL
  case unsupportedURL
  case downloaderUnavailable
  case badServerResponse
  case serverRejected(Int)
  case emptyDownload
  case privatePost
  case authenticationRequired
  case unavailablePost
  case noVideo
  case helperFailed(String)
  case outputMissing

  public var errorDescription: String? {
    switch self {
    case .invalidURL:
      return "That doesn’t look like a complete web address."
    case .unsupportedURL:
      return "Please paste an http:// or https:// Reddit or X link."
    case .downloaderUnavailable:
      return """
        This looks like a video post rather than a direct video link. \
        Install yt-dlp with “brew install yt-dlp”, or right-click the video \
        and choose Copy Video Address.
        """
    case .badServerResponse:
      return "The video host returned an unreadable response."
    case .serverRejected(let statusCode):
      if statusCode == 403 || statusCode == 404 {
        return
          "This video link has expired or is unavailable. Copy a fresh video address and try again."
      }
      return "The video host rejected the download (HTTP \(statusCode))."
    case .emptyDownload:
      return "The video host returned an empty video file."
    case .privatePost:
      return "This post is private. VideoPaste can only download public posts."
    case .authenticationRequired:
      return
        "This post requires a signed-in account. VideoPaste only downloads public posts without using browser cookies."
    case .unavailablePost:
      return "This post is unavailable or has been deleted."
    case .noVideo:
      return "This post doesn’t contain a supported video."
    case .helperFailed(let message):
      return message
    case .outputMissing:
      return "The download finished, but the video file could not be found."
    }
  }
}

public enum VideoDownloader {
  public static func parsedURL(from input: String) throws -> URL {
    let trimmed = input.trimmingCharacters(in: .whitespacesAndNewlines)
    guard let url = URL(string: trimmed), url.host != nil else {
      throw VideoDownloadError.invalidURL
    }
    guard url.scheme == "https" || url.scheme == "http" else {
      throw VideoDownloadError.unsupportedURL
    }
    return url
  }

  public static func isDirectVideoURL(_ url: URL) -> Bool {
    let host = url.host?.lowercased() ?? ""
    let pathExtension = url.pathExtension.lowercased()

    return pathExtension == "mp4"
      || pathExtension == "mov"
      || host == "packaged-media.redd.it"
  }

  public static func isSupportedSourceURL(_ url: URL) -> Bool {
    guard let scheme = url.scheme?.lowercased(),
      scheme == "https" || scheme == "http"
    else {
      return false
    }

    let host = url.host?.lowercased() ?? ""

    if host == "redd.it"
      || host.hasSuffix(".redd.it")
      || host == "reddit.com"
      || host.hasSuffix(".reddit.com")
    {
      return true
    }

    let supportedXHosts = [
      "x.com",
      "www.x.com",
      "m.x.com",
      "mobile.x.com",
      "twitter.com",
      "www.twitter.com",
      "m.twitter.com",
      "mobile.twitter.com",
    ]
    guard supportedXHosts.contains(host) else {
      return false
    }

    let pathComponents = url.path
      .split(separator: "/", omittingEmptySubsequences: true)

    let postID: Substring
    if pathComponents.count >= 3,
      isXUsername(pathComponents[0]),
      pathComponents[1].lowercased() == "status"
    {
      postID = pathComponents[2]
    } else if pathComponents.count >= 4,
      pathComponents[0].lowercased() == "i",
      pathComponents[1].lowercased() == "web",
      pathComponents[2].lowercased() == "status"
    {
      postID = pathComponents[3]
    } else {
      return false
    }

    return !postID.isEmpty
      && postID.utf8.allSatisfy { (48...57).contains($0) }
  }

  static func helperError(from errorOutput: String) -> VideoDownloadError {
    let normalized = errorOutput.lowercased()

    if normalized.contains("account is protected")
      || normalized.contains("not authorized to view")
      || normalized.contains("not authorised to view")
      || normalized.contains("private post")
      || normalized.contains("private tweet")
    {
      return .privatePost
    }

    if normalized.contains("login required")
      || normalized.contains("authentication required")
      || normalized.contains("requires authentication")
      || normalized.contains("cookies-from-browser")
    {
      return .authenticationRequired
    }

    if normalized.contains("no video could be found")
      || normalized.contains("does not contain a video")
      || normalized.contains("doesn't contain a video")
      || normalized.contains("no downloadable video")
    {
      return .noVideo
    }

    if normalized.contains("unavailable")
      || normalized.contains("has been deleted")
      || normalized.contains("does not exist")
      || normalized.contains("tweet not found")
      || normalized.contains("post not found")
      || normalized.contains("status not found")
    {
      return .unavailablePost
    }

    let lines =
      errorOutput
      .split(whereSeparator: \.isNewline)
      .map {
        String($0).trimmingCharacters(in: .whitespacesAndNewlines)
      }
      .filter { !$0.isEmpty }
    let usefulMessage =
      lines.last(where: {
        $0.localizedCaseInsensitiveContains("error:")
      })
      ?? lines.last
      ?? "Video post download failed."

    return .helperFailed(usefulMessage)
  }

  private static func isXUsername(_ value: Substring) -> Bool {
    guard (1...15).contains(value.utf8.count) else {
      return false
    }

    return value.utf8.allSatisfy {
      (48...57).contains($0)
        || (65...90).contains($0)
        || (97...122).contains($0)
        || $0 == 95
    }
  }

  static func ytdlpArguments(
    sourceURL: URL,
    outputTemplate: String
  ) -> [String] {
    [
      "--no-playlist",
      // X multi-video posts can still expand without an explicit item cap.
      "--playlist-items", "1",
      "--no-progress",
      "--merge-output-format", "mp4",
      "--remux-video", "mp4",
      "--print", "after_move:filepath",
      "--output", outputTemplate,
      sourceURL.absoluteString,
    ]
  }

  public static func download(
    from sourceURL: URL,
    outputDirectory: URL? = nil
  ) async throws -> DownloadedVideo {
    let directory = try outputDirectory ?? defaultOutputDirectory()

    if isDirectVideoURL(sourceURL) {
      return try await downloadDirectly(from: sourceURL, into: directory)
    }

    guard let helperURL = locateYTDLP() else {
      throw VideoDownloadError.downloaderUnavailable
    }

    return try await downloadWithYTDLP(
      from: sourceURL,
      into: directory,
      helperURL: helperURL
    )
  }

  public static func defaultOutputDirectory() throws -> URL {
    let fileManager = FileManager.default
    guard
      let downloadsDirectory = fileManager.urls(
        for: .downloadsDirectory,
        in: .userDomainMask
      ).first
    else {
      throw VideoDownloadError.outputMissing
    }

    let directory = downloadsDirectory.appendingPathComponent(
      "VideoPaste",
      isDirectory: true
    )
    try fileManager.createDirectory(
      at: directory,
      withIntermediateDirectories: true
    )
    return directory
  }

  private static func downloadDirectly(
    from sourceURL: URL,
    into outputDirectory: URL
  ) async throws -> DownloadedVideo {
    try FileManager.default.createDirectory(
      at: outputDirectory,
      withIntermediateDirectories: true
    )

    var request = URLRequest(url: sourceURL)
    request.timeoutInterval = 90
    request.setValue(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X) VideoPaste/1.0",
      forHTTPHeaderField: "User-Agent"
    )

    let (temporaryURL, response) = try await URLSession.shared.download(for: request)

    guard let httpResponse = response as? HTTPURLResponse else {
      throw VideoDownloadError.badServerResponse
    }
    guard (200..<300).contains(httpResponse.statusCode) else {
      throw VideoDownloadError.serverRejected(httpResponse.statusCode)
    }

    let values = try temporaryURL.resourceValues(forKeys: [.fileSizeKey])
    let fileSize = Int64(values.fileSize ?? 0)
    guard fileSize > 0 else {
      throw VideoDownloadError.emptyDownload
    }

    let destination = uniqueDestination(in: outputDirectory)
    try FileManager.default.moveItem(at: temporaryURL, to: destination)

    return DownloadedVideo(fileURL: destination, byteCount: fileSize)
  }

  private static func downloadWithYTDLP(
    from sourceURL: URL,
    into outputDirectory: URL,
    helperURL: URL
  ) async throws -> DownloadedVideo {
    try FileManager.default.createDirectory(
      at: outputDirectory,
      withIntermediateDirectories: true
    )

    return try await Task.detached(priority: .userInitiated) {
      let baseName = timestampedBaseName()
      let outputTemplate =
        outputDirectory
        .appendingPathComponent("\(baseName).%(ext)s")
        .path

      let process = Process()
      let standardOutput = Pipe()
      let standardError = Pipe()

      process.executableURL = helperURL
      process.arguments = ytdlpArguments(
        sourceURL: sourceURL,
        outputTemplate: outputTemplate
      )
      process.standardOutput = standardOutput
      process.standardError = standardError
      process.currentDirectoryURL = outputDirectory

      var environment = ProcessInfo.processInfo.environment
      environment["PATH"] = [
        "/opt/homebrew/bin",
        "/usr/local/bin",
        "/usr/bin",
        "/bin",
        "/usr/sbin",
        "/sbin",
      ].joined(separator: ":")
      process.environment = environment

      do {
        try process.run()
      } catch {
        throw VideoDownloadError.helperFailed(
          "yt-dlp could not start: \(error.localizedDescription)"
        )
      }

      process.waitUntilExit()

      let outputData = standardOutput.fileHandleForReading.readDataToEndOfFile()
      let errorData = standardError.fileHandleForReading.readDataToEndOfFile()
      let output = String(decoding: outputData, as: UTF8.self)
        .trimmingCharacters(in: .whitespacesAndNewlines)
      let errorOutput = String(decoding: errorData, as: UTF8.self)
        .trimmingCharacters(in: .whitespacesAndNewlines)

      guard process.terminationStatus == 0 else {
        throw helperError(from: errorOutput)
      }

      let printedPath =
        output
        .split(separator: "\n")
        .last
        .map(String.init)
      let candidate = printedPath.map {
        URL(fileURLWithPath: $0, isDirectory: false)
      }

      let finalURL: URL
      if let candidate, FileManager.default.fileExists(atPath: candidate.path) {
        finalURL = candidate
      } else {
        let files = try FileManager.default.contentsOfDirectory(
          at: outputDirectory,
          includingPropertiesForKeys: [.fileSizeKey],
          options: [.skipsHiddenFiles]
        )
        guard
          let matchingFile = files.first(where: {
            $0.lastPathComponent.hasPrefix(baseName)
          })
        else {
          throw VideoDownloadError.outputMissing
        }
        finalURL = matchingFile
      }

      let values = try finalURL.resourceValues(forKeys: [.fileSizeKey])
      let fileSize = Int64(values.fileSize ?? 0)
      guard fileSize > 0 else {
        throw VideoDownloadError.emptyDownload
      }

      return DownloadedVideo(fileURL: finalURL, byteCount: fileSize)
    }.value
  }

  private static func locateYTDLP() -> URL? {
    let candidates = [
      "/opt/homebrew/bin/yt-dlp",
      "/usr/local/bin/yt-dlp",
    ]

    return
      candidates
      .map { URL(fileURLWithPath: $0) }
      .first { FileManager.default.isExecutableFile(atPath: $0.path) }
  }

  private static func uniqueDestination(in directory: URL) -> URL {
    let fileManager = FileManager.default
    let baseName = timestampedBaseName()
    var destination = directory.appendingPathComponent("\(baseName).mp4")
    var suffix = 2

    while fileManager.fileExists(atPath: destination.path) {
      destination = directory.appendingPathComponent(
        "\(baseName)-\(suffix).mp4"
      )
      suffix += 1
    }

    return destination
  }

  private static func timestampedBaseName() -> String {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.dateFormat = "yyyy-MM-dd-HHmmss"
    return "videopaste-video-\(formatter.string(from: Date()))"
  }
}
