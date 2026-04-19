const { withPodfile } = require('@expo/config-plugins');

// Forces Swift 5 language mode on all CocoaPods targets so expo-modules-core@55
// compiles under Xcode 16.4. Xcode 16.4 defaults to Swift 6 mode which enforces
// strict concurrency as hard errors. SWIFT_VERSION='5' (NOT '5.9' — that is not
// a valid build setting value and is silently ignored) maps to Swift 5.10 compat
// mode in the Xcode 16 toolchain, where @MainActor is fully supported and
// concurrency checking defaults to minimal.
module.exports = function withSwiftConcurrency(config) {
  return withPodfile(config, (config) => {
    const MARKER = '# __patta_swift5_fix__';
    const contents = config.modResults.contents;

    if (contents.includes(MARKER)) {
      return config;
    }

    const injection = `
${MARKER}
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |cfg|
      cfg.build_settings['SWIFT_VERSION'] = '5'
      cfg.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
    end
  end
end
`;

    config.modResults.contents = contents + injection;
    return config;
  });
};
