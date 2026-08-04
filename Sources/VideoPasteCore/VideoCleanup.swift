import Foundation

public enum VideoRetentionUnit: String, CaseIterable, Sendable {
  case hours
  case days
  case weeks

  public func timeInterval(for amount: Int) -> TimeInterval {
    let secondsPerUnit: TimeInterval
    switch self {
    case .hours:
      secondsPerUnit = 60 * 60
    case .days:
      secondsPerUnit = 24 * 60 * 60
    case .weeks:
      secondsPerUnit = 7 * 24 * 60 * 60
    }

    return TimeInterval(max(1, amount)) * secondsPerUnit
  }
}

public enum VideoCleanup {
  private static let managedFilenamePrefix = "videopaste-video-"
  private static let managedVideoExtensions: Set<String> = [
    "m4v",
    "mov",
    "mp4",
    "webm",
  ]

  public static func expiredVideoURLs(
    in directory: URL,
    olderThan cutoffDate: Date,
    fileManager: FileManager = .default
  ) throws -> [URL] {
    guard fileManager.fileExists(atPath: directory.path) else {
      return []
    }

    let resourceKeys: Set<URLResourceKey> = [
      .contentModificationDateKey,
      .creationDateKey,
      .isRegularFileKey,
      .isSymbolicLinkKey,
    ]
    let files = try fileManager.contentsOfDirectory(
      at: directory,
      includingPropertiesForKeys: Array(resourceKeys),
      options: [.skipsHiddenFiles]
    )

    return
      try files
      .filter { fileURL in
        guard isManagedVideo(fileURL) else {
          return false
        }

        let values = try fileURL.resourceValues(forKeys: resourceKeys)
        guard values.isRegularFile == true, values.isSymbolicLink != true else {
          return false
        }

        guard let downloadedAt = values.creationDate ?? values.contentModificationDate else {
          return false
        }

        return downloadedAt <= cutoffDate
      }
      .sorted { $0.lastPathComponent < $1.lastPathComponent }
  }

  private static func isManagedVideo(_ fileURL: URL) -> Bool {
    fileURL.lastPathComponent.hasPrefix(managedFilenamePrefix)
      && managedVideoExtensions.contains(fileURL.pathExtension.lowercased())
  }
}
