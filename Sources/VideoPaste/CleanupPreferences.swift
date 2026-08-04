import Foundation
import VideoPasteCore

struct CleanupPreferences {
  static let isEnabledKey = "automaticCleanupEnabled"
  static let retentionAmountKey = "automaticCleanupRetentionAmount"
  static let retentionUnitKey = "automaticCleanupRetentionUnit"
  static let defaultRetentionAmount = 7
  static let defaultRetentionUnit = VideoRetentionUnit.days
  static let retentionAmountRange = 1...9_999

  let isEnabled: Bool
  let retentionAmount: Int
  let retentionUnit: VideoRetentionUnit

  var retentionInterval: TimeInterval {
    retentionUnit.timeInterval(for: retentionAmount)
  }

  func cutoffDate(relativeTo date: Date = Date()) -> Date {
    date.addingTimeInterval(-retentionInterval)
  }

  static func current(defaults: UserDefaults = .standard) -> CleanupPreferences {
    let storedAmount =
      defaults.object(forKey: retentionAmountKey) as? Int
      ?? defaultRetentionAmount
    let retentionAmount = min(
      max(storedAmount, retentionAmountRange.lowerBound),
      retentionAmountRange.upperBound
    )
    let retentionUnit =
      defaults.string(forKey: retentionUnitKey)
      .flatMap(VideoRetentionUnit.init(rawValue:))
      ?? defaultRetentionUnit

    return CleanupPreferences(
      isEnabled: defaults.bool(forKey: isEnabledKey),
      retentionAmount: retentionAmount,
      retentionUnit: retentionUnit
    )
  }
}

extension VideoRetentionUnit {
  func settingsTitle(for amount: Int) -> String {
    let isSingular = amount == 1
    switch self {
    case .hours:
      return isSingular ? "Hour" : "Hours"
    case .days:
      return isSingular ? "Day" : "Days"
    case .weeks:
      return isSingular ? "Week" : "Weeks"
    }
  }
}
