import { useEffect, useState } from "react";
import { createAvatar } from "@dicebear/core";
import * as openPeeps from "@dicebear/open-peeps";

const resolveStyle = (styleModule) => {
    if (styleModule?.create) return styleModule;
    if (styleModule?.default?.create) return styleModule.default;
    return styleModule;
};

const FACE_OPTIONS = [
    "angryWithFang",
    "awe",
    "blank",
    "calm",
    "cheeky",
    "concerned",
    "concernedFear",
    "contempt",
    "cute",
    "cyclops",
    "driven",
    "eatingHappy",
    "explaining",
    "eyesClosed",
    "fear",
    "hectic",
    "lovingGrin1",
    "lovingGrin2",
    "monster",
    "old",
    "rage",
    "serious",
    "smile",
    "smileBig",
    "smileLOL",
    "smileTeethGap",
    "solemn",
    "suspicious",
    "tired",
    "veryAngry",
];

const HEAD_OPTIONS = [
    "afro",
    "bangs",
    "bangs2",
    "bantuKnots",
    "bear",
    "bun",
    "bun2",
    "buns",
    "cornrows",
    "cornrows2",
    "dreads1",
    "dreads2",
    "flatTop",
    "flatTopLong",
    "grayBun",
    "grayMedium",
    "grayShort",
    "hatBeanie",
    "hatHip",
    "hijab",
    "long",
    "longAfro",
    "longBangs",
    "longCurly",
    "medium1",
    "medium2",
    "medium3",
    "mediumBangs1",
    "mediumBangs2",
    "mediumBangs3",
    "mediumStraight",
    "mohawk",
    "mohawk2",
    "noHair1",
    "noHair2",
    "noHair3",
    "pomp",
    "shaved1",
    "shaved2",
    "shaved3",
    "short1",
    "short2",
    "short3",
    "short4",
    "short5",
    "turban",
    "twists",
    "twists2",
];

const ACCESSORIES_VALUES = [
    "eyepatch",
    "glasses",
    "glasses2",
    "glasses3",
    "glasses4",
    "glasses5",
    "sunglasses",
    "sunglasses2",
];

const ACCESSORIES_OPTIONS = [
    { value: "", label: "None" },
    ...ACCESSORIES_VALUES.map((value) => ({ value, label: prettifyKey(value) })),
];

const FACIAL_HAIR_VALUES = [
    "chin",
    "full",
    "full2",
    "full3",
    "full4",
    "goatee1",
    "goatee2",
    "moustache1",
    "moustache2",
    "moustache3",
    "moustache4",
    "moustache5",
    "moustache6",
    "moustache7",
    "moustache8",
    "moustache9",
];

const FACIAL_HAIR_OPTIONS = [
    { value: "", label: "None" },
    ...FACIAL_HAIR_VALUES.map((value) => ({ value, label: prettifyKey(value) })),
];

const SKIN_COLOR_SWATCHES = [
    { hex: "694d3d", label: "Dark Brown" },
    { hex: "ae5d29", label: "Brown" },
    { hex: "d08b5b", label: "Medium" },
    { hex: "edb98a", label: "Light" },
    { hex: "ffdbb4", label: "Pale" },
];

const CLOTHING_COLOR_SWATCHES = [
    { hex: "1f2d3d", label: "Midnight" },
    { hex: "264653", label: "Teal" },
    { hex: "2a9d8f", label: "Jade" },
    { hex: "457b9d", label: "Steel Blue" },
    { hex: "6d6875", label: "Mauve" },
    { hex: "8338ec", label: "Purple" },
    { hex: "c77dff", label: "Lavender" },
    { hex: "e63946", label: "Red" },
    { hex: "f4a261", label: "Orange" },
    { hex: "f1c40f", label: "Yellow" },
    { hex: "2ecc71", label: "Green" },
    { hex: "ffffff", label: "White" },
];

const BACKGROUND_OPTIONS = [
    { value: "", label: "None" },
    { value: "b6e3f4", label: "Sky" },
    { value: "c0aede", label: "Lavender" },
    { value: "d1d4f9", label: "Blue Mist" },
    { value: "ffd5dc", label: "Rose" },
    { value: "fce9b5", label: "Sand" },
    { value: "ffdfbf", label: "Peach" },
    { value: "f4d150", label: "Gold" },
    { value: "d6f5b0", label: "Mint" },
];

function prettifyKey(key) {
    return key
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/([a-zA-Z])(\d+)/g, "$1 $2")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

const randomSeed = () => `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-5)}`;
const pickRandom = (values) => values[Math.floor(Math.random() * values.length)];
const pickRandomOrNone = (values) => pickRandom(["", ...values]);

