import AppKit

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
  private var externalURLHandler: ((URL) -> Void)?
  private var pendingURLs: [URL] = []

  func installExternalURLHandler(_ handler: @escaping (URL) -> Void) {
    externalURLHandler = handler

    let queuedURLs = pendingURLs
    pendingURLs.removeAll()
    queuedURLs.forEach(handler)
  }

  func application(_ application: NSApplication, open urls: [URL]) {
    guard let externalURLHandler else {
      pendingURLs.append(contentsOf: urls)
      return
    }

    urls.forEach(externalURLHandler)
  }
}
