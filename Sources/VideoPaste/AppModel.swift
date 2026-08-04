import AppKit
import Foundation
import VideoPasteCore

@MainActor
final class AppModel: ObservableObject {
  enum State {
    case idle
    case downloading
    case success(DownloadedVideo)
    case failure(String)
  }

  @Published var inputURL = ""
  @Published private(set) var state: State = .idle
  @Published private(set) var recentVideos: [RecentVideo] = []
  @Published private(set) var cleanupStatusMessage: String?

  private static let cleanupCheckInterval: TimeInterval = 15 * 60
  private var historyStore: RecentVideoStore?
  private var cleanupTimer: Timer?

  init() {
    do {
      let store = try RecentVideoStore()
      historyStore = store
      recentVideos = try store.load()
    } catch {
      historyStore = nil
      recentVideos = []
    }

    runAutomaticCleanup()
    startCleanupTimer()
  }

  deinit {
    cleanupTimer?.invalidate()
  }

  var isDownloading: Bool {
    if case .downloading = state {
      return true
    }
    return false
  }

  func loadURLFromClipboardIfUseful() {
    guard inputURL.isEmpty,
      let value = NSPasteboard.general.string(forType: .string),
      let url = try? VideoDownloader.parsedURL(from: value),
      VideoDownloader.isSupportedSourceURL(url)
    else {
      return
    }

    inputURL = value.trimmingCharacters(in: .whitespacesAndNewlines)
  }

  func pasteURL() {
    guard let value = NSPasteboard.general.string(forType: .string) else {
      state = .failure("The clipboard doesn’t contain a link.")
      return
    }

    inputURL = value.trimmingCharacters(in: .whitespacesAndNewlines)
    state = .idle
  }

  func downloadFromClipboard() {
    guard let value = NSPasteboard.general.string(forType: .string) else {
      state = .failure("The clipboard doesn’t contain a link.")
      return
    }

    inputURL = value.trimmingCharacters(in: .whitespacesAndNewlines)
    downloadAndCopy()
  }

  func handleExternalDownloadRequest(_ handoffURL: URL) {
    do {
      let sourceURL = try ExternalDownloadRequest.sourceURL(from: handoffURL)
      guard VideoDownloader.isSupportedSourceURL(sourceURL) else {
        throw VideoDownloadError.unsupportedURL
      }
      inputURL = sourceURL.absoluteString
      downloadAndCopy()
    } catch {
      state = .failure("The browser button sent an invalid Reddit or X video link.")
    }
  }

  func clear() {
    inputURL = ""
    state = .idle
  }

  func downloadAndCopy() {
    guard !isDownloading else {
      return
    }

    let sourceURL: URL
    do {
      sourceURL = try VideoDownloader.parsedURL(from: inputURL)
    } catch {
      state = .failure(error.localizedDescription)
      return
    }

    state = .downloading

    Task {
      do {
        let video = try await VideoDownloader.download(from: sourceURL)
        try FileClipboardWriter.copy(video.fileURL)
        recordInHistory(video)
        state = .success(video)
        runAutomaticCleanup()
      } catch {
        state = .failure(error.localizedDescription)
      }
    }
  }

  func copyAgain(_ video: DownloadedVideo) {
    do {
      try FileClipboardWriter.copy(video.fileURL)
      state = .success(video)
    } catch {
      state = .failure(error.localizedDescription)
    }
  }

  func showInFinder(_ video: DownloadedVideo) {
    NSWorkspace.shared.activateFileViewerSelecting([video.fileURL])
  }

  func openDownloadsFolder() {
    do {
      let directory = try VideoDownloader.defaultOutputDirectory()
      guard NSWorkspace.shared.open(directory) else {
        state = .failure("macOS couldn’t open the Downloads folder.")
        return
      }
    } catch {
      state = .failure(error.localizedDescription)
    }
  }

  func copyRecentVideo(_ video: RecentVideo) {
    guard videoIsAvailable(video) else {
      return
    }

    copyAgain(
      DownloadedVideo(
        fileURL: video.fileURL,
        byteCount: video.byteCount
      )
    )
  }

  func openRecentVideo(_ video: RecentVideo) {
    guard videoIsAvailable(video) else {
      return
    }

    guard NSWorkspace.shared.open(video.fileURL) else {
      state = .failure("macOS couldn’t open that video.")
      return
    }
  }

  func moveRecentVideoToTrash(_ video: RecentVideo) {
    do {
      if FileManager.default.fileExists(atPath: video.fileURL.path) {
        _ = try FileManager.default.trashItem(
          at: video.fileURL,
          resultingItemURL: nil
        )
      }
      removeFromHistory(video)

      if case .success(let currentVideo) = state,
        currentVideo.fileURL.standardizedFileURL
          == video.fileURL.standardizedFileURL
      {
        state = .idle
      }
    } catch {
      state = .failure("The video couldn’t be moved to Trash: \(error.localizedDescription)")
    }
  }

  func performMaintenance() {
    reloadHistory()
    runAutomaticCleanup()
  }

  func runAutomaticCleanup() {
    let preferences = CleanupPreferences.current()
    guard preferences.isEnabled else {
      return
    }

    do {
      let directory = try VideoDownloader.defaultOutputDirectory()
      let expiredVideos = try VideoCleanup.expiredVideoURLs(
        in: directory,
        olderThan: preferences.cutoffDate()
      )
      var movedCount = 0
      var failedCount = 0

      for videoURL in expiredVideos {
        do {
          _ = try FileManager.default.trashItem(
            at: videoURL,
            resultingItemURL: nil
          )
          movedCount += 1
        } catch {
          failedCount += 1
        }
      }

      reloadHistory()
      clearSuccessStateIfVideoIsMissing()
      cleanupStatusMessage = cleanupResultMessage(
        movedCount: movedCount,
        failedCount: failedCount
      )
    } catch {
      cleanupStatusMessage = "Cleanup couldn’t run: \(error.localizedDescription)"
    }
  }

  private func recordInHistory(_ video: DownloadedVideo) {
    guard let historyStore else {
      return
    }

    do {
      recentVideos = try historyStore.record(video)
    } catch {
      // A history write should never make a successful download look failed.
    }
  }

  private func removeFromHistory(_ video: RecentVideo) {
    do {
      if let historyStore {
        recentVideos = try historyStore.remove(id: video.id)
      } else {
        recentVideos.removeAll { $0.id == video.id }
      }
    } catch {
      recentVideos.removeAll { $0.id == video.id }
    }
  }

  private func reloadHistory() {
    do {
      if let historyStore {
        recentVideos = try historyStore.load()
      } else {
        recentVideos.removeAll {
          !FileManager.default.fileExists(atPath: $0.fileURL.path)
        }
      }
    } catch {
      recentVideos.removeAll {
        !FileManager.default.fileExists(atPath: $0.fileURL.path)
      }
    }
  }

  private func clearSuccessStateIfVideoIsMissing() {
    guard case .success(let currentVideo) = state else {
      return
    }
    guard !FileManager.default.fileExists(atPath: currentVideo.fileURL.path) else {
      return
    }
    state = .idle
  }

  private func cleanupResultMessage(movedCount: Int, failedCount: Int) -> String {
    if failedCount > 0 {
      return "Moved \(movedCount) to Trash; couldn’t move \(failedCount)."
    }
    if movedCount == 1 {
      return "Moved 1 expired video to Trash."
    }
    if movedCount > 1 {
      return "Moved \(movedCount) expired videos to Trash."
    }
    return "No expired VideoPaste downloads found."
  }

  private func startCleanupTimer() {
    cleanupTimer = Timer.scheduledTimer(
      withTimeInterval: Self.cleanupCheckInterval,
      repeats: true
    ) { [weak self] _ in
      Task { @MainActor [weak self] in
        self?.runAutomaticCleanup()
      }
    }
    cleanupTimer?.tolerance = 60
  }

  private func videoIsAvailable(_ video: RecentVideo) -> Bool {
    guard FileManager.default.fileExists(atPath: video.fileURL.path) else {
      removeFromHistory(video)
      state = .failure("That video has been moved or deleted, so it was removed from Recents.")
      return false
    }
    return true
  }
}
