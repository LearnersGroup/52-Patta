import { Image } from 'react-native';
import { SvgUri } from 'react-native-svg';

/**
 * Renders a user avatar that may be either an SVG or a regular image.
 *
 * The app stores avatars as SVG data URIs (data:image/svg+xml,...) or
 * DiceBear SVG URLs (api.dicebear.com/.../svg?seed=...). However, users
 * who signed up via email may have a Gravatar URL (gravatar.com/avatar/...)
 * and OAuth users may have a Google/Facebook profile picture — both are JPEGs,
 * not SVGs. Passing a JPEG URL to SvgUri crashes with
 * "Cannot read property 'length' of undefined" inside the SVG XML parser.
 *
 * This component detects SVG vs regular image and picks the right renderer.
 *
 * Props:
 *   uri      - Avatar URI string (SVG data URI, SVG URL, or regular image URL)
 *   width    - Width passed to SvgUri / Image style (default "100%")
 *   height   - Height passed to SvgUri / Image style (default "100%")
 */
const isSvgUri = (uri) =>
  typeof uri === 'string' && (
    uri.startsWith('data:image/svg') ||   // SVG data URI
    uri.includes('/svg')                  // DiceBear: .../avataaars/svg?seed=...
  );

const AvatarImage = ({ uri, width = '100%', height = '100%' }) => {
  if (!uri) return null;

  if (isSvgUri(uri)) {
    return <SvgUri uri={uri} width={width} height={height} />;
  }

  // Regular image (Gravatar, Google/Facebook OAuth avatar, etc.)
  return (
    <Image
      source={{ uri }}
      style={{ width, height }}
      resizeMode="cover"
    />
  );
};

export default AvatarImage;
