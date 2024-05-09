import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./components/homePage/HomePage";
import AuthPage from "./components/authPage/AuthPage";
import { ProtectedRoute } from "./components/utils/ProtectedRoute";
import { AuthProvider } from "./components/hooks/useAuth";
import RegisterPage from "./components/authPage/RegisterPage";
export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <HomePage />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/login" element={<AuthPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}
