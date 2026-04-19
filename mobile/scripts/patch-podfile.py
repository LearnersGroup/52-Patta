#!/usr/bin/env python3
"""
Appends a post_install hook to ios/Podfile that forces SWIFT_VERSION=5.9
on every CocoaPods target. Required because expo-modules-core@55 uses
@MainActor syntax that is a hard error in Xcode 16.4's Swift 6 default mode.

Run from the mobile/ directory (or anywhere — path is resolved relative to
this script file).
"""
import os, sys

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
podfile_path = os.path.join(root, 'ios', 'Podfile')

if not os.path.exists(podfile_path):
    print(f'[patch-podfile] ERROR: Podfile not found at {podfile_path}')
    sys.exit(1)

with open(podfile_path) as f:
    content = f.read()

MARKER = '# __swift59_fix__'

if MARKER in content:
    print('[patch-podfile] Already patched — skipping.')
    sys.exit(0)

hook = f"""
{MARKER}
# Force Swift 5.9 on all pod targets (expo-modules-core@55 + Xcode 16.4 compat)
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |cfg|
      cfg.build_settings['SWIFT_VERSION'] = '5.9'
      cfg.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
    end
  end
end
"""

with open(podfile_path, 'w') as f:
    f.write(content + hook)

print(f'[patch-podfile] Patched {podfile_path}')
print('[patch-podfile] SWIFT_VERSION=5.9 + SWIFT_STRICT_CONCURRENCY=minimal applied to all pod targets')
# Print last 20 lines so CI logs confirm the patch
lines = (content + hook).splitlines()
print('[patch-podfile] Podfile tail:')
print('\n'.join(lines[-20:]))
