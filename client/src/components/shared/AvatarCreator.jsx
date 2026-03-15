import { useEffect, useMemo, useState } from "react";
import { createAvatar } from "@dicebear/core";
import * as adventurer from "@dicebear/adventurer";
import * as avataaars from "@dicebear/avataaars";
import * as bottts from "@dicebear/bottts";
import * as funEmoji from "@dicebear/fun-emoji";
import * as lorelei from "@dicebear/lorelei";

const resolveStyle = (styleModule) => {
    if (styleModule?.create) return styleModule;
    if (styleModule?.default?.create) return styleModule.default;
    return styleModule;
};

const STYLE_OPTIONS = [
    { key: "adventurer", label: "Adventurer", style: resolveStyle(adventurer) },
    { key: "avataaars", label: "Avataaars", style: resolveStyle(avataaars) },
    { key: "bottts", label: "Bottts", style: resolveStyle(bottts) },
    { key: "fun-emoji", label: "Fun Emoji", style: resolveStyle(funEmoji) },
    { key: "lorelei", label: "Lorelei", style: resolveStyle(lorelei) },
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

const randomSeed = () => `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-5)}`;

const AvatarCreator = ({ onAvatarChange, onSeedChange, initialAvatar = "" }) => {
    const [selectedStyle, setSelectedStyle] = useState(STYLE_OPTIONS[0].key);
    const [seed, setSeed] = useState(() => randomSeed());
    const [flip, setFlip] = useState(false);
    const [backgroundColor, setBackgroundColor] = useState("");
    const [generatedMode, setGeneratedMode] = useState(!initialAvatar);
    const [avatarDataUri, setAvatarDataUri] = useState(initialAvatar || "");

    const styleMap = useMemo(() => {
        return STYLE_OPTIONS.reduce((acc, item) => {
            acc[item.key] = item.style;
            return acc;
        }, {});
    }, []);

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

        const style = styleMap[selectedStyle];
        if (!style) return;

        const options = {
            seed,
            size: 128,
        };

        if (flip) {
            options.flip = true;
        }

        if (backgroundColor) {
            options.backgroundColor = [backgroundColor];
        }

        const dataUri = createAvatar(style, options).toDataUri();
        setAvatarDataUri(dataUri);
        if (onAvatarChange) {
            onAvatarChange(dataUri);
        }
    }, [backgroundColor, flip, generatedMode, onAvatarChange, seed, selectedStyle, styleMap]);

    useEffect(() => {
        if (onSeedChange) {
            onSeedChange(seed);
        }
    }, [onSeedChange, seed]);

    const handleStyleChange = (event) => {
        setGeneratedMode(true);
        setSelectedStyle(event.target.value);
    };

    const handleRandomize = () => {
        setGeneratedMode(true);
        setSeed(randomSeed());
    };

    const handleFlipChange = () => {
        setGeneratedMode(true);
        setFlip((previous) => !previous);
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
                <label className="avatar-creator__label" htmlFor="avatar-style">
                    Style
                </label>
                <select
                    id="avatar-style"
                    className="form-input avatar-creator__select"
                    value={selectedStyle}
                    onChange={handleStyleChange}
                >
                    {STYLE_OPTIONS.map((styleOption) => (
                        <option key={styleOption.key} value={styleOption.key}>
                            {styleOption.label}
                        </option>
                    ))}
                </select>

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

                <label className="avatar-creator__checkbox">
                    <input type="checkbox" checked={flip} onChange={handleFlipChange} />
                    <span>Flip avatar</span>
                </label>

                <div className="avatar-creator__actions">
                    <button type="button" className="btn-secondary" onClick={handleRandomize}>
                        Randomize
                    </button>
                    {initialAvatar && !generatedMode && (
                        <button type="button" className="btn-outline" onClick={handleRandomize}>
                            Generate New
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AvatarCreator;