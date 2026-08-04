import SwiftUI
import VideoPasteCore

struct ContentView: View {
  @ObservedObject var model: AppModel
  @State private var videoPendingDeletion: RecentVideo?
  @State private var showingDeleteConfirmation = false
  @FocusState private var linkFieldIsFocused: Bool

  var body: some View {
    HStack(spacing: 0) {
      mainColumn
      Divider()
      historySidebar
    }
    .frame(width: 860, height: 520)
    .background(Color(nsColor: .windowBackgroundColor))
    .onAppear {
      model.loadURLFromClipboardIfUseful()
      linkFieldIsFocused = true
    }
    .alert(
      "Move video to Trash?",
      isPresented: $showingDeleteConfirmation,
      presenting: videoPendingDeletion
    ) { video in
      Button("Move to Trash", role: .destructive) {
        model.moveRecentVideoToTrash(video)
        videoPendingDeletion = nil
      }
      Button("Cancel", role: .cancel) {
        videoPendingDeletion = nil
      }
    } message: { video in
      Text("“\(video.fileURL.lastPathComponent)” can be recovered from Trash.")
    }
  }

  private var mainColumn: some View {
    VStack(alignment: .leading, spacing: 22) {
      header
      linkEntry
      primaryAction
      statusArea
      Spacer(minLength: 0)
      footer
    }
    .padding(28)
    .frame(width: 560, height: 520)
  }

  private var header: some View {
    HStack(spacing: 14) {
      ZStack {
        RoundedRectangle(cornerRadius: 13, style: .continuous)
          .fill(
            LinearGradient(
              colors: [.orange, .red],
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          )
        Image(systemName: "play.rectangle.fill")
          .font(.system(size: 25, weight: .semibold))
          .foregroundStyle(.white)
      }
      .frame(width: 52, height: 52)

      VStack(alignment: .leading, spacing: 3) {
        Text("VideoPaste")
          .font(.system(size: 24, weight: .bold, design: .rounded))
        Text("Turn a Reddit or X video post into a file you can paste in Signal.")
          .font(.subheadline)
          .foregroundStyle(.secondary)
      }
    }
  }

  private var linkEntry: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("VIDEO LINK")
        .font(.caption.weight(.semibold))
        .foregroundStyle(.secondary)
        .tracking(0.8)

      HStack(spacing: 8) {
        TextField(
          "https://x.com/…/status/…",
          text: $model.inputURL,
          axis: .vertical
        )
        .textFieldStyle(.roundedBorder)
        .lineLimit(1...3)
        .focused($linkFieldIsFocused)
        .disabled(model.isDownloading)
        .onSubmit(model.downloadAndCopy)

        Button("Paste", action: model.pasteURL)
          .disabled(model.isDownloading)
      }

      Text(
        "Direct video addresses work immediately. Reddit and public X post links require yt-dlp."
      )
      .font(.caption)
      .foregroundStyle(.tertiary)
    }
  }

  private var primaryAction: some View {
    Button(action: model.downloadAndCopy) {
      HStack(spacing: 8) {
        if model.isDownloading {
          ProgressView()
            .controlSize(.small)
        } else {
          Image(systemName: "arrow.down.to.line.compact")
        }
        Text(model.isDownloading ? "Downloading…" : "Download & Copy Video")
      }
      .frame(maxWidth: .infinity)
      .padding(.vertical, 4)
      .foregroundStyle(.white)
    }
    .buttonStyle(.borderedProminent)
    .controlSize(.large)
    .tint(VideoPasteTheme.primaryActionTint)
    .keyboardShortcut(.return, modifiers: .command)
    .disabled(
      model.isDownloading
        || model.inputURL.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    )
  }

  @ViewBuilder
  private var statusArea: some View {
    switch model.state {
    case .idle:
      HStack(spacing: 10) {
        Image(systemName: "command")
          .foregroundStyle(.secondary)
        Text("After it finishes, switch to Signal and press ⌘V.")
          .foregroundStyle(.secondary)
      }
      .font(.callout)

    case .downloading:
      statusCard(color: .orange) {
        VStack(alignment: .leading, spacing: 5) {
          Text("Fetching the video…")
            .font(.headline)
          Text("Keep this window open. Most direct links finish in a few seconds.")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }

    case .success(let video):
      statusCard(color: .green) {
        VStack(alignment: .leading, spacing: 10) {
          HStack(alignment: .top, spacing: 10) {
            Image(systemName: "checkmark.circle.fill")
              .foregroundStyle(.green)
              .font(.title2)
            VStack(alignment: .leading, spacing: 3) {
              Text("Copied to your clipboard")
                .font(.headline)
              Text("\(video.fileURL.lastPathComponent) · \(formattedSize(video.byteCount))")
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            }
          }

          HStack {
            Button("Copy Again") {
              model.copyAgain(video)
            }
            Button("Show in Finder") {
              model.showInFinder(video)
            }
            Spacer()
            Text("Ready for ⌘V in Signal")
              .font(.caption.weight(.medium))
              .foregroundStyle(.green)
          }
        }
      }

    case .failure(let message):
      statusCard(color: .red) {
        HStack(alignment: .top, spacing: 10) {
          Image(systemName: "exclamationmark.triangle.fill")
            .foregroundStyle(.red)
          VStack(alignment: .leading, spacing: 5) {
            Text("Couldn’t prepare that video")
              .font(.headline)
            Text(message)
              .font(.caption)
              .foregroundStyle(.secondary)
              .fixedSize(horizontal: false, vertical: true)
          }
        }
      }
    }
  }

  private var footer: some View {
    HStack {
      Image(systemName: "folder")
      Text("Videos save to Downloads › VideoPaste")
      Spacer()
      if !model.inputURL.isEmpty && !model.isDownloading {
        Button("Clear", action: model.clear)
          .buttonStyle(.plain)
          .foregroundStyle(.secondary)
      }
    }
    .font(.caption)
    .foregroundStyle(.tertiary)
  }

  private var historySidebar: some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack {
        VStack(alignment: .leading, spacing: 3) {
          Text("RECENT DOWNLOADS")
            .font(.caption.weight(.semibold))
            .foregroundStyle(.secondary)
            .tracking(0.8)
          Text("Your latest five videos")
            .font(.caption)
            .foregroundStyle(.tertiary)
        }
        Spacer()
        Text("\(model.recentVideos.count)")
          .font(.caption.weight(.semibold))
          .foregroundStyle(.secondary)
          .padding(.horizontal, 8)
          .padding(.vertical, 3)
          .background(.quaternary, in: Capsule())
      }

      if model.recentVideos.isEmpty {
        Spacer()
        VStack(spacing: 10) {
          Image(systemName: "clock.arrow.circlepath")
            .font(.system(size: 28))
            .foregroundStyle(.tertiary)
          Text("Downloaded videos will appear here.")
            .font(.callout)
            .foregroundStyle(.secondary)
            .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        Spacer()
      } else {
        ScrollView {
          LazyVStack(spacing: 9) {
            ForEach(model.recentVideos) { video in
              historyRow(video)
            }
          }
        }
        .scrollIndicators(.never)
      }

      HStack(spacing: 6) {
        Image(systemName: "trash")
        Text("Delete moves files to Trash")
      }
      .font(.caption2)
      .foregroundStyle(.tertiary)
    }
    .padding(20)
    .frame(width: 300, height: 520)
    .background(Color(nsColor: .controlBackgroundColor).opacity(0.45))
  }

  private func historyRow(_ video: RecentVideo) -> some View {
    VStack(alignment: .leading, spacing: 9) {
      HStack(spacing: 9) {
        ZStack {
          RoundedRectangle(cornerRadius: 8, style: .continuous)
            .fill(.orange.opacity(0.13))
          Image(systemName: "play.rectangle.fill")
            .foregroundStyle(.orange)
        }
        .frame(width: 38, height: 38)

        VStack(alignment: .leading, spacing: 2) {
          Text(video.fileURL.lastPathComponent)
            .font(.caption.weight(.medium))
            .lineLimit(1)
            .truncationMode(.middle)
          Text("\(formattedDate(video.downloadedAt)) · \(formattedSize(video.byteCount))")
            .font(.caption2)
            .foregroundStyle(.secondary)
        }
      }

      HStack(spacing: 6) {
        Button {
          model.copyRecentVideo(video)
        } label: {
          Label("Copy", systemImage: "doc.on.doc")
        }
        .help("Copy this video for pasting in Signal")

        Button {
          model.openRecentVideo(video)
        } label: {
          Label("Open", systemImage: "play.fill")
        }
        .help("Open this video")

        Spacer()

        Button(role: .destructive) {
          videoPendingDeletion = video
          showingDeleteConfirmation = true
        } label: {
          Image(systemName: "trash")
        }
        .help("Move this video to Trash")
      }
      .buttonStyle(.bordered)
      .controlSize(.small)
    }
    .padding(10)
    .background(
      Color(nsColor: .windowBackgroundColor),
      in: RoundedRectangle(cornerRadius: 11, style: .continuous)
    )
    .overlay {
      RoundedRectangle(cornerRadius: 11, style: .continuous)
        .stroke(.quaternary, lineWidth: 1)
    }
  }

  private func statusCard<Content: View>(
    color: Color,
    @ViewBuilder content: () -> Content
  ) -> some View {
    content()
      .padding(14)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(
        color.opacity(0.08),
        in: RoundedRectangle(cornerRadius: 12, style: .continuous)
      )
      .overlay {
        RoundedRectangle(cornerRadius: 12, style: .continuous)
          .stroke(color.opacity(0.18), lineWidth: 1)
      }
  }

  private func formattedSize(_ bytes: Int64) -> String {
    ByteCountFormatter.string(
      fromByteCount: bytes,
      countStyle: .file
    )
  }

  private func formattedDate(_ date: Date) -> String {
    if abs(date.timeIntervalSinceNow) < 60 {
      return "Just now"
    }

    let formatter = RelativeDateTimeFormatter()
    formatter.unitsStyle = .short
    return formatter.localizedString(for: date, relativeTo: Date())
  }
}