const AvatarCreator = ({ onAvatarChange, onSeedChange, initialAvatar = "" }) => {
    const [seed, setSeed] = useState(() => randomSeed());
    const [face, setFace] = useState(() => pickRandom(FACE_OPTIONS));
    const [head, setHead] = useState(() => pickRandom(HEAD_OPTIONS));
    const [accessories, setAccessories] = useState("");
    const [facialHair, setFacialHair] = useState("");
    const [skinColor, setSkinColor] = useState("d08b5b");
    const [clothingColor, setClothingColor] = useState("264653");
    const [backgroundColor, setBackgroundColor] = useState("");
    const [generatedMode, setGeneratedMode] = useState(!initialAvatar);
    const [avatarDataUri, setAvatarDataUri] = useState(initialAvatar || "");

    useEffect(() => {
        if (initialAvatar) {
            setGeneratedMode(false);
            setAvatarDataUri(initialAvatar);
            if (onAvatarChange) {
                onAvatarChange(initialAvatar);
            }
            return;
        }

        setGeneratedMode(true);
    }, [initialAvatar, onAvatarChange]);

    useEffect(() => {
        if (!generatedMode) return;

        const options = {
            seed,
            size: 128,
            face: [face],
            head: [head],
            accessories: accessories ? [accessories] : [],
            accessoriesProbability: accessories ? 100 : 0,
            facialHair: facialHair ? [facialHair] : [],
            facialHairProbability: facialHair ? 100 : 0,
            skinColor: [skinColor],
            clothingColor: [clothingColor],
        };

        if (backgroundColor) {
            options.backgroundColor = [backgroundColor];
        }

        const dataUri = createAvatar(resolveStyle(openPeeps), options).toDataUri();
        setAvatarDataUri(dataUri);
        if (onAvatarChange) {
            onAvatarChange(dataUri);
        }
    }, [
        accessories,
        backgroundColor,
        clothingColor,
        face,
        facialHair,
        generatedMode,
        head,
        onAvatarChange,
        seed,
        skinColor,
    ]);

    useEffect(() => {
        if (onSeedChange) {
            onSeedChange(seed);
        }
    }, [onSeedChange, seed]);

    const randomiseFace = () => {
        setGeneratedMode(true);
        setFace(pickRandom(FACE_OPTIONS));
    };

    const randomiseHead = () => {
        setGeneratedMode(true);
        setHead(pickRandom(HEAD_OPTIONS));
    };

    const randomiseAccessories = () => {
        setGeneratedMode(true);
        setAccessories(pickRandom(ACCESSORIES_VALUES));
    };

    const randomiseFacialHair = () => {
        setGeneratedMode(true);
        setFacialHair(pickRandom(FACIAL_HAIR_VALUES));
    };

    const handleRandomizeAll = () => {
        setGeneratedMode(true);
        setSeed(randomSeed());
        setFace(pickRandom(FACE_OPTIONS));
        setHead(pickRandom(HEAD_OPTIONS));
        setAccessories(pickRandomOrNone(ACCESSORIES_VALUES));
        setFacialHair(pickRandomOrNone(FACIAL_HAIR_VALUES));
    };

    const handleGenerateNew = () => {
        handleRandomizeAll();
    };

    const handleBackgroundChange = (event) => {
        setGeneratedMode(true);
        setBackgroundColor(event.target.value);
    };

    return (
        <div className="avatar-creator">
            <div className="avatar-creator__preview">
                {avatarDataUri ? (
                    <img src={avatarDataUri} alt="Avatar preview" className="avatar-creator__preview-image" />
                ) : (
                    <div className="avatar-creator__preview-empty">No avatar</div>
                )}
            </div>

            <div className="avatar-creator__controls">
                <div className="avatar-creator__field">
                    <label className="avatar-creator__label" htmlFor="avatar-face">
                        Face
                    </label>
                    <div className="avatar-creator__attr-row">
                        <select
                            id="avatar-face"
                            className="form-input avatar-creator__select"
                            value={face}
                            onChange={(event) => {
                                setGeneratedMode(true);
                                setFace(event.target.value);
                            }}
                        >
                            {FACE_OPTIONS.map((faceOption) => (
                                <option key={faceOption} value={faceOption}>
                                    {prettifyKey(faceOption)}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            className="avatar-creator__dice-btn"
                            onClick={randomiseFace}
                            aria-label="Randomize face"
                            title="Randomize face"
                        >
                            🎲
                        </button>
                    </div>
                </div>

                <div className="avatar-creator__field">
                    <label className="avatar-creator__label" htmlFor="avatar-head">
                        Head
                    </label>
                    <div className="avatar-creator__attr-row">
                        <select
                            id="avatar-head"
                            className="form-input avatar-creator__select"
                            value={head}
                            onChange={(event) => {
                                setGeneratedMode(true);
                                setHead(event.target.value);
                            }}
                        >
                            {HEAD_OPTIONS.map((headOption) => (
                                <option key={headOption} value={headOption}>
                                    {prettifyKey(headOption)}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            className="avatar-creator__dice-btn"
                            onClick={randomiseHead}
                            aria-label="Randomize head"
                            title="Randomize head"
                        >
                            🎲
                        </button>
                    </div>
                </div>

                <div className="avatar-creator__field">
                    <label className="avatar-creator__label" htmlFor="avatar-accessories">
                        Accessories
                    </label>
                    <div className="avatar-creator__attr-row">
                        <select
                            id="avatar-accessories"
                            className="form-input avatar-creator__select"
                            value={accessories}
                            onChange={(event) => {
                                setGeneratedMode(true);
                                setAccessories(event.target.value);
                            }}
                        >
                            {ACCESSORIES_OPTIONS.map((option) => (
                                <option key={`accessories-${option.label}`} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            className="avatar-creator__dice-btn"
                            onClick={randomiseAccessories}
                            aria-label="Randomize accessories"
                            title="Randomize accessories"
                        >
                            🎲
                        </button>
                    </div>
                </div>

                <div className="avatar-creator__field">
                    <label className="avatar-creator__label" htmlFor="avatar-facial-hair">
                        Facial Hair
                    </label>
                    <div className="avatar-creator__attr-row">
                        <select
                            id="avatar-facial-hair"
                            className="form-input avatar-creator__select"
                            value={facialHair}
                            onChange={(event) => {
                                setGeneratedMode(true);
                                setFacialHair(event.target.value);
                            }}
                        >
                            {FACIAL_HAIR_OPTIONS.map((option) => (
                                <option key={`facial-hair-${option.label}`} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            className="avatar-creator__dice-btn"
                            onClick={randomiseFacialHair}
                            aria-label="Randomize facial hair"
                            title="Randomize facial hair"
                        >
                            🎲
                        </button>
                    </div>
                </div>

                <div className="avatar-creator__field">
                    <span className="avatar-creator__label">Skin Colour</span>
                    <div className="avatar-creator__swatches">
                        {SKIN_COLOR_SWATCHES.map((swatch) => (
                            <button
                                key={`skin-${swatch.hex}`}
                                type="button"
                                className={`avatar-creator__swatch${skinColor === swatch.hex ? " avatar-creator__swatch--selected" : ""}`}
                                style={{ backgroundColor: `#${swatch.hex}` }}
                                aria-label={`Skin colour: ${swatch.label}`}
                                title={swatch.label}
                                onClick={() => {
                                    setGeneratedMode(true);
                                    setSkinColor(swatch.hex);
                                }}
                            />
                        ))}
                    </div>
                </div>

                <div className="avatar-creator__field">
                    <span className="avatar-creator__label">Clothing Colour</span>
                    <div className="avatar-creator__swatches">
                        {CLOTHING_COLOR_SWATCHES.map((swatch) => (
                            <button
                                key={`clothing-${swatch.hex}`}
                                type="button"
                                className={`avatar-creator__swatch${clothingColor === swatch.hex ? " avatar-creator__swatch--selected" : ""}`}
                                style={{ backgroundColor: `#${swatch.hex}` }}
                                aria-label={`Clothing colour: ${swatch.label}`}
                                title={swatch.label}
                                onClick={() => {
                                    setGeneratedMode(true);
                                    setClothingColor(swatch.hex);
                                }}
                            />
                        ))}
                    </div>
                </div>

                <div className="avatar-creator__field">
                    <label className="avatar-creator__label" htmlFor="avatar-background">
                        Background
                    </label>
                    <select
                        id="avatar-background"
                        className="form-input avatar-creator__select"
                        value={backgroundColor}
                        onChange={handleBackgroundChange}
                    >
                        {BACKGROUND_OPTIONS.map((backgroundOption) => (
                            <option key={backgroundOption.label} value={backgroundOption.value}>
                                {backgroundOption.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="avatar-creator__actions">
                    <button type="button" className="btn-secondary" onClick={handleRandomizeAll}>
                        Randomize All
                    </button>
                    {initialAvatar && (
                        <button type="button" className="btn-outline" onClick={handleGenerateNew}>
                            Generate New
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AvatarCreator;