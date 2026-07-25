import AppKit
import Foundation

public enum FileClipboardError: LocalizedError {
  case copyFailed

  public var errorDescription: String? {
    "The video was saved, but macOS would not copy it to the clipboard."
  }
}

public enum FileClipboardWriter {
  @MainActor
  public static func copy(_ fileURL: URL) throws {
    let pasteboard = NSPasteboard.general
    pasteboard.clearContents()

    let legacyFilenameType = NSPasteboard.PasteboardType(
      "NSFilenamesPboardType"
    )
    pasteboard.declareTypes([.fileURL, legacyFilenameType], owner: nil)

    let wroteFileURL = pasteboard.setString(
      fileURL.absoluteString,
      forType: .fileURL
    )
    let wroteLegacyPath = pasteboard.setPropertyList(
      [fileURL.path],
      forType: legacyFilenameType
    )

    guard wroteFileURL || wroteLegacyPath else {
      throw FileClipboardError.copyFailed
    }
  }
}
