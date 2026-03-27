import pandas as pd
from typing import Optional
import joblib

MODEL_PATH = "tactical_model.pkl"
DATA_PATH = "slam_all_features.csv"  # oppure "slam_all_features.csv"

def safe_float(val, default=0.0):
    try:
        if pd.isna(val):
            return default
        return float(val)
    except (ValueError, TypeError):
        return default


def safe_int(val, default=0):
    try:
        if pd.isna(val):
            return default
        return int(val)
    except (ValueError, TypeError):
        return default

def carica_modello():
    bundle = joblib.load(MODEL_PATH)
    model = bundle["model"]
    feature_cols = bundle["features"]
    print(f"Modello caricato da {MODEL_PATH}")
    print("Numero feature usate:", len(feature_cols))
    return model, feature_cols

def carica_pattern_model():
    MODEL_PATH = "pattern_model.pkl"
    try:
        bundle = joblib.load(MODEL_PATH)
        model = bundle["model"]
        features = bundle["features"]
        print(f"Pattern model caricato da {MODEL_PATH}")
        print(f"Feature usate dal pattern model: {len(features)}")
        return model, features
    except Exception as e:
        print("Impossibile caricare pattern_model.pkl:", e)
        return None, None

def band_confidenza(proba: float) -> str:
    """Restituisce una fascia qualitativa sulla probabilità di vincere il punto."""
    if proba >= 0.70:
        return "alta"
    elif proba >= 0.55:
        return "medio-alta"
    elif proba >= 0.45:
        return "incerta"
    else:
        return "bassa"

def classify_pattern(row, proba):
    is_on_serve = safe_int(row.get("is_player_on_serve", 0), 0)
    pct_1st = safe_float(row.get("pct_first_serve_points_won", 0))
    pct_2nd = safe_float(row.get("pct_second_serve_points_won", 0))
    pct_sv = safe_float(row.get("pct_service_points_won", 0))
    pct_rt = safe_float(row.get("pct_return_points_won", 0))
    mom5 = safe_float(row.get("last_n_points_won_5", 0))
    is_bp = safe_int(row.get("is_break_point", 0))
    is_gp = safe_int(row.get("is_game_point", 0))

    # === SERVIZIO ===
    if is_on_serve == 1:
        # pattern 1: servizio sicuro
        if pct_1st < 0.60 or pct_2nd < 0.45 or mom5 < 0.40 or is_bp == 1:
            return 1

        # pattern 2: servizio aggressivo
        if pct_1st > 0.68 and mom5 > 0.55 and proba > 0.55 and is_bp == 0:
            return 2

        # pattern 3: servizio neutro
        return 3

    # === RISPOSTA ===
    else:
        if is_bp == 1 and pct_rt >= 0.32 and mom5 >= 0.45:
            return 5  # risposta aggressiva su palla break

        if pct_rt < 0.30 or mom5 < 0.40 or proba < 0.45:
            return 4  # risposta sicura

        return 6  # risposta neutra

