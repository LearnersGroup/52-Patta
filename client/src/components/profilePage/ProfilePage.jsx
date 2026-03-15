import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { removeAuthToken, unlink_provider } from "../../api/apiHandler";

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
    const { user, profile, refreshProfile, logout } = useAuth();
    const [banner, setBanner] = useState(null);
    const [busyProvider, setBusyProvider] = useState(null);

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
                        <img src={profile?.avatar} alt="avatar" className="profile-avatar" />
                        <div>
                            <p className="identity-name">{profile?.name || 'Loading...'}</p>
                            <p className="identity-email">{profile?.email || ''}</p>
                        </div>
                    </div>
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
