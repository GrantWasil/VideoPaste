// swift-tools-version: 6.2

import PackageDescription

let package = Package(
  name: "VideoPaste",
  platforms: [
    .macOS(.v13)
  ],
  products: [
    .library(
      name: "VideoPasteCore",
      targets: ["VideoPasteCore"]
    ),
    .executable(
      name: "VideoPaste",
      targets: ["VideoPaste"]
    ),
    .executable(
      name: "VideoPasteNativeHost",
      targets: ["VideoPasteNativeHost"]
    ),
  ],
  targets: [
    .target(
      name: "VideoPasteCore"
    ),
    .executableTarget(
      name: "VideoPaste",
      dependencies: ["VideoPasteCore"]
    ),
    .executableTarget(
      name: "VideoPasteNativeHost",
      dependencies: ["VideoPasteCore"]
    ),
    .testTarget(
      name: "VideoPasteCoreTests",
      dependencies: ["VideoPasteCore"]
    ),
  ],
  swiftLanguageModes: [.v5]
)