def classify_pattern_advanced(row, proba: float) -> int:
    """
    Classificatore tattico avanzato (rule-based):
    restituisce un pattern_id (1..8) in base a:
    - servizio/risposta
    - percentuali di servizio/risposta
    - qualità 1ª/2ª
    - momentum
    - pressione del punto (break/game point)
    """

    is_on_serve = safe_int(row.get("is_player_on_serve", 0), 0)
    serve_no = safe_int(row.get("ServeNumber", 1), 1)

    pct_1st = safe_float(row.get("pct_first_serve_points_won", 0))
    pct_2nd = safe_float(row.get("pct_second_serve_points_won", 0))
    pct_sv  = safe_float(row.get("pct_service_points_won", 0))
    pct_rt  = safe_float(row.get("pct_return_points_won", 0))

    mom5    = safe_float(row.get("last_n_points_won_5", 0))
    is_bp   = safe_int(row.get("is_break_point", 0), 0)
    is_gp   = safe_int(row.get("is_game_point", 0), 0)
    is_gp_against = safe_int(row.get("is_game_point_against", 0), 0)

    # --- SERVIZIO ---
    if is_on_serve == 1:
        # 1) SERVIZIO SICURO / PERCENTUALI (pattern 1)
        if (
            pct_1st < 0.60
            or pct_2nd < 0.45
            or mom5 < 0.40
            or is_bp == 1
            or is_gp_against == 1
        ):
            return 1  # servizio sicuro / percentuali

        # 2) SERVIZIO AGGRESSIVO SU 1ª (pattern 2)
        if (
            serve_no == 1
            and pct_1st > 0.70
            and pct_sv  > 0.65
            and mom5    > 0.55
            and proba   > 0.60
            and is_bp   == 0
        ):
            return 2  # servizio aggressivo su 1ª

        # 3) SERVIZIO VARIATO / MIX (pattern 3)
        if (
            pct_sv >= 0.58 and pct_sv <= 0.68
            and mom5 >= 0.40 and mom5 <= 0.60
        ):
            return 3  # servizio misto/neutro

        # 4) SERVIZIO DIFENSIVO SU PALLA BREAK (pattern 4)
        if is_bp == 1 and mom5 < 0.5:
            return 4

        # fallback: se niente di forte → pattern 3 (neutro)
        return 3

    # --- RISPOSTA ---
    else:
        # 5) RISPOSTA AGGRESSIVA SU SECONDA / PALLA BREAK (pattern 5)
        if (
            is_bp == 1
            and pct_rt >= 0.32
            and mom5 >= 0.45
            and proba >= 0.50
        ):
            return 5

        # 6) RISPOSTA SICURA / PROFONDITÀ CENTRALE (pattern 6)
        if (
            pct_rt < 0.30
            or mom5 < 0.40
            or proba < 0.45
        ):
            return 6

        # 7) RISPOSTA POSIZIONALE / NEUTRA (pattern 7)
        if (
            pct_rt >= 0.30 and pct_rt <= 0.38
            and mom5 >= 0.40 and mom5 <= 0.60
        ):
            return 7

        # 8) RISPOSTA PRESSING NELLO SCAMBIO (pattern 8)
        if (
            pct_rt > 0.38
            and mom5 > 0.55
            and proba > 0.55
        ):
            return 8

        # fallback: neutra
        return 7

def predici_pattern_ml(row):
    model, feature_cols = carica_pattern_model()
    if model is None:
        return None, None

    # costruisci il vettore X per il modello dei pattern
    d = {}
    for col in feature_cols:
        d[col] = safe_float(row.get(col, 0), default=0)

    df_x = pd.DataFrame([d])
    pred = model.predict(df_x)[0]
    proba = model.predict_proba(df_x)[0].max()

    return int(pred), float(proba)

def compute_pressure_level(row: pd.Series) -> str:
    """
    Valuta il livello di pressione del punto:
    - high   = palla break, palla game, ecc.
    - medium = game avanzato / set avanzato
    - low    = situazione normale
    """
    is_bp = safe_int(row.get("is_break_point", 0), 0)
    is_gp = safe_int(row.get("is_game_point", 0), 0)
    is_gp_against = safe_int(row.get("is_game_point_against", 0), 0)

    set_no = safe_int(row.get("SetNo", 1), 1)
    game_no = safe_int(row.get("GameNo", 1), 1)

    # alta pressione: palla break, palla game o game molto avanzato in set avanzato
    if is_bp == 1 or is_gp == 1 or is_gp_against == 1:
        return "high"

    if set_no >= 3 and game_no >= 8:
        return "medium"

    return "low"

def fuse_patterns(rule_id: int, ml_id: Optional[int], ml_conf: Optional[float],
                  row: pd.Series, proba: float) -> tuple[int, str]:
    """
    Fusione tra pattern rule-based e pattern ML:
    - in alta pressione di solito diamo priorità alle regole (più interpretabili)
    - in bassa pressione, se il ML è molto sicuro, può prevalere
    - in caso di disaccordo, spieghiamo cosa sta succedendo
    """
    pressure = compute_pressure_level(row)
    mom5 = safe_float(row.get("last_n_points_won_5", 0), 0.0)

    # se il modello ML non è disponibile, usiamo solo le regole
    if ml_id is None or ml_conf is None:
        return rule_id, "Fusione: uso solo il pattern delle regole (modello ML non disponibile)."

    # se rule e ML sono uguali → facile
    if ml_id == rule_id:
        return rule_id, "Fusione: regole e modello ML sono allineati sullo stesso pattern."

    # da qui in poi: disaccordo
    # logica generale:
    # - pressione alta → preferenza per le regole
    # - pressione bassa + ML molto sicuro → preferenza per il ML
    # - pressione media → guardiamo anche il momentum e la proba

    # pressione alta: fidiamoci più delle regole
    if pressure == "high":
        return rule_id, (
            "Fusione: punto ad alta pressione (palla game/break). "
            "Do priorità al pattern definito dalle regole tattiche più conservative."
        )

    # pressione bassa: se ML molto sicuro, lo seguiamo
    if pressure == "low":
        if ml_conf >= 0.70:
            return ml_id, (
                "Fusione: situazione a bassa pressione e modello ML molto sicuro. "
                "Seguo il pattern suggerito dal modello ML."
            )
        else:
            return rule_id, (
                "Fusione: situazione a bassa pressione ma modello ML non abbastanza sicuro. "
                "Resto sul pattern delle regole."
            )

    # pressione media: guardiamo momentum e proba
    if pressure == "medium":
        # se momentum positivo e proba alta → posso fidarmi del ML se sicuro
        if mom5 >= 0.5 and proba >= 0.55 and ml_conf >= 0.65:
            return ml_id, (
                "Fusione: pressione media, momentum positivo e modello ML abbastanza sicuro. "
                "Do priorità al pattern suggerito dal modello ML."
            )
        else:
            return rule_id, (
                "Fusione: pressione media ma segnali misti (momentum o proba non fortissimi). "
                "Do priorità al pattern delle regole."
            )

    # fallback di sicurezza
    return rule_id, "Fusione: caso non categorizzato, uso il pattern delle regole."

def genera_suggerimenti_tattici(row: pd.Series, proba: float) -> list[str]:
    """
    Layer rule-based sopra il modello:
    - legge le feature principali
    - combina situazione (servizio/risposta, momentum, % servizio, ecc.)
    - restituisce una lista di messaggi testuali per coach/giocatore
    """
    sug = []

    # Lettura valori con default sicuri (gestiamo NaN)
    is_on_serve = safe_int(row.get("is_player_on_serve", 0), default=0)
    serve_no = safe_int(row.get("ServeNumber", 1), default=1)
    rally = safe_float(row.get("RallyCount", 0.0), default=0.0)

    pct_sv = safe_float(row.get("pct_service_points_won", 0.0), default=0.0)
    pct_rt = safe_float(row.get("pct_return_points_won", 0.0), default=0.0)
    pct_1st = safe_float(row.get("pct_first_serve_points_won", 0.0), default=0.0)
    pct_2nd = safe_float(row.get("pct_second_serve_points_won", 0.0), default=0.0)
    mom5 = safe_float(row.get("last_n_points_won_5", 0.0), default=0.0)

    conf_band = band_confidenza(proba)

    # --- Messaggio generale sul contesto numerico ---
    sug.append(
        f"Probabilità stimata di vincere il prossimo punto: {proba:.2f} "
        f"(confidenza {conf_band}). Momentum ultimi 5 punti: {mom5:.2f}."
    )

    # --- Logica diversa se sei al servizio o in risposta ---
    if is_on_serve == 1:
        sug.append("Sei al servizio in questo punto.")

        # Analisi servizio vs risposta
        if pct_sv > 0.65:
            sug.append(
                "Nel complesso stai servendo bene (molti punti vinti al servizio finora). "
                "Puoi permetterti di proporre i tuoi schemi di servizio preferiti."
            )
        elif pct_sv < 0.55:
            sug.append(
                "Stai faticando a tenere i game di servizio: conviene alzare le percentuali e ridurre il rischio inutile."
            )

        # Confronto 1ª vs 2ª
        if pct_1st > 0.68 and pct_2nd < 0.50:
            sug.append(
                "La 1ª sta funzionando molto meglio della 2ª: priorità massima a mantenere alta la percentuale di prime in campo, "
                "anche accettando una 1ª leggermente meno aggressiva ma molto solida."
            )
        elif pct_1st < 0.60 and pct_2nd < 0.50:
            sug.append(
                "Né la 1ª né la 2ª stanno portando grandi risultati: punta a un servizio più sicuro sulle traiettorie che controlli meglio, "
                "e programma il colpo +1 per difendere subito il centro."
            )
        elif pct_1st > 0.70 and pct_2nd > 0.55:
            sug.append(
                "Stai ottenendo buoni risultati sia con la 1ª che con la 2ª: puoi permetterti qualche variazione in più di direzione "
                "per sorprendere l'avversario."
            )

        # Riferimento al tipo di servizio del punto attuale
        if serve_no == 1:
            sug.append(
                "Su questa palla stai servendo di 1ª: scegli una soluzione ad alta percentuale sulla zona che ti dà più punti diretti "
                "o un colpo +1 facile (ad esempio uscita di dritto)."
            )
        else:
            sug.append(
                "Su questa palla stai servendo di 2ª: meglio una traiettoria sicura (body o verso il colpo più debole dell'avversario) "
                "e colpo +1 prudente per non regalare l'iniziativa."
            )

        # Momentum e proba combinati
        if mom5 < 0.4 and proba < 0.5:
            sug.append(
                "Momentum negativo e punto difficile: scegli uno schema chiaro e ripetuto in allenamento, senza forzare troppo. "
                "L'obiettivo è uscire vivi da questo punto e spezzare la serie negativa."
            )
        elif mom5 > 0.6 and proba > 0.6:
            sug.append(
                "Momentum positivo e situazione favorevole: puoi proporre il tuo schema di servizio più aggressivo, "
                "cercando di spostare subito l'avversario e chiudere in pochi colpi."
            )

        # Rally
        # Rally
        if rally == 0:
            sug.append(
                "I dati sulla lunghezza degli scambi non sono chiari: focalizzati sull'accoppiata servizio + primo colpo "
                "per impostare il punto come vuoi tu."
            )
        elif rally <= 3:
            sug.append(
                "Gli scambi in questo game sono tendenzialmente brevi: lavora bene con l'accoppiata servizio + primo colpo, "
                "piuttosto che preparare scambi lunghi."
            )
        else:
            sug.append(
                "Gli scambi si allungano: assicurati che la scelta di servizio ti porti verso una costruzione punto sostenibile fisicamente, "
                "non solo a un vincente immediato."
            )

    else:
        sug.append("Sei in risposta in questo punto.")

        # Efficacia in risposta
        if pct_rt > 0.38:
            sug.append(
                "Stai rispondendo bene (alta percentuale di punti vinti in risposta): puoi permetterti una risposta più aggressiva, "
                "soprattutto verso il colpo che l'avversario gestisce peggio."
            )
        elif pct_rt < 0.25:
            sug.append(
                "Finora hai vinto pochi punti in risposta: meglio privilegiare una risposta solida e profonda al centro, "
                "più che cercare subito il vincente sulla risposta."
            )

        # Momentum
        if mom5 > 0.6 and proba > 0.55:
            sug.append(
                "Momentum positivo anche in risposta: è un buon momento per provare a mettere pressione sul servizio avversario, "
                "ad esempio avanzando un po' in posizione di risposta."
            )
        elif mom5 < 0.4 and proba < 0.5:
            sug.append(
                "Momentum negativo e situazione non semplice in risposta: l'obiettivo è rimettere la palla in gioco con qualità, "
                "evitando errori gratuiti sulla risposta."
            )

        # Rally
    if rally == 0:
        # niente info affidabile sugli scambi, oppure scambio non tracciato
        sug.append(
            "I dati sulla lunghezza degli scambi in questo punto non sono chiari: "
            "concentrati sulla qualità dei primi due colpi (risposta e colpo successivo)."
        )
    elif rally <= 3:
        sug.append(
            "Gli scambi tendono a chiudersi rapidamente: se la risposta non è vincente, puntala profonda e centrale "
            "per togliere angoli all'avversario e allungare un minimo lo scambio."
        )
    else:
        sug.append(
            "La partita sta producendo scambi medi/lunghi: puoi lavorare di più strategicamente su direzione e profondità "
            "già a partire dalla risposta, senza dover forzare l'immediato."
        )

    # Conclusione se non c'è un pattern fortissimo
    if conf_band == "incerta":
        sug.append(
            "La situazione statistica è equilibrata: il focus deve essere sull'esecuzione pulita del tuo schema migliore "
            "per questo tipo di punto (servizio esterno e uscita di dritto, risposta cross di rovescio, ecc.)."
        )

    # Pattern tattico riconosciuto
        pattern_id = classify_pattern(row, proba)
        pattern_names = {
            1: "Servizio Sicuro / Percentuali",
            2: "Servizio Aggressivo / Schema d’uscita",
            3: "Servizio Misto / Neutro",
            4: "Risposta Sicura / Profondità centrale",
            5: "Risposta Aggressiva su Palla Break",
            6: "Risposta Posizionale / Neutra",
        }
        sug.append(f"Pattern tattico riconosciuto: {pattern_names[pattern_id]}")
        sug.append(f"(Pattern ID = {pattern_id})")

    # Pattern tattico riconosciuto (versione avanzata)
    pattern_id = classify_pattern_advanced(row, proba)
    pattern_names = {
        1: "Servizio Sicuro / Percentuali",
        2: "Servizio Aggressivo su 1ª",
        3: "Servizio Variato / Neutro",
        4: "Servizio Difensivo su Palla Break",
        5: "Risposta Aggressiva su Palla Break",
        6: "Risposta Sicura / Profondità Centrale",
        7: "Risposta Posizionale / Neutra",
        8: "Risposta di Pressing nello Scambio",
    }

    descr = pattern_names.get(pattern_id, "Pattern non definito")
    sug.append(f"Pattern tattico riconosciuto: {descr} (Pattern ID = {pattern_id})")

    # Pattern ML (pattern_model.pkl)
    ml_pattern, ml_conf = predici_pattern_ml(row)

    pattern_names = {
        1: "Servizio Sicuro / Percentuali",
        2: "Servizio Aggressivo su 1ª",
        3: "Servizio Variato / Neutro",
        4: "Servizio Difensivo su Palla Break",
        5: "Risposta Aggressiva su Palla Break",
        6: "Risposta Sicura / Profondità Centrale",
        7: "Risposta Posizionale / Neutra",
        8: "Risposta di Pressing nello Scambio",
    }

    # Messaggio di confronto ruoli / ML
    rule_name = pattern_names.get(pattern_id, "N/A")
    sug.append(f"Pattern delle regole: {rule_name} (ID={pattern_id})")

    if ml_pattern is not None:
        ml_name = pattern_names.get(ml_pattern, "N/A")
        sug.append(f"Pattern ML predetto: {ml_name} (ID={ml_pattern}, confidenza {ml_conf:.2f})")
    else:
        ml_name = None
        sug.append("Pattern ML non disponibile (pattern_model.pkl non caricato).")

    # FUSIONE
    fused_id, fusion_expl = fuse_patterns(pattern_id, ml_pattern, ml_conf, row, proba)
    fused_name = pattern_names.get(fused_id, "N/A")

    sug.append(f"Pattern FINALE consigliato: {fused_name} (ID={fused_id})")
    sug.append(fusion_expl)

    # Se rule e ML non sono d'accordo, evidenzialo
    if ml_pattern is not None and ml_pattern != pattern_id:
        sug.append(
            f"NOTA: disaccordo tra regole ({rule_name}) e modello ML ({ml_name}). "
            "La decisione finale è stata presa dalla logica di fusione sopra."
        )

    return sug


def predici_da_riga_dataset(indice=0):
    model, feature_cols = carica_modello()

    df = pd.read_csv(DATA_PATH)
    print(f"Dataset caricato da {DATA_PATH}, righe: {len(df)}")

    if indice < 0 or indice >= len(df):
        print(f"Indice fuori range (0-{len(df)-1}), uso indice 0.")
        indice = 0

    row = df.iloc[indice]
    X = row[feature_cols].to_frame().T

    proba = model.predict_proba(X)[0, 1]
    y_pred = model.predict(X)[0]
    y_true = row["point_won"]

    print("\n=== PUNTO REALE DAL DATASET ===")
    print(f"Indice riga: {indice}")
    print(f"SetNo={row['SetNo']}, GameNo={row['GameNo']}, PointNumber={row['PointNumber']}")
    print(f"is_player_on_serve={row['is_player_on_serve']}, ServeNumber={row['ServeNumber']}, RallyCount={row['RallyCount']}")
    print(f"Pct punti vinti al servizio finora: {row['pct_service_points_won']:.2f}")
    print(f"Pct punti vinti in risposta finora: {row['pct_return_points_won']:.2f}")
    print(f"Momentum (ultimi 5 punti): {row['last_n_points_won_5']:.2f}")
    print(f"Break Point: {row['is_break_point']}, Game Point: {row['is_game_point']}")
    print(f"Break Point Avversario: {row['is_game_point_against']}")
    print("--------------------------------")
    print(f"Probabilità stimata di vincere il punto: {proba:.3f}")
    print(f"Predizione modello (1=vinco,0=perdo): {y_pred}")
    print(f"Valore reale point_won: {y_true}")

    print("\nSuggerimenti tattici:")
    for s in genera_suggerimenti_tattici(row, proba):
        print("-", s)


def predici_da_scenario_custom():
    model, feature_cols = carica_modello()

    stato_punto = {col: 0.0 for col in feature_cols}

    # ESEMPIO DI SCENARIO CUSTOM – modificalo liberamente
    stato_punto.update({
        "SetNo": 3,
        "GameNo": 4,
        "PointNumber": 7,

        "P1GamesWon": 3,
        "P2GamesWon": 4,

        "ServeNumber": 2,
        "RallyCount": 3,
        "is_player_on_serve": 1,

        "service_points_played": 40,
        "service_points_won": 24,
        "pct_service_points_won": 24 / 40,

        "return_points_played": 35,
        "return_points_won": 10,
        "pct_return_points_won": 10 / 35,

        "first_serve_points_played": 25,
        "first_serve_points_won_cum": 17,
        "pct_first_serve_points_won": 17 / 25,

        "second_serve_points_played": 15,
        "second_serve_points_won_cum": 7,
        "pct_second_serve_points_won": 7 / 15,

        "last_n_points_won_5": 0.2,

        "is_game_point": 0,
        "is_break_point": 0,
        "is_game_point_against": 0,
    })

    X = pd.DataFrame([stato_punto])[feature_cols]

    proba = model.predict_proba(X)[0, 1]
    y_pred = model.predict(X)[0]

    print("\n=== SCENARIO CUSTOM ===")
    print(f"SetNo={stato_punto.get('SetNo')}, GameNo={stato_punto.get('GameNo')}, PointNumber={stato_punto.get('PointNumber')}")
    print(f"is_player_on_serve={stato_punto.get('is_player_on_serve')}, ServeNumber={stato_punto.get('ServeNumber')}")
    print(f"Pct punti vinti al servizio: {stato_punto.get('pct_service_points_won'):.2f}")
    print(f"Pct punti vinti in risposta: {stato_punto.get('pct_return_points_won'):.2f}")
    print(f"Pct punti vinti con 1ª: {stato_punto.get('pct_first_serve_points_won'):.2f}")
    print(f"Pct punti vinti con 2ª: {stato_punto.get('pct_second_serve_points_won'):.2f}")
    print(f"Momentum (ultimi 5 punti): {stato_punto.get('last_n_points_won_5'):.2f}")
    print(f"Break Point: {stato_punto.get('is_break_point')}, Game Point: {stato_punto.get('is_game_point'):.2f}")
    print(f"Break Point Avversario: {stato_punto.get('is_game_point_against'):.2f}")
    print("--------------------------------")
    print(f"Probabilità stimata di vincere il punto: {proba:.3f}")
    print(f"Predizione modello (1=vinco,0=perdo): {y_pred}")

    print("\nSuggerimenti tattici:")
    dummy_row = pd.Series(stato_punto)
    for s in genera_suggerimenti_tattici(dummy_row, proba):
        print("-", s)


if __name__ == "__main__":
    predici_da_riga_dataset(indice=1000)
    predici_da_scenario_custom()