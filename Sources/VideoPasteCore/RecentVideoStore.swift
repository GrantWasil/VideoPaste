import Foundation

public struct RecentVideo: Codable, Equatable, Identifiable, Sendable {
  public let id: UUID
  public let fileURL: URL
  public let byteCount: Int64
  public let downloadedAt: Date

  public init(
    id: UUID = UUID(),
    fileURL: URL,
    byteCount: Int64,
    downloadedAt: Date = Date()
  ) {
    self.id = id
    self.fileURL = fileURL
    self.byteCount = byteCount
    self.downloadedAt = downloadedAt
  }
}

public struct RecentVideoStore: Sendable {
  public let historyFileURL: URL
  public let maximumCount: Int

  public init(
    historyFileURL: URL? = nil,
    maximumCount: Int = 5
  ) throws {
    if let historyFileURL {
      self.historyFileURL = historyFileURL
    } else {
      self.historyFileURL = try Self.defaultHistoryFileURL()
    }
    self.maximumCount = max(1, maximumCount)
  }

  public func load() throws -> [RecentVideo] {
    let fileManager = FileManager.default
    guard fileManager.fileExists(atPath: historyFileURL.path) else {
      return []
    }

    let data = try Data(contentsOf: historyFileURL)
    return
      try JSONDecoder()
      .decode([RecentVideo].self, from: data)
      .filter { fileManager.fileExists(atPath: $0.fileURL.path) }
      .sorted { $0.downloadedAt > $1.downloadedAt }
      .prefix(maximumCount)
      .map { $0 }
  }

  @discardableResult
  public func record(
    _ video: DownloadedVideo,
    downloadedAt: Date = Date()
  ) throws -> [RecentVideo] {
    var videos = try load()
    let standardizedURL = video.fileURL.standardizedFileURL

    videos.removeAll {
      $0.fileURL.standardizedFileURL == standardizedURL
    }
    videos.insert(
      RecentVideo(
        fileURL: video.fileURL,
        byteCount: video.byteCount,
        downloadedAt: downloadedAt
      ),
      at: 0
    )
    videos = Array(videos.prefix(maximumCount))
    try save(videos)
    return videos
  }

  @discardableResult
  public func remove(id: RecentVideo.ID) throws -> [RecentVideo] {
    var videos = try load()
    videos.removeAll { $0.id == id }
    try save(videos)
    return videos
  }

  private func save(_ videos: [RecentVideo]) throws {
    try FileManager.default.createDirectory(
      at: historyFileURL.deletingLastPathComponent(),
      withIntermediateDirectories: true
    )

    let encoder = JSONEncoder()
    encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
    try encoder.encode(videos).write(to: historyFileURL, options: .atomic)
  }

  private static func defaultHistoryFileURL() throws -> URL {
    guard
      let applicationSupportDirectory = FileManager.default.urls(
        for: .applicationSupportDirectory,
        in: .userDomainMask
      ).first
    else {
      throw CocoaError(.fileNoSuchFile)
    }

    return
      applicationSupportDirectory
      .appendingPathComponent("VideoPaste", isDirectory: true)
      .appendingPathComponent("recent-videos.json", isDirectory: false)
  }
}
