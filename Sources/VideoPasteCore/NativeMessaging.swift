import Foundation

public struct NativeDownloadRequest: Codable, Equatable, Sendable {
  public let action: String
  public let url: String

  public init(action: String = "downloadAndCopy", url: String) {
    self.action = action
    self.url = url
  }
}

public struct NativeDownloadResponse: Codable, Equatable, Sendable {
  public let ok: Bool
  public let status: String
  public let fileName: String?
  public let error: String?

  public init(
    ok: Bool,
    status: String,
    fileName: String? = nil,
    error: String? = nil
  ) {
    self.ok = ok
    self.status = status
    self.fileName = fileName
    self.error = error
  }
}

public enum NativeMessageError: LocalizedError {
  case incompleteMessage
  case messageTooLarge

  public var errorDescription: String? {
    switch self {
    case .incompleteMessage:
      return "Firefox sent an incomplete native message."
    case .messageTooLarge:
      return "Firefox sent a native message that was too large."
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
