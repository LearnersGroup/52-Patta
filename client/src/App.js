import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./components/homePage/HomePage";
import AuthPage from "./components/authPage/AuthPage";
import CreateGamePage from "./components/gamePage/CreateGamePage";
import GamePage from "./components/gamePage/GamePage";
import { ProtectedRoute } from "./components/utils/ProtectedRoute";
import { AuthProvider } from "./components/hooks/useAuth";
import RegisterPage from "./components/authPage/RegisterPage";
import { QueryClient, QueryClientProvider, useQuery } from "react-query";
import "./App.scss";

const queryClient = new QueryClient();
export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <AuthProvider>
                    <Routes>
                        <Route
                            exact
                            path='/'
                            element={
                                <ProtectedRoute>
                                    <HomePage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            exact
                            path='game-room'
                        >
                            <Route
                                path='new'
                                index
                                element={
                                    <ProtectedRoute>
                                        <CreateGamePage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path=':id'
                                element={
                                    <ProtectedRoute>
                                        <GamePage />
                                    </ProtectedRoute>
                                }
                            />
                        </Route>
                        <Route path='/login' element={<AuthPage />} />
                        <Route path='/register' element={<RegisterPage />} />
                    </Routes>
                </AuthProvider>
            </BrowserRouter>
        </QueryClientProvider>
    );
}
