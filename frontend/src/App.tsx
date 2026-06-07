import React from "react";
import TennisAIDashboard from "./TennisAIDashboard";
import { LanguageProvider } from "./i18n/LanguageContext";

function App() {
  return (
    <LanguageProvider>
      <TennisAIDashboard />
    </LanguageProvider>
  );
}

export default App;