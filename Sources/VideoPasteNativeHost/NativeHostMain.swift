import Foundation
import VideoPasteCore

@main
struct VideoPasteNativeHost {
  static func main() async {
    let response: NativeDownloadResponse

    do {
      let sourceURL = try readRequest().acceptedURL()
      let video = try await VideoDownloader.download(from: sourceURL)
      try FileClipboardWriter.copy(video.fileURL)
      if let historyStore = try? RecentVideoStore() {
        _ = try? historyStore.record(video)
      }

      response = .copied(fileName: video.fileURL.lastPathComponent)
    } catch {
      response = .failure(error)
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
