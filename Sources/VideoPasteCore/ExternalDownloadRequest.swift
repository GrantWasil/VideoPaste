import Foundation

public enum ExternalDownloadRequest {
  public static let scheme = "videopaste"

  public static func sourceURL(from handoffURL: URL) throws -> URL {
    guard handoffURL.scheme?.lowercased() == scheme,
      handoffURL.host?.lowercased() == "download",
      let components = URLComponents(
        url: handoffURL,
        resolvingAgainstBaseURL: false
      ),
      let sourceValue = components.queryItems?
        .first(where: { $0.name == "url" })?
        .value
    else {
      throw VideoDownloadError.invalidURL
    }

    return try VideoDownloader.parsedURL(from: sourceValue)
  }
}
