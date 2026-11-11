import Foundation

public struct NativeDownloadRequest: Codable, Equatable, Sendable {
  public static let downloadAndCopyAction = "downloadAndCopy"

  public let action: String
  public let url: String

  public init(action: String = downloadAndCopyAction, url: String) {
    self.action = action
    self.url = url
  }

  /// The link the helper should download, or the reason it refuses the
  /// request.
  public func acceptedURL() throws -> URL {
    guard action == Self.downloadAndCopyAction else {
      throw NativeRequestError.unsupportedAction
    }

    let link = try VideoDownloader.parsedURL(from: url)
    guard VideoDownloader.isSupportedSourceURL(link) else {
      throw NativeRequestError.unsupportedHost
    }
    return link
  }
}

public enum NativeRequestError: LocalizedError {
  case unsupportedAction
  case unsupportedHost

  public var errorDescription: String? {
    switch self {
    case .unsupportedAction:
      return "The browser requested an unsupported action."
    case .unsupportedHost:
      return "The helper only accepts Reddit and X links."
    }
  }
}

/// A short, stable name for a kind of failure, sent beside the prose `error`
/// so the browser extension can pick a label without reading the prose.
public enum NativeErrorCode: String, Codable, Equatable, Sendable {
  case privatePost = "private_post"
  case loginRequired = "login_required"
  case noVideo = "no_video"
  case unavailable
  case ytdlpMissing = "ytdlp_missing"
  /// Every other failure; the only one a retry might fix.
  case failed
}

public struct NativeDownloadResponse: Codable, Equatable, Sendable {
  public let ok: Bool
  public let status: String
  public let fileName: String?
  public let error: String?
  public let code: NativeErrorCode?

  public init(
    ok: Bool,
    status: String,
    fileName: String? = nil,
    error: String? = nil,
    code: NativeErrorCode? = nil
  ) {
    self.ok = ok
    self.status = status
    self.fileName = fileName
    self.error = error
    self.code = code
  }

  /// The response for a video that was downloaded and put on the clipboard.
  public static func copied(fileName: String) -> NativeDownloadResponse {
    NativeDownloadResponse(ok: true, status: "copied", fileName: fileName)
  }

  /// The response for a request that ended in `error`. Every failure carries
  /// a code; one with no code of its own is `failed`.
  public static func failure(_ error: Error) -> NativeDownloadResponse {
    NativeDownloadResponse(
      ok: false,
      status: "error",
      error: error.localizedDescription,
      code: (error as? VideoDownloadError)?.code ?? .failed
    )
  }
}

public enum NativeMessageError: LocalizedError {
  case incompleteMessage
  case messageTooLarge

  public var errorDescription: String? {
    switch self {
    case .incompleteMessage:
      return "The browser sent an incomplete native message."
    case .messageTooLarge:
      return "The browser sent a native message that was too large."
    }
  }
}

public enum NativeMessageFraming {
  public static let maximumPayloadSize = 1_048_576

  public static func payloadLength(from header: Data) throws -> Int {
    guard header.count == MemoryLayout<UInt32>.size else {
      throw NativeMessageError.incompleteMessage
    }

    let length = header.withUnsafeBytes {
      $0.loadUnaligned(as: UInt32.self).littleEndian
    }
    guard length <= maximumPayloadSize else {
      throw NativeMessageError.messageTooLarge
    }
    return Int(length)
  }

  public static func frame<T: Encodable>(_ message: T) throws -> Data {
    let payload = try JSONEncoder().encode(message)
    guard payload.count <= maximumPayloadSize else {
      throw NativeMessageError.messageTooLarge
    }

    var length = UInt32(payload.count).littleEndian
    var framedMessage = withUnsafeBytes(of: &length) { Data($0) }
    framedMessage.append(payload)
    return framedMessage
  }
}
