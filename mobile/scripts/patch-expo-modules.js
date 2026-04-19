#!/usr/bin/env node
/**
 * Patches expo-modules-core to remove @MainActor from protocol conformances.
 * These are Swift 6-only syntax that fails to compile in Swift 5 mode (Xcode 16.4).
 * Runs automatically via the postinstall npm hook.
 */
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', 'node_modules', 'expo', 'node_modules', 'expo-modules-core');

const patches = [
  {
    file: 'ios/Core/Views/SwiftUI/SwiftUIHostingView.swift',
    from: 'ExpoView, @MainActor AnyExpoSwiftUIHostingView {',
    to:   'ExpoView, AnyExpoSwiftUIHostingView {',
  },
  {
    file: 'ios/Core/Views/SwiftUI/SwiftUIVirtualView.swift',
    from: 'SwiftUIVirtualView: @MainActor ExpoSwiftUI.ViewWrapper {',
    to:   'SwiftUIVirtualView: ExpoSwiftUI.ViewWrapper {',
  },
  {
    file: 'ios/Core/Views/ViewDefinition.swift',
    from: 'extension UIView: @MainActor AnyArgument {',
    to:   'extension UIView: AnyArgument {',
  },
];

if (!fs.existsSync(BASE)) {
  console.log('[patch-expo-modules] expo/node_modules/expo-modules-core not found — skipping.');
  process.exit(0);
}

let applied = 0;
for (const { file, from, to } of patches) {
  const filepath = path.join(BASE, file);
  if (!fs.existsSync(filepath)) {
    console.warn(`[patch-expo-modules] WARNING: ${file} not found`);
    continue;
  }
  const src = fs.readFileSync(filepath, 'utf8');
  if (src.includes(to)) {
    console.log(`[patch-expo-modules] Already patched: ${file}`);
    applied++;
    continue;
  }
  if (!src.includes(from)) {
    console.warn(`[patch-expo-modules] WARNING: expected string not found in ${file} — expo-modules-core version may have changed`);
    continue;
  }
  fs.writeFileSync(filepath, src.replace(from, to));
  console.log(`[patch-expo-modules] Patched: ${file}`);
  applied++;
}

console.log(`[patch-expo-modules] Done (${applied}/${patches.length} files)`);
