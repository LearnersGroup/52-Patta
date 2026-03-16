import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { removeAuthToken, unlink_provider, update_profile } from "../../api/apiHandler";

const AvatarCreator = lazy(() => import("../shared/AvatarCreator"));

const PROVIDERS = ["google", "facebook"];
const BACKEND_BASE = (process.env.REACT_APP_BASE_URL || "http://localhost:4000/api").replace('/api', '');

const providerLabel = (provider) => provider.charAt(0).toUpperCase() + provider.slice(1);

const providerIcon = (provider) => {
    if (provider === 'google') return '🟢';
    if (provider === 'facebook') return '🔵';
    return '•';
};

const ProfilePage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, profile, refreshProfile, logout, updateUserName } = useAuth();
    const [banner, setBanner] = useState(null);
    const [busyProvider, setBusyProvider] = useState(null);
    const [nameDraft, setNameDraft] = useState("");
    const [avatarDraft, setAvatarDraft] = useState("");
    const [showAvatarEditor, setShowAvatarEditor] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);

    useEffect(() => {
        refreshProfile();
    }, [refreshProfile]);

    useEffect(() => {
        const linked = searchParams.get('linked');
        const error = searchParams.get('error');

        if (linked) {
            setBanner({ type: 'success', msg: `${providerLabel(linked)} account connected.` });
        } else if (error === 'link_expired') {
            setBanner({ type: 'error', msg: 'Link request expired. Please try connecting again.' });
        } else if (error) {
            setBanner({ type: 'error', msg: 'Account linking failed. Please try again.' });
        }

        if (linked || error) {
            navigate('/profile', { replace: true });
        }
    }, [navigate, searchParams]);

    const linkedSet = useMemo(() => {
        return new Set((profile?.linkedProviders || []).map((lp) => lp.provider));
    }, [profile]);

    useEffect(() => {
        if (!profile) return;
        setNameDraft(profile.name || "");
        setAvatarDraft(profile.avatar || "");
    }, [profile]);

    const hasNameChange = useMemo(() => {
        return (nameDraft || "").trim() !== (profile?.name || "");
    }, [nameDraft, profile?.name]);

    const hasAvatarChange = useMemo(() => {
        if (!avatarDraft || avatarDraft === profile?.avatar) return false;
        return avatarDraft.startsWith('data:image/svg+xml');
    }, [avatarDraft, profile?.avatar]);

    const hasProfileChanges = hasNameChange || hasAvatarChange;

    const disconnectDisabled = (provider) => {
        if (!linkedSet.has(provider)) return true;
        return !profile?.hasPassword && linkedSet.size === 1;
    };

    const handleConnect = (provider) => {
        const tokenParam = user?.token ? `&token=${encodeURIComponent(user.token)}` : '';
        window.location.href = `${BACKEND_BASE}/api/oauth/${provider}?mode=link${tokenParam}`;
    };

    const handleDisconnect = async (provider) => {
        try {
            setBusyProvider(provider);
            await unlink_provider(provider);
            await refreshProfile();
            setBanner({ type: 'success', msg: `${providerLabel(provider)} account disconnected.` });
        } catch (error) {
            const message = error?.errors?.[0]?.msg || 'Failed to disconnect provider.';
            setBanner({ type: 'error', msg: message });
        } finally {
            setBusyProvider(null);
        }
    };

    const handleLogout = () => {
        removeAuthToken();
        logout();
    };

    const handleSaveProfile = async () => {
        if (!hasProfileChanges) return;

        try {
            setSavingProfile(true);
            const payload = {};

            if (hasNameChange) {
                payload.name = (nameDraft || "").trim();
            }

            if (hasAvatarChange) {
                payload.avatar = avatarDraft;
            }

            const updated = await update_profile(payload);

            if (updated?.name) {
                updateUserName(updated.name);
            }

            await refreshProfile();
            setShowAvatarEditor(false);
            setBanner({ type: 'success', msg: 'Profile updated successfully.' });
        } catch (error) {
            const message = error?.errors?.[0]?.msg || 'Failed to update profile.';
            setBanner({ type: 'error', msg: message });
        } finally {
            setSavingProfile(false);
        }
    };

    return (
        <div className="profile-page">
            <div className="profile-card">
                <div className="profile-header">
                    <h1>Profile</h1>
                    <button className="btn-outline" onClick={() => navigate('/')}>Back to Lobby</button>
                </div>

                {banner && (
                    <div className={`profile-banner ${banner.type}`}>
                        {banner.msg}
                    </div>
                )}

                <section className="profile-section">
                    <h2>Identity</h2>
                    <div className="identity-row">
                        {profile?.avatar && (
                            <img src={profile.avatar} alt="avatar" className="profile-avatar" />
                        )}
                        <div className="identity-details">
                            <label htmlFor="profile-name" className="identity-label">Display Name</label>
                            <input
                                id="profile-name"
                                type="text"
                                className="form-input"
                                value={nameDraft}
                                maxLength={50}
                                onChange={(event) => setNameDraft(event.target.value)}
                                placeholder="Your name"
                            />
                            <p className="identity-email">{profile?.email || ''}</p>
                        </div>
                    </div>

                    <div className="identity-editor-actions">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setShowAvatarEditor((prev) => !prev)}
                        >
                            {showAvatarEditor ? 'Hide Avatar Editor' : 'Edit Avatar'}
                        </button>

                        <button
                            type="button"
                            className="btn-primary"
                            onClick={handleSaveProfile}
                            disabled={!hasProfileChanges || savingProfile}
                        >
                            {savingProfile ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>

                    {showAvatarEditor && (
                        <div className="identity-avatar-editor">
                            <Suspense fallback={<div className="loading-screen">Loading avatar editor...</div>}>
                                <AvatarCreator
                                    initialAvatar={profile?.avatar}
                                    onAvatarChange={setAvatarDraft}
                                />
                            </Suspense>
                        </div>
                    )}
                </section>

                <section className="profile-section">
                    <h2>Linked Accounts</h2>
                    <div className="provider-list">
                        {PROVIDERS.map((provider) => {
                            const connected = linkedSet.has(provider);
                            return (
                                <div className="provider-row" key={provider}>
                                    <div className="provider-meta">
                                        <span className="provider-icon">{providerIcon(provider)}</span>
                                        <span className="provider-name">{providerLabel(provider)}</span>
                                        <span className={`provider-badge ${connected ? 'connected' : 'not-connected'}`}>
                                            {connected ? 'Connected' : 'Not connected'}
                                        </span>
                                    </div>

                                    {connected ? (
                                        <button
                                            className="btn-danger"
                                            disabled={disconnectDisabled(provider) || busyProvider === provider}
                                            onClick={() => handleDisconnect(provider)}
                                        >
                                            Disconnect
                                        </button>
                                    ) : (
                                        <button
                                            className="btn-secondary"
                                            onClick={() => handleConnect(provider)}
                                        >
                                            Connect
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>

                <div className="profile-actions">
                    <button className="btn-outline" onClick={refreshProfile}>Refresh</button>
                    <button className="btn-outline" onClick={handleLogout}>Logout</button>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
