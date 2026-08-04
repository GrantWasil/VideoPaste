import SwiftUI
import VideoPasteCore

struct SettingsView: View {
  @ObservedObject var model: AppModel
  @AppStorage(CleanupPreferences.isEnabledKey) private var isCleanupEnabled = false
  @AppStorage(CleanupPreferences.retentionAmountKey) private var retentionAmount =
    CleanupPreferences.defaultRetentionAmount
  @AppStorage(CleanupPreferences.retentionUnitKey) private var retentionUnit =
    CleanupPreferences.defaultRetentionUnit.rawValue

  var body: some View {
    VStack(alignment: .leading, spacing: 20) {
      header
      cleanupSettings
      actions
      safetyNote
    }
    .padding(24)
    .frame(width: 520)
    .onAppear(perform: normalizeStoredValues)
    .onChange(of: retentionAmount) { _ in
      normalizeRetentionAmount()
    }
  }

  private var header: some View {
    HStack(spacing: 12) {
      Image(systemName: "gearshape.2.fill")
        .font(.system(size: 26))
        .foregroundStyle(.orange)

      VStack(alignment: .leading, spacing: 2) {
        Text("Settings")
          .font(.title2.weight(.semibold))
        Text("Manage how long downloaded videos stay on your Mac.")
          .font(.callout)
          .foregroundStyle(.secondary)
      }
    }
  }

  private var cleanupSettings: some View {
    GroupBox {
      VStack(alignment: .leading, spacing: 14) {
        Toggle(
          "Automatically move old downloads to Trash",
          isOn: $isCleanupEnabled
        )
        .toggleStyle(.switch)

        Divider()

        HStack(spacing: 8) {
          Text("Move videos to Trash after")
          Spacer()

          TextField(
            "Amount",
            value: $retentionAmount,
            format: .number.grouping(.never)
          )
          .multilineTextAlignment(.trailing)
          .frame(width: 64)

          Stepper(
            "Retention amount",
            value: $retentionAmount,
            in: CleanupPreferences.retentionAmountRange
          )
          .labelsHidden()

          Picker("Unit", selection: $retentionUnit) {
            ForEach(VideoRetentionUnit.allCases, id: \.rawValue) { unit in
              Text(unit.settingsTitle(for: retentionAmount)).tag(unit.rawValue)
            }
          }
          .labelsHidden()
          .frame(width: 100)
        }

        Text(
          "VideoPaste checks at launch, after downloads, whenever you open the app or menu, and every 15 minutes while it is running."
        )
        .font(.caption)
        .foregroundStyle(.secondary)
        .fixedSize(horizontal: false, vertical: true)
      }
      .padding(6)
    }
  }

  private var actions: some View {
    HStack(spacing: 12) {
      Button("Clean Up Now") {
        normalizeStoredValues()
        model.runAutomaticCleanup()
      }
      .disabled(!isCleanupEnabled)

      if let cleanupStatusMessage = model.cleanupStatusMessage {
        Text("Last cleanup: \(cleanupStatusMessage)")
          .font(.caption)
          .foregroundStyle(.secondary)
          .lineLimit(2)
      }

      Spacer()
    }
  }

  private var safetyNote: some View {
    Label(
      "Only video files created by VideoPaste are included. Files are moved to Trash, which VideoPaste never empties.",
      systemImage: "trash"
    )
    .font(.caption)
    .foregroundStyle(.secondary)
    .fixedSize(horizontal: false, vertical: true)
  }

  private func normalizeStoredValues() {
    normalizeRetentionAmount()
    guard VideoRetentionUnit(rawValue: retentionUnit) == nil else {
      return
    }
    retentionUnit = CleanupPreferences.defaultRetentionUnit.rawValue
  }

  private func normalizeRetentionAmount() {
    retentionAmount = min(
      max(retentionAmount, CleanupPreferences.retentionAmountRange.lowerBound),
      CleanupPreferences.retentionAmountRange.upperBound
    )
  }
}
