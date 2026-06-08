import React, { useState } from "react";
import TennisAIDashboard from "./TennisAIDashboard";
import { LanguageProvider } from "./i18n/LanguageContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PendingPage from "./pages/PendingPage";
import UserProfilePage from "./pages/UserProfilePage";
import AdminPage from "./pages/AdminPage";

type Screen = "login" | "register" | "pending" | "dashboard" | "profile" | "admin";

function AuthGate() {
  const { user } = useAuth();
  const [screen, setScreen] = useState<Screen>("login");

  if (!user) {
    if (screen === "register") return <RegisterPage onGoLogin={() => setScreen("login")} />;
    return <LoginPage onGoRegister={() => setScreen("register")} />;
  }

  if (!user.is_approved) return <PendingPage />;

  if (screen === "profile") return <UserProfilePage onBack={() => setScreen("dashboard")} />;
  if (screen === "admin" && user.is_admin) return <AdminPage onBack={() => setScreen("dashboard")} />;

  return (
    <TennisAIDashboard
      onOpenProfile={() => setScreen("profile")}
      onOpenAdmin={user.is_admin ? () => setScreen("admin") : undefined}
    />
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
