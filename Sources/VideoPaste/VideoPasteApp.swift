import SwiftUI

@main
struct VideoPasteApp: App {
  @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
  @StateObject private var model = AppModel()

  var body: some Scene {
    WindowGroup("VideoPaste", id: "main") {
      ContentView(model: model)
        .frame(width: 860, height: 520)
        .onAppear {
          appDelegate.installExternalURLHandler { url in
            model.handleExternalDownloadRequest(url)
          }
          model.performMaintenance()
        }
    }
    .windowResizability(.contentSize)
    .commands {
      CommandGroup(replacing: .newItem) {}
      CommandMenu("Video") {
        Button("Download Link from Clipboard") {
          model.downloadFromClipboard()
        }
        .keyboardShortcut("v", modifiers: [.command, .option])
        .disabled(model.isDownloading)
      }
    }

    Window("VideoPaste Settings", id: "settings") {
      SettingsView(model: model)
    }
    .windowResizability(.contentSize)

    MenuBarExtra("VideoPaste", systemImage: "v.square.fill") {
      MenuBarView(model: model)
        .onAppear {
          appDelegate.installExternalURLHandler { url in
            model.handleExternalDownloadRequest(url)
          }
          model.performMaintenance()
        }
    }
    .menuBarExtraStyle(.window)
  }
}
