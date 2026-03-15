const MAX_AVATAR_BYTES = 50 * 1024;
const MAX_AVATAR_DATA_URI_CHARS = 100 * 1024;
const SVG_DATA_URI_REGEX = /^data:image\/svg\+xml(?:;[a-z0-9._=+-]+)*,/i;

function decodeSvgDataUri(dataUri) {
    const commaIndex = dataUri.indexOf(',');
    if (commaIndex === -1) return null;

    const metadata = dataUri.slice(0, commaIndex);
    const payload = dataUri.slice(commaIndex + 1);

    if (!payload) return null;

    if (/;base64/i.test(metadata)) {
        return Buffer.from(payload, 'base64').toString('utf8');
    }

    return decodeURIComponent(payload);
}

function isValidSvgAvatarDataUri(dataUri) {
    if (typeof dataUri !== 'string' || !SVG_DATA_URI_REGEX.test(dataUri)) {
        return false;
    }

    // Align with server express.json body limit (100kb) to avoid dead/unreachable oversized guard
    if (dataUri.length > MAX_AVATAR_DATA_URI_CHARS) {
        return false;
    }

    try {
        const decoded = decodeSvgDataUri(dataUri);
        if (!decoded) return false;

        const decodedSize = Buffer.byteLength(decoded, 'utf8');
        if (decodedSize > MAX_AVATAR_BYTES) {
            return false;
        }

        const normalized = decoded.trim().toLowerCase();
        return normalized.includes('<svg') && normalized.includes('</svg>');
    } catch (error) {
        return false;
    }
}

function buildDiceBearAvatarUrl(seed, style = 'avataaars') {
    const safeSeed = encodeURIComponent(String(seed || 'player'));
    const safeStyle = encodeURIComponent(String(style || 'avataaars'));
    return `https://api.dicebear.com/9.x/${safeStyle}/svg?seed=${safeSeed}`;
}

module.exports = {
    MAX_AVATAR_BYTES,
    MAX_AVATAR_DATA_URI_CHARS,
    isValidSvgAvatarDataUri,
    buildDiceBearAvatarUrl,
};