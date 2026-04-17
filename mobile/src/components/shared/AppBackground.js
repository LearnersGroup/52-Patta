import { StyleSheet, View, ImageBackground } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const IMAGES = {
  soft:     require('../../../assets/Backgrounds/background_soft.png'),
  textured: require('../../../assets/Backgrounds/background_textured.png'),
};

export default function AppBackground({ children, style, center = false, variant = 'soft' }) {
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground source={IMAGES[variant]} style={[styles.root, style]} resizeMode="cover">
      <View
        style={[
          styles.children,
          { paddingTop: insets.top },
          center && styles.centered,
        ]}
      >
        {children}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  children: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
  },
});
