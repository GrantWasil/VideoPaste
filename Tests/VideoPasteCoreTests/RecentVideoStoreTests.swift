import XCTest

@testable import VideoPasteCore

final class RecentVideoStoreTests: XCTestCase {
  func testKeepsTheFiveMostRecentVideosAcrossReloads() throws {
    let directory = try makeTemporaryDirectory()
    defer { try? FileManager.default.removeItem(at: directory) }

    let store = try RecentVideoStore(
      historyFileURL: directory.appendingPathComponent("history.json")
    )

    for index in 0..<6 {
      let fileURL = try makeVideo(named: "video-\(index).mp4", in: directory)
      try store.record(
        DownloadedVideo(fileURL: fileURL, byteCount: Int64(index + 1)),
        downloadedAt: Date(timeIntervalSince1970: TimeInterval(index))
      )
    }

    let videos = try store.load()

    XCTAssertEqual(videos.count, 5)
    XCTAssertEqual(
      videos.map(\.fileURL.lastPathComponent),
      [
        "video-5.mp4",
        "video-4.mp4",
        "video-3.mp4",
        "video-2.mp4",
        "video-1.mp4",
      ])
  }

  func testPrunesFilesThatNoLongerExist() throws {
    let directory = try makeTemporaryDirectory()
    defer { try? FileManager.default.removeItem(at: directory) }

    let store = try RecentVideoStore(
      historyFileURL: directory.appendingPathComponent("history.json")
    )
    let existingURL = try makeVideo(named: "existing.mp4", in: directory)
    let removedURL = try makeVideo(named: "removed.mp4", in: directory)

    try store.record(DownloadedVideo(fileURL: existingURL, byteCount: 10))
    try store.record(DownloadedVideo(fileURL: removedURL, byteCount: 20))
    try FileManager.default.removeItem(at: removedURL)

    XCTAssertEqual(try store.load().map(\.fileURL), [existingURL])
  }

  func testRecordingSameFileDoesNotCreateDuplicate() throws {
    let directory = try makeTemporaryDirectory()
    defer { try? FileManager.default.removeItem(at: directory) }

    let store = try RecentVideoStore(
      historyFileURL: directory.appendingPathComponent("history.json")
    )
    let fileURL = try makeVideo(named: "same.mp4", in: directory)

    try store.record(DownloadedVideo(fileURL: fileURL, byteCount: 10))
    let videos = try store.record(DownloadedVideo(fileURL: fileURL, byteCount: 20))

    XCTAssertEqual(videos.count, 1)
    XCTAssertEqual(videos.first?.byteCount, 20)
  }

  private func makeTemporaryDirectory() throws -> URL {
    let directory = FileManager.default.temporaryDirectory
      .appendingPathComponent(UUID().uuidString, isDirectory: true)
    try FileManager.default.createDirectory(
      at: directory,
      withIntermediateDirectories: true
    )
    return directory
  }

  private func makeVideo(named name: String, in directory: URL) throws -> URL {
    let fileURL = directory.appendingPathComponent(name)
    try Data([0, 1, 2, 3]).write(to: fileURL)
    return fileURL
  }
}
