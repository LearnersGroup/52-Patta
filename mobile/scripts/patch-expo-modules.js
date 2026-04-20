#!/usr/bin/env node
/**
 * Patches Expo native dependencies for Xcode 16.4 / Swift 5 compatibility.
 *
 * - expo-modules-core: removes Swift 6-only `@MainActor` protocol conformances.
 * - expo-router: removes direct references to iOS 26 SDK-only toolbar APIs that
 *   fail to compile when the project is built with Xcode 16.4.
 * - expo-image: removes direct references to iOS 26-only SF Symbol draw effects
 *   that fail to compile when the project is built with Xcode 16.4.
 *
 * Runs automatically via the postinstall npm hook.
 */
const fs = require('fs');
const path = require('path');

function applyPatches(packageName, basePath, patches) {
  if (!fs.existsSync(basePath)) {
    console.log(`[patch-expo-modules] ${packageName} not found — skipping.`);
    return { applied: 0, total: patches.length };
  }

  let applied = 0;

  for (const { file, from, to } of patches) {
    const filepath = path.join(basePath, file);

    if (!fs.existsSync(filepath)) {
      console.warn(`[patch-expo-modules] WARNING: ${packageName}/${file} not found`);
      continue;
    }

    const src = fs.readFileSync(filepath, 'utf8');

    if (src.includes(to)) {
      console.log(`[patch-expo-modules] Already patched: ${packageName}/${file}`);
      applied++;
      continue;
    }

    if (!src.includes(from)) {
      console.warn(
        `[patch-expo-modules] WARNING: expected string not found in ${packageName}/${file} — package version may have changed`
      );
      continue;
    }

    fs.writeFileSync(filepath, src.replace(from, to));
    console.log(`[patch-expo-modules] Patched: ${packageName}/${file}`);
    applied++;
  }

  return { applied, total: patches.length };
}

const expoModulesCoreBase = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo',
  'node_modules',
  'expo-modules-core'
);

const expoRouterBase = path.join(__dirname, '..', 'node_modules', 'expo-router');

const expoImageBase = path.join(__dirname, '..', 'node_modules', 'expo-image');

const patchGroups = [
  {
    packageName: 'expo-modules-core',
    basePath: expoModulesCoreBase,
    patches: [
      {
        file: 'ios/Core/Views/SwiftUI/SwiftUIHostingView.swift',
        from: 'ExpoView, @MainActor AnyExpoSwiftUIHostingView {',
        to: 'ExpoView, AnyExpoSwiftUIHostingView {',
      },
      {
        file: 'ios/Core/Views/SwiftUI/SwiftUIVirtualView.swift',
        from: 'SwiftUIVirtualView: @MainActor ExpoSwiftUI.ViewWrapper {',
        to: 'SwiftUIVirtualView: ExpoSwiftUI.ViewWrapper {',
      },
      {
        file: 'ios/Core/Views/ViewDefinition.swift',
        from: 'extension UIView: @MainActor AnyArgument {',
        to: 'extension UIView: AnyArgument {',
      },
    ],
  },
  {
    packageName: 'expo-router',
    basePath: expoRouterBase,
    patches: [
      {
        file: 'ios/Toolbar/RouterToolbarHostView.swift',
        from: `            if #available(iOS 26.0, *) {
              if let hidesSharedBackground = menu.hidesSharedBackground {
                item.hidesSharedBackground = hidesSharedBackground
              }
              if let sharesBackground = menu.sharesBackground {
                item.sharesBackground = sharesBackground
              }
            }`,
        to: '            applyCompatibilityBackgroundOptions(from: menu, to: item)',
      },
      {
        file: 'ios/Toolbar/RouterToolbarHostView.swift',
        from: `  func updateMenu() {`,
        to: `  private func applyCompatibilityBackgroundOptions(
    from menu: LinkPreviewNativeActionView,
    to item: UIBarButtonItem
  ) {
    if let hidesSharedBackground = menu.hidesSharedBackground {
      setBoolValueIfSupported(
        hidesSharedBackground,
        on: item,
        selectorName: "setHidesSharedBackground:",
        key: "hidesSharedBackground"
      )
    }

    if let sharesBackground = menu.sharesBackground {
      setBoolValueIfSupported(
        sharesBackground,
        on: item,
        selectorName: "setSharesBackground:",
        key: "sharesBackground"
      )
    }
  }

  private func setBoolValueIfSupported(
    _ value: Bool,
    on object: NSObject,
    selectorName: String,
    key: String
  ) {
    let selector = NSSelectorFromString(selectorName)
    guard object.responds(to: selector) else {
      return
    }

    object.setValue(value, forKey: key)
  }

  func updateMenu() {`,
      },
      {
        file: 'ios/Toolbar/RouterToolbarItemView.swift',
        from: `    } else if type == .searchBar {
      guard #available(iOS 26.0, *), let controller = self.host?.findViewController() else {
        // Check for iOS 26, should already be guarded by the JS side, so this warning will only fire if controller is nil
        logger?.warn(
          "[expo-router] navigationItem.searchBarPlacementBarButtonItem not available. This is most likely a bug in expo-router."
        )
        currentBarButtonItem = nil
        return
      }`,
        to: `    } else if type == .searchBar {
      guard let controller = self.host?.findViewController() else {
        logger?.warn(
          "[expo-router] navigationItem.searchBarPlacementBarButtonItem not available. This is most likely a bug in expo-router."
        )
        currentBarButtonItem = nil
        return
      }`,
      },
      {
        file: 'ios/Toolbar/RouterToolbarItemView.swift',
        from: '      item = controller.navigationItem.searchBarPlacementBarButtonItem',
        to: `      let selector = NSSelectorFromString("searchBarPlacementBarButtonItem")
      guard controller.navigationItem.responds(to: selector),
        let searchItem = controller.navigationItem.value(forKey: "searchBarPlacementBarButtonItem") as? UIBarButtonItem
      else {
        logger?.warn(
          "[expo-router] navigationItem.searchBarPlacementBarButtonItem is unavailable in the current Xcode/iOS SDK combination."
        )
        currentBarButtonItem = nil
        return
      }

      item = searchItem`,
      },
      {
        file: 'ios/Toolbar/RouterToolbarItemView.swift',
        from: `  private func applyCommonProperties(to item: UIBarButtonItem) {
    if #available(iOS 26.0, *) {
      item.hidesSharedBackground = hidesSharedBackground
      item.sharesBackground = sharesBackground
    }
    item.style = barButtonItemStyle ?? .plain
    item.width = width.map { CGFloat($0) } ?? 0
    item.isSelected = selected
    item.accessibilityLabel = routerAccessibilityLabel
    item.accessibilityHint = routerAccessibilityHint
    item.isEnabled = !disabled
    if #available(iOS 26.0, *) {
      if let badgeConfig = badgeConfiguration {
        var badge = UIBarButtonItem.Badge.indicator()
        if let value = badgeConfig.value {
          badge = .string(value)
        }
        if let backgroundColor = badgeConfig.backgroundColor {
          badge.backgroundColor = backgroundColor
        }
        if let foregroundColor = badgeConfig.color {
          badge.foregroundColor = foregroundColor
        }
        if badgeConfig.fontFamily != nil || badgeConfig.fontSize != nil
          || badgeConfig.fontWeight != nil {
          let font = RouterFontUtils.convertTitleStyleToFont(
            TitleStyle(
              fontFamily: badgeConfig.fontFamily,
              fontSize: badgeConfig.fontSize,
              fontWeight: badgeConfig.fontWeight
            ))
          badge.font = font
        }
        item.badge = badge
      } else {
        item.badge = nil
      }
    }
  }`,
        to: `  private func applyCommonProperties(to item: UIBarButtonItem) {
    applyCompatibilityBackgroundOptions(to: item)
    item.style = barButtonItemStyle ?? .plain
    item.width = width.map { CGFloat($0) } ?? 0
    item.isSelected = selected
    item.accessibilityLabel = routerAccessibilityLabel
    item.accessibilityHint = routerAccessibilityHint
    item.isEnabled = !disabled
    applyCompatibilityBadgeConfiguration(to: item)
  }

  private func applyCompatibilityBackgroundOptions(to item: UIBarButtonItem) {
    setBoolValueIfSupported(
      hidesSharedBackground,
      on: item,
      selectorName: "setHidesSharedBackground:",
      key: "hidesSharedBackground"
    )
    setBoolValueIfSupported(
      sharesBackground,
      on: item,
      selectorName: "setSharesBackground:",
      key: "sharesBackground"
    )
  }

  private func applyCompatibilityBadgeConfiguration(to item: UIBarButtonItem) {
    if badgeConfiguration == nil {
      clearValueIfSupported(on: item, selectorName: "setBadge:", key: "badge")
    }
  }

  private func setBoolValueIfSupported(
    _ value: Bool,
    on object: NSObject,
    selectorName: String,
    key: String
  ) {
    let selector = NSSelectorFromString(selectorName)
    guard object.responds(to: selector) else {
      return
    }

    object.setValue(value, forKey: key)
  }

  private func clearValueIfSupported(
    on object: NSObject,
    selectorName: String,
    key: String
  ) {
    let selector = NSSelectorFromString(selectorName)
    guard object.responds(to: selector) else {
      return
    }

    object.setValue(nil, forKey: key)
  }`,
      },
      {
        file: 'ios/Toolbar/RouterToolbarModule.swift',
        from: `    case .prominent:
      if #available(iOS 26.0, *) {
        return .prominent
      } else {
        return .done
      }`,
        to: `    case .prominent:
      return .done`,
      },
    ],
  },
  {
    packageName: 'expo-image',
    basePath: expoImageBase,
    patches: [
      {
        file: 'ios/ImageView.swift',
        from: `  @available(iOS 26.0, tvOS 26.0, *)
  private func applySymbolEffectiOS26(effect: SFSymbolEffectType, scope: SFSymbolEffectScope?, options: SymbolEffectOptions) {
    switch effect {
    case .drawOn:
      switch scope {
      case .byLayer: sdImageView.addSymbolEffect(.drawOn.byLayer, options: options)
      case .wholeSymbol: sdImageView.addSymbolEffect(.drawOn.wholeSymbol, options: options)
      case .none: sdImageView.addSymbolEffect(.drawOn, options: options)
      }
    case .drawOff:
      switch scope {
      case .byLayer: sdImageView.addSymbolEffect(.drawOff.byLayer, options: options)
      case .wholeSymbol: sdImageView.addSymbolEffect(.drawOff.wholeSymbol, options: options)
      case .none: sdImageView.addSymbolEffect(.drawOff, options: options)
      }
    default:
      break
    }
  }`,
        to: `  @available(iOS 26.0, tvOS 26.0, *)
  private func applySymbolEffectiOS26(effect: SFSymbolEffectType, scope: SFSymbolEffectScope?, options: SymbolEffectOptions) {
    // These effects require newer SDK symbol-effect types than Xcode 16.4 provides.
    // Ignore them gracefully so the module still compiles on the older toolchain.
    switch effect {
    case .drawOn, .drawOff:
      break
    default:
      break
    }
  }`,
      },
    ],
  },
];

let appliedCount = 0;
let patchCount = 0;

for (const group of patchGroups) {
  const result = applyPatches(group.packageName, group.basePath, group.patches);
  appliedCount += result.applied;
  patchCount += result.total;
}

console.log(`[patch-expo-modules] Done (${appliedCount}/${patchCount} patches applied)`);
