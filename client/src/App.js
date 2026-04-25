import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/utils/ProtectedRoute";
import { AuthProvider } from "./components/hooks/useAuth";
import { QueryClient, QueryClientProvider } from "react-query";
import ErrorBoundary from "./components/ErrorBoundary";
import "./App.scss";

//redux
import store from "./redux/store";
import { Provider } from "react-redux";
import Alert from "./components/layout/Alert";

// Lazy-loaded page components
const PrivacyPage = lazy(() => import("./components/legal/PrivacyPage"));
const MarketingPage = lazy(() => import("./components/legal/MarketingPage"));
const HomePage = lazy(() => import("./components/homePage/HomePage"));
const AuthPage = lazy(() => import("./components/authPage/AuthPage"));
const RegisterPage = lazy(() => import("./components/authPage/RegisterPage"));
const CreateUserPage = lazy(() => import("./components/authPage/CreateUserPage"));
const OAuthCallback = lazy(() => import("./components/authPage/OAuthCallback"));
const ProfilePage = lazy(() => import("./components/profilePage/ProfilePage"));
const CreateGamePage = lazy(() => import("./components/gamePage/CreateGamePage"));
const GamePage = lazy(() => import("./components/gamePage/GamePage"));
const LogPage = lazy(() => import("./components/logPage/LogPage"));
const SeriesDetail = lazy(() => import("./components/logPage/SeriesDetail"));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            cacheTime: 5 * 60_000,
        },
    },
});
export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <Provider store={store}>
                <BrowserRouter>
                    <AuthProvider>
                        <ErrorBoundary>
                        <Alert />
                        <Suspense fallback={<div className="loading-screen">Loading...</div>}>
                        <Routes>
                            <Route
                                exact
                                path="/"
                                element={
                                    <ProtectedRoute>
                                        <HomePage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route path="game-room">
                                <Route
                                    path="new"
                                    index={true}
                                    element={
                                        <ProtectedRoute>
                                            <CreateGamePage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path=":id"
                                    element={
                                        <ProtectedRoute>
                                            <GamePage />
                                        </ProtectedRoute>
                                    }
                                />
                            </Route>
                            <Route path="/privacy" element={<PrivacyPage />} />
                            <Route path="/about" element={<MarketingPage />} />
                            <Route path="/login" element={<AuthPage />} />
                            <Route
                                path="/register"
                                element={<RegisterPage />}
                            />
                            <Route
                                path="/create-user"
                                element={
                                    <ProtectedRoute>
                                        <CreateUserPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/oauth-callback"
                                element={<OAuthCallback />}
                            />
                            <Route
                                path="/profile"
                                element={
                                    <ProtectedRoute>
                                        <ProfilePage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/log"
                                element={
                                    <ProtectedRoute>
                                        <LogPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/log/:seriesId"
                                element={
                                    <ProtectedRoute>
                                        <SeriesDetail />
                                    </ProtectedRoute>
                                }
                            />
                        </Routes>
                        </Suspense>
                        </ErrorBoundary>
                    </AuthProvider>
                </BrowserRouter>
            </Provider>
        </QueryClientProvider>
    );
}
