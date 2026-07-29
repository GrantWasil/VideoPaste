import Foundation
import VideoPasteCore

private enum NativeHostError: LocalizedError {
  case unsupportedAction
  case unsupportedHost

  var errorDescription: String? {
    switch self {
    case .unsupportedAction:
      return "The browser requested an unsupported action."
    case .unsupportedHost:
      return "The helper only accepts Reddit and X video post links."
    }
  }
}

@main
struct VideoPasteNativeHost {
  static func main() async {
    let response: NativeDownloadResponse

    do {
      let request = try readRequest()
      guard request.action == "downloadAndCopy" else {
        throw NativeHostError.unsupportedAction
      }

      let sourceURL = try VideoDownloader.parsedURL(from: request.url)
      guard VideoDownloader.isSupportedSourceURL(sourceURL) else {
        throw NativeHostError.unsupportedHost
      }

      let video = try await VideoDownloader.download(from: sourceURL)
      try FileClipboardWriter.copy(video.fileURL)
      if let historyStore = try? RecentVideoStore() {
        _ = try? historyStore.record(video)
      }

      response = NativeDownloadResponse(
        ok: true,
        status: "copied",
        fileName: video.fileURL.lastPathComponent
      )
    } catch {
      response = NativeDownloadResponse(
        ok: false,
        status: "error",
        error: error.localizedDescription
      )
    }

    do {
      try writeResponse(response)
    } catch {
      writeError(error.localizedDescription)
    }
  }

  private static func readRequest() throws -> NativeDownloadRequest {
    let input = FileHandle.standardInput
    let header = try readExactly(
      MemoryLayout<UInt32>.size,
      from: input
    )
    let payloadLength = try NativeMessageFraming.payloadLength(from: header)
    let payload = try readExactly(payloadLength, from: input)
    return try JSONDecoder().decode(
      NativeDownloadRequest.self,
      from: payload
    )
  }

  private static func readExactly(
    _ byteCount: Int,
    from fileHandle: FileHandle
  ) throws -> Data {
    var data = Data()

    while data.count < byteCount {
      let remainingCount = byteCount - data.count
      guard
        let chunk = try fileHandle.read(upToCount: remainingCount),
        !chunk.isEmpty
      else {
        throw NativeMessageError.incompleteMessage
      }
      data.append(chunk)
    }

    return data
  }

  private static func writeResponse(
    _ response: NativeDownloadResponse
  ) throws {
    let frame = try NativeMessageFraming.frame(response)
    try FileHandle.standardOutput.write(contentsOf: frame)
  }

  private static func writeError(_ message: String) {
    guard let data = "\(message)\n".data(using: .utf8) else {
      return
    }
    try? FileHandle.standardError.write(contentsOf: data)
  }

}
