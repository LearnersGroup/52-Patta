import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AvatarCreator from "../shared/AvatarCreator";
import { update_profile } from "../../api/apiHandler";
import { useAuth } from "../hooks/useAuth";

const NAME_ADJECTIVES = [
    "Lucky",
    "Royal",
    "Swift",
    "Mighty",
    "Golden",
    "Bold",
    "Fierce",
    "Epic",
    "Clever",
    "Turbo",
];

const NAME_NOUNS = [
    "Ace",
    "Raja",
    "Falcon",
    "Tiger",
    "Jack",
    "Queen",
    "Wizard",
    "Player",
    "Patta",
    "Champion",
];

const hashSeed = (value) => {
    const source = String(value || "seed");
    let hash = 0;
    for (let i = 0; i < source.length; i += 1) {
        hash = (hash * 31 + source.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
};

const generateNameFromSeed = (seedValue) => {
    const hash = hashSeed(seedValue || `${Date.now()}`);
    const adjective = NAME_ADJECTIVES[hash % NAME_ADJECTIVES.length];
    const noun = NAME_NOUNS[(hash * 7) % NAME_NOUNS.length];
    const suffix = (hash % 900) + 100;
    return `${adjective}${noun}${suffix}`;
};

const CreateUserPage = () => {
    const navigate = useNavigate();
    const { user, profile, refreshProfile, completeOnboarding } = useAuth();
    const [name, setName] = useState("");
    const [nameTouched, setNameTouched] = useState(false);
    const [avatar, setAvatar] = useState("");
    const [seed, setSeed] = useState("");
    const [errors, setErrors] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        refreshProfile();
    }, [refreshProfile]);

    useEffect(() => {
        if (!profile) return;
        if (profile.avatar) {
            setAvatar(profile.avatar);
        }
    }, [profile]);

    useEffect(() => {
        if (nameTouched || name) return;
        if (!seed) return;
        setName(generateNameFromSeed(seed));
    }, [name, nameTouched, seed]);

    const needsOnboarding = useMemo(() => {
        if (profile) {
            return !!profile.needsOnboarding;
        }
        return !!user?.needs_onboarding;
    }, [profile, user?.needs_onboarding]);

    useEffect(() => {
        if (!user) {
            navigate("/login", { replace: true });
            return;
        }

        if (profile && !needsOnboarding) {
            navigate("/", { replace: true });
        }
    }, [navigate, needsOnboarding, profile, user]);

    const handleRandomizeName = () => {
        setNameTouched(true);
        setName(generateNameFromSeed(seed || `${Date.now()}`));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setErrors([]);

        const trimmedName = name.trim();
        if (!trimmedName) {
            setErrors([{ msg: "Please choose a username." }]);
            return;
        }

        try {
            setSaving(true);
            const payload = {
                name: trimmedName,
            };

            if (typeof avatar === "string" && avatar.startsWith("data:image/svg+xml")) {
                payload.avatar = avatar;
            }

            const updated = await update_profile(payload);

            completeOnboarding(updated?.name || trimmedName);
            await refreshProfile();
            navigate("/", { replace: true });
        } catch (error) {
            setErrors(error?.errors || [{ msg: "Failed to save profile. Please try again." }]);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card create-user-card">
                <div className="auth-logo">
                    <span className="suit suit-heart">♥</span>
                    <span className="suit suit-diamond">♦</span>
                    <h1>52-Patta</h1>
                    <span className="suit suit-spade">♠</span>
                    <span className="suit suit-club">♣</span>
                </div>
                <p className="auth-tagline">Finish your profile before entering the lobby</p>

                <h2 className="auth-title">Create Username</h2>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="create-user-name">Username</label>
                        <div className="random-name-row">
                            <input
                                id="create-user-name"
                                type="text"
                                className="form-input"
                                value={name}
                                onChange={(event) => {
                                    setNameTouched(true);
                                    setName(event.target.value);
                                }}
                                maxLength={50}
                                placeholder="Choose your in-game username"
                            />
                            <button type="button" className="btn-secondary" onClick={handleRandomizeName}>
                                Random Name
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Choose Avatar</label>
                        <AvatarCreator
                            initialAvatar={profile?.avatar || ""}
                            onAvatarChange={setAvatar}
                            onSeedChange={setSeed}
                        />
                    </div>

                    {errors.length !== 0 && (
                        <div className="form-errors">
                            {errors.map((err, index) => (
                                <p key={`create-user-error-${index}`} className="form-error">{err.msg}</p>
                            ))}
                        </div>
                    )}

                    <button type="submit" className="btn-primary btn-full" disabled={saving}>
                        {saving ? "Saving..." : "Continue to Lobby"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreateUserPage;