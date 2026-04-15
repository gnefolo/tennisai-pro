# 🎾 TennisAI Pro - Tactical Assistant

![TennisAI Pro](https://img.shields.io/badge/Status-Active-success) 
![React](https://img.shields.io/badge/React-18-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green) ![Machine Learning](https://img.shields.io/badge/Scikit--Learn-ML-orange)

TennisAI Pro è un assistente tattico intelligente basato sull'Intelligenza Artificiale, progettato per analizzare statistiche e modelli di gioco del tennis. 
Fornisce previsioni, analisi dei pattern (schemi) e suggerimenti tattici sfruttando modelli di Machine Learning predittivi.

---

## 🚀 Caratteristiche Principali

- **Analisi Tattica in Tempo Reale**: Valuta i parametri chiave come qualità del servizio, posizione di risposta e tipologia di scambio.
- **Machine Learning**: 
  - Predizione della probabilità di vittoria del punto (Win Probability).
  - Riconoscimento dei *Pattern Tattici* in base allo schema di gioco analizzato.
- **Backend Robusto**: Costruito in **Python & FastAPI** per servire i modelli ML ad altissime prestazioni.
- **Interfaccia Utente Moderna**: Single Page Application (SPA) reattiva creata con **React, TypeScript, Vite e TailwindCSS**.
- **Gestione Dataset e Report**: Funzionalità incorporate nel backend per la generazione di curve ROC, Importanza delle Feature e report diagnostici sui modelli.

---

## 🛠️ Stack Tecnologico

### Frontend
- **React 18** e **TypeScript**
- **Vite** (Build tool superveloce)
- **TailwindCSS 3.4** (Styling utility-first)

### Backend
- **Python 3**
- **FastAPI** / **Uvicorn** (Framework API asincrono ad alte prestazioni)
- **Scikit-Learn**, **Pandas**, **Numpy** (Data Science e Machine Learning pipeline)
- **XGBoost** (Modelli ad albero avanzati per le predizioni)

---

## ⚙️ Installazione e Avvio Locale

### Prerequisiti
- [Node.js](https://nodejs.org/it/) (v16+)
- [Python 3.9+](https://www.python.org/downloads/)
- npm o yarn

### Clonazione del Repository
```bash
git clone https://github.com/gnefolo/tennisai-pro.git
cd tennisai-pro
```

### Configurazione
Il progetto contiene uno script automatizzato `start.sh` per l'avvio simultaneo di Frontend e Backend.
Prima di lanciarlo, assicurati che le dipendenze siano installate.

**1. Installazione Frontend:**
```bash
cd frontend
npm install
cd ..
```

**2. Installazione Backend e Ambiente Virtuale (Consigliato):**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Su Windows usa: .venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### ▶️ Avvio Veloce (Tutto in uno)

Dalla cartella radice del progetto, puoi avviare tutto usando il nostro script:

```bash
./start.sh
```
*(Questo script attiverà il backend tramite Uvicorn e il Frontend tramite Vite. Premendo `Ctrl+C` fermerai entrambi i server).*

- **Frontend App:** `http://localhost:5173` o un'altra porta indicata dal log di Vite.
- **Backend API & Swagger UI Docs:** `http://127.0.0.1:8000/docs`

---

## 📁 Struttura del Progetto

```text
tennisai-pro/
├── start.sh              # Script principale per avviare backend e frontend
├── backend/              # Logica API e Modelli di AI/Machine Learning
│   ├── app/              # Webserver FastAPI (Controller, Routes)
│   ├── matches/          # Cartella con dati/csv sui match passati
│   ├── requirements.txt  # Dipendenze Python
│   ├── *.pkl             # Modelli Pre-addestrati (Slam, Pattern, Tactics)
│   └── *.py              # Script per il training e la validazione dei modelli
├── frontend/             # Single Page Application React
│   ├── src/              # Componenti React, Pagine, Utils 
│   ├── public/           # Asset statici
│   ├── package.json      # Dipendenze Node/NPM
│   ├── tailwind.config.* # Configurazione TailwindCSS
│   └── vite.config.ts    # Configurazione di Vite
└── ...
```

---

## 🧠 Modelli Machine Learning Inclusi
Nella cartella `backend` risiedono vari modelli predittivi esportati (`.pkl`) e script custom:
- `pattern_model.pkl`: Riconoscimento rapido schemi.
- `tactical_model.pkl` / `tactical_model_xgb.pkl`: Predizione successo del punto (Base e XGBoost).
- Script come `train_win_model_xgb.py` e `usa_modello.py` per l'addestramento e il test dell'accuratezza dei modelli su dataset di veri tornei Slam.

---

## 📝 Documentazione Aggiuntiva

Il repository include i seguenti manuali nella root folder:
- **Manuale Utente:TennisAI Pro.pdf**
- Manuale per utenti macOS (`.pages`)

Maggiori dettagli su specifiche API sono automaticamente visibili lanciando il backend e visitando l'URL `http://localhost:8000/docs`.

---

## 📄 Licenza & Autore
**TennisAI Pro**
Sviluppato e gestito da [gnefolo](https://github.com/gnefolo).
