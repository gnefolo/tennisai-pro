// src/components/SlamWizard.tsx
import React, { useEffect, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

// ---------- Tipi allineati al backend ----------

interface SlamYear {
  year: string;
}

interface SlamEvent {
  slam?: string | null;
  tournament: string;
  genders: string[];
}

interface SlamRound {
  round: string;
}

interface SlamMatch {
  id: string;
  label: string;
  num_points: number;
  player1?: string | null;
  player2?: string | null;
  round?: string | null;
}

interface SlamWizardProps {
  // callback verso il genitore (TennisAIDashboard)
  onMatchSelect: (matchId: string | null) => void;
}

// ---------- Helper fetch ----------

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} su ${url}`);
  }
  return (await res.json()) as T;
}

// ---------- Componente ----------

export const SlamWizard: React.FC<SlamWizardProps> = ({ onMatchSelect }) => {
  // Wizard storico
  const [years, setYears] = useState<SlamYear[]>([]);
  const [events, setEvents] = useState<SlamEvent[]>([]);
  const [rounds, setRounds] = useState<SlamRound[]>([]);
  const [matches, setMatches] = useState<SlamMatch[]>([]);

  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedEventIndex, setSelectedEventIndex] = useState<number | null>(
    null
  );
  const [selectedGender, setSelectedGender] = useState<string>("");
  const [selectedRound, setSelectedRound] = useState<string>("");

  const [playerSearch, setPlayerSearch] = useState<string>("");

  const [error, setError] = useState<string | null>(null);

  // stato locale per evidenziare il match selezionato
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const currentEvent =
    selectedEventIndex !== null ? events[selectedEventIndex] : null;

  // ---------- Carica ANNI all'avvio (storico) ----------

  useEffect(() => {
    fetchJSON<SlamYear[]>(`${API_BASE}/api/slam/filters/years`)
      .then(setYears)
      .catch((err) => {
        console.error(err);
        setError("Errore nel caricamento degli anni storici.");
      });
  }, []);

  // ---------- STEP 1: Anno ----------

  const handleSelectYear = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = e.target.value;
    setSelectedYear(year);

    // Reset step successivi
    setEvents([]);
    setRounds([]);
    setMatches([]);
    setSelectedEventIndex(null);
    setSelectedGender("");
    setSelectedRound("");
    setPlayerSearch("");
    setError(null);
    setSelectedMatchId(null);
    onMatchSelect(null);

    if (!year) return;

    fetchJSON<SlamEvent[]>(
      `${API_BASE}/api/slam/filters/events?year=${encodeURIComponent(year)}`
    )
      .then(setEvents)
      .catch((err) => {
        console.error(err);
        setError("Errore nel caricamento degli eventi per l'anno selezionato.");
      });
  };

  // ---------- STEP 2: Evento / Torneo / Slam ----------

  const handleSelectEvent = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (!value) {
      setSelectedEventIndex(null);
      setSelectedGender("");
      setRounds([]);
      setMatches([]);
      setSelectedRound("");
      setPlayerSearch("");
      setError(null);
      setSelectedMatchId(null);
      onMatchSelect(null);
      return;
    }

    const idx = parseInt(value, 10);
    setSelectedEventIndex(idx);
    setSelectedGender("");
    setRounds([]);
    setMatches([]);
    setSelectedRound("");
    setPlayerSearch("");
    setError(null);
    setSelectedMatchId(null);
    onMatchSelect(null);
  };

  // ---------- STEP 3: Genere ----------

  const handleSelectGender = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const gender = e.target.value;
    setSelectedGender(gender);
    setRounds([]);
    setMatches([]);
    setSelectedRound("");
    setPlayerSearch("");
    setError(null);
    setSelectedMatchId(null);
    onMatchSelect(null);

    if (!selectedYear || !currentEvent || !gender) return;

    const params = new URLSearchParams();
    params.set("year", selectedYear);
    if (currentEvent.slam) params.set("slam", currentEvent.slam);
    params.set("tournament", currentEvent.tournament);
    params.set("gender", gender);

    fetchJSON<SlamRound[]>(
      `${API_BASE}/api/slam/filters/rounds?${params.toString()}`
    )
      .then(setRounds)
      .catch((err) => {
        console.error(err);
        setError("Errore nel caricamento dei round disponibili.");
      });
  };

  // ---------- STEP 4: Round ----------

  const handleSelectRound = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rnd = e.target.value;
    setSelectedRound(rnd);
    setMatches([]);
    setPlayerSearch("");
    setError(null);
    setSelectedMatchId(null);
    onMatchSelect(null);

    if (!selectedYear || !currentEvent || !selectedGender || !rnd) return;

    const params = new URLSearchParams();
    params.set("year", selectedYear);
    if (currentEvent.slam) params.set("slam", currentEvent.slam);
    params.set("tournament", currentEvent.tournament);
    params.set("gender", selectedGender);
    params.set("round", rnd);

    fetchJSON<SlamMatch[]>(
      `${API_BASE}/api/slam/filters/matches?${params.toString()}`
    )
      .then((data) => {
        setMatches(data);
      })
      .catch((err) => {
        console.error(err);
        setError("Errore nel caricamento dei match per il round selezionato.");
      });
  };

  // ---------- Ricerca per giocatore (alternativa) ----------

  const handleSearchByPlayer = () => {
    if (!playerSearch.trim()) return;

    const params = new URLSearchParams();
    params.set("player", playerSearch.trim());
    if (selectedYear) params.set("year", selectedYear);
    if (currentEvent?.slam) params.set("slam", currentEvent.slam);
    if (currentEvent?.tournament) params.set("tournament", currentEvent.tournament);
    if (selectedGender) params.set("gender", selectedGender);
    if (selectedRound) params.set("round", selectedRound);

    fetchJSON<SlamMatch[]>(
      `${API_BASE}/api/slam/filters/matches?${params.toString()}`
    )
      .then((data) => {
        setMatches(data);
        setSelectedMatchId(null);
        onMatchSelect(null);
      })
      .catch((err) => {
        console.error(err);
        setError("Errore nella ricerca dei match per giocatore.");
      });
  };

  // ---------- Selezione match ----------

  const handleSelectMatch = (matchId: string) => {
    setSelectedMatchId(matchId);
    onMatchSelect(matchId);
  };

  // ---------- RENDER ----------

  return (
    <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-3 md:p-4 flex flex-col gap-4">
      <h2 className="text-base md:text-lg font-semibold text-slate-100 mb-1">
        Storico Slam – Wizard
      </h2>

      {error && (
        <div className="text-xs text-red-400 border border-red-500/60 bg-red-950/40 px-3 py-2 rounded-xl">
          {error}
        </div>
      )}

      {/* STEP 1 – Anno */}
      <div>
        <div className="text-xs font-semibold uppercase text-slate-400 mb-1">
          1. Anno
        </div>
        <select
          value={selectedYear}
          onChange={handleSelectYear}
          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-100"
        >
          <option value="">Seleziona anno</option>
          {years.map((y) => (
            <option key={y.year} value={y.year}>
              {y.year}
            </option>
          ))}
        </select>
      </div>

      {/* STEP 2 – Evento */}
      <div>
        <div className="text-xs font-semibold uppercase text-slate-400 mb-1">
          2. Torneo / Slam
        </div>
        <select
          value={selectedEventIndex !== null ? String(selectedEventIndex) : ""}
          onChange={handleSelectEvent}
          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-100"
          disabled={!selectedYear || events.length === 0}
        >
          <option value="">
            {selectedYear ? "Seleziona evento" : "Seleziona prima l'anno"}
          </option>
          {events.map((ev, idx) => (
            <option key={`${ev.tournament}-${idx}`} value={idx}>
              {ev.tournament}
              {ev.slam ? ` (${ev.slam})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* STEP 3 – Genere */}
      <div>
        <div className="text-xs font-semibold uppercase text-slate-400 mb-1">
          3. Genere
        </div>
        <select
          value={selectedGender}
          onChange={handleSelectGender}
          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-100"
          disabled={!currentEvent}
        >
          <option value="">
            {currentEvent ? "Seleziona genere" : "Seleziona prima il torneo"}
          </option>
          {(currentEvent?.genders || []).map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      {/* STEP 4 – Round */}
      <div>
        <div className="text-xs font-semibold uppercase text-slate-400 mb-1">
          4. Round
        </div>
        <select
          value={selectedRound}
          onChange={handleSelectRound}
          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-100"
          disabled={!selectedGender || rounds.length === 0}
        >
          <option value="">
            {selectedGender ? "Seleziona round" : "Seleziona prima il genere"}
          </option>
          {rounds.map((r) => (
            <option key={r.round} value={r.round}>
              {r.round}
            </option>
          ))}
        </select>
      </div>

      {/* STEP 5 – Match + ricerca giocatore */}
      <div className="mt-2">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs font-semibold uppercase text-slate-400">
            5. Match
          </div>
        </div>

        {/* Ricerca per giocatore */}
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="Cerca per giocatore..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-100"
            value={playerSearch}
            onChange={(e) => setPlayerSearch(e.target.value)}
          />
          <button
            onClick={handleSearchByPlayer}
            className="text-xs md:text-sm px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium"
          >
            Cerca
          </button>
        </div>

        {/* Lista match */}
        <div className="space-y-1">
          {matches.length === 0 && (
            <div className="text-xs text-slate-500">
              Nessun match trovato. Completa il wizard o usa la ricerca per
              giocatore.
            </div>
          )}
          {matches.map((m) => {
            const isSelected = selectedMatchId === m.id;
            return (
              <button
                key={m.id}
                onClick={() => handleSelectMatch(m.id)}
                className={`w-full text-left px-3 py-2 rounded-xl border text-xs md:text-sm ${
                  isSelected
                    ? "border-sky-500 bg-sky-900/50 text-sky-50"
                    : "border-slate-700 bg-slate-950/60 text-slate-100 hover:border-sky-500 hover:bg-slate-900"
                }`}
              >
                <div className="font-semibold">
                  {m.player1 ?? "Player 1"} vs {m.player2 ?? "Player 2"}
                </div>
                <div className="text-[11px] text-slate-400">
                  {m.round ? `${m.round} · ` : ""}
                  punti: {m.num_points}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SlamWizard;