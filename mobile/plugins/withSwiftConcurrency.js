const { withPodfile } = require('@expo/config-plugins');

// Forces SWIFT_VERSION=5 on all CocoaPods targets so expo-modules-core@55
// compiles under Xcode 16.4 (Swift 6 default). Swift 6 mode treats several
// patterns in expo-modules-core as hard errors (unknown attribute 'MainActor',
// actor isolation violations); downgrading pods to Swift 5 language mode
// suppresses them. SWIFT_STRICT_CONCURRENCY=minimal is also set as a belt-
// and-suspenders guard for any remaining checked concurrency warnings.
module.exports = function withSwiftConcurrency(config) {
  return withPodfile(config, (config) => {
    const injection = `
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |cfg|
      cfg.build_settings['SWIFT_VERSION'] = '5.9'
      cfg.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
    end
  end`;

    const contents = config.modResults.contents;

    if (contents.includes('SWIFT_VERSION') && contents.includes('SWIFT_STRICT_CONCURRENCY')) {
      return config;
    }

    if (contents.includes('post_install do |installer|')) {
      config.modResults.contents = contents.replace(
        'post_install do |installer|',
        `post_install do |installer|\n${injection}`
      );
    } else {
      config.modResults.contents +=
        `\npost_install do |installer|\n${injection}\nend\n`;
    }

    return config;
  });
};
