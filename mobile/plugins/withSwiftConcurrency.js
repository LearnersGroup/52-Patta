const { withPodfile } = require('@expo/config-plugins');

// Injects SWIFT_STRICT_CONCURRENCY=minimal into all CocoaPods targets via
// post_install hook. expo-build-properties buildSettings only covers the main
// app target; pod targets (expo-modules-core etc.) need this separately.
module.exports = function withSwiftConcurrency(config) {
  return withPodfile(config, (config) => {
    const injection = `
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |cfg|
      cfg.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
    end
  end`;

    const contents = config.modResults.contents;

    if (contents.includes("SWIFT_STRICT_CONCURRENCY")) {
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
