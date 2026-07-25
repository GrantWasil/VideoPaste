import AppKit
import SwiftUI
import VideoPasteCore

struct MenuBarView: View {
  @ObservedObject var model: AppModel
  @Environment(\.openWindow) private var openWindow

  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      header
      downloadButton
      status

      if !model.recentVideos.isEmpty {
        Divider()
        recentVideos
      }

      Divider()
      footer
    }
    .padding(16)
    .frame(width: 330)
  }

  private var header: some View {
    HStack(spacing: 10) {
      ZStack {
        RoundedRectangle(cornerRadius: 9, style: .continuous)
          .fill(
            LinearGradient(
              colors: [.orange, .red],
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          )
        Text("V")
          .font(.system(size: 18, weight: .bold, design: .rounded))
          .foregroundStyle(.white)
      }
      .frame(width: 36, height: 36)

      VStack(alignment: .leading, spacing: 2) {
        Text("VideoPaste")
          .font(.headline)
        Text("Paste a video into Signal")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
    }
  }

  private var downloadButton: some View {
    Button(action: model.downloadFromClipboard) {
      HStack {
        if model.isDownloading {
          ProgressView()
            .controlSize(.small)
        } else {
          Image(systemName: "doc.on.clipboard")
        }
        Text(model.isDownloading ? "Downloading…" : "Download Link from Clipboard")
        Spacer()
      }
      .frame(maxWidth: .infinity)
    }
    .buttonStyle(.borderedProminent)
    .controlSize(.large)
    .tint(.orange)
    .disabled(model.isDownloading)
  }

  @ViewBuilder
  private var status: some View {
    switch model.state {
    case .idle:
      Label(
        "Copy a Reddit video link, then click the button above.",
        systemImage: "command"
      )
      .foregroundStyle(.secondary)

    case .downloading:
      Label("Fetching the video from Reddit…", systemImage: "arrow.down.circle")
        .foregroundStyle(.secondary)

    case .success(let video):
      HStack(alignment: .top, spacing: 8) {
        Image(systemName: "checkmark.circle.fill")
          .foregroundStyle(.green)
        VStack(alignment: .leading, spacing: 2) {
          Text("Copied and ready for Signal")
            .font(.callout.weight(.medium))
          Text(video.fileURL.lastPathComponent)
            .font(.caption)
            .foregroundStyle(.secondary)
            .lineLimit(1)
            .truncationMode(.middle)
        }
      }

    case .failure(let message):
      HStack(alignment: .top, spacing: 8) {
        Image(systemName: "exclamationmark.triangle.fill")
          .foregroundStyle(.red)
        Text(message)
          .font(.caption)
          .foregroundStyle(.secondary)
          .fixedSize(horizontal: false, vertical: true)
      }
    }
  }

  private var recentVideos: some View {
    VStack(alignment: .leading, spacing: 9) {
      Text("RECENT")
        .font(.caption2.weight(.semibold))
        .foregroundStyle(.secondary)
        .tracking(0.7)

      ForEach(model.recentVideos.prefix(3)) { video in
        HStack(spacing: 8) {
          Image(systemName: "play.rectangle.fill")
            .foregroundStyle(.orange)

          VStack(alignment: .leading, spacing: 1) {
            Text(video.fileURL.lastPathComponent)
              .font(.caption)
              .lineLimit(1)
              .truncationMode(.middle)
            Text(ByteCountFormatter.string(fromByteCount: video.byteCount, countStyle: .file))
              .font(.caption2)
              .foregroundStyle(.secondary)
          }

          Spacer()

          Button {
            model.copyRecentVideo(video)
          } label: {
            Image(systemName: "doc.on.doc")
          }
          .buttonStyle(.borderless)
          .help("Copy this video again")
        }
      }
    }
  }

  private var footer: some View {
    HStack(spacing: 12) {
      Button("Open App") {
        openWindow(id: "main")
        NSApplication.shared.activate(ignoringOtherApps: true)
      }

      Button {
        model.openDownloadsFolder()
      } label: {
        Image(systemName: "folder")
      }
      .help("Open the video Downloads folder")

      Spacer()

      Button("Quit") {
        NSApplication.shared.terminate(nil)
      }
    }
    .controlSize(.small)
  }
}
