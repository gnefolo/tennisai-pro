import React, { useState } from "react";
import TennisAIDashboard from "./TennisAIDashboard";
import { LanguageProvider } from "./i18n/LanguageContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

function AuthGate() {
  const { user } = useAuth();
  const [screen, setScreen] = useState<"login" | "register">("login");

  if (!user) {
    if (screen === "register") {
      return <RegisterPage onGoLogin={() => setScreen("login")} />;
    }
    return <LoginPage onGoRegister={() => setScreen("register")} />;
  }

  return <TennisAIDashboard />;
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
