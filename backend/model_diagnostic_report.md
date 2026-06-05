# 🔬 TennisAI Pro — Diagnostica Completa Modello v2.3.0

**Data**: 29 Maggio 2026  
**Modello**: `tactical_model_xgb_temporal.pkl`  
**Tipo**: `CalibratedClassifierCV` (XGBoost + isotonic regression)  
**Split**: Temporal match split (80/20)  
**Dataset**: 3.830.332 punti — 10.508 match Grand Slam

---

## 📊 Riepilogo Metriche in Produzione

| Metrica | Valore | Benchmark | Giudizio |
|---------|--------|-----------|----------|
| **Accuracy** | 88.41% | >85% | ✅ Eccellente |
| **ROC AUC** | 0.9596 | >0.90 | ✅ Eccellente |
| **Brier Score** | 0.0811 | <0.15 | ✅ Eccellente |
| **Log Loss** | 0.2596 | <0.40 | ✅ Buono |
| **Coerenza con bundle** | 100% | — | ✅ Perfetta |

> [!NOTE]
> Le metriche ricalcolate dal test set corrispondono **esattamente** a quelle stodate nel bundle `.pkl`. Il modello è integro e riproducibile.

---

## 🏆 Feature Importance (Top 10)

| # | Feature | Importanza | Interpretazione Tennis |
|---|---------|------------|----------------------|
| 1 | `momentum_trend` | **25.77%** | Trend ultimi 5 punti |
| 2 | `last_n_points_won_5` | **17.35%** | Win rate ultimi 5 punti |
| 3 | `is_player_on_serve` | **9.65%** | Chi serve |
| 4 | `RallyCount` | **9.23%** | Lunghezza scambio |
| 5 | `ServeNumber` | **5.32%** | 1st/2nd servizio |
| 6 | `is_game_point` | **3.40%** | Palla game |
| 7 | `rally_missing` | **2.78%** | Rally data missing flag |
| 8 | `pct_second_serve_points_won` | **2.63%** | % punti vinti con 2nd serve |
| 9 | `serve_advantage` | **2.49%** | Differenziale serve/return |
| 10 | `is_game_point_against` | **2.28%** | Palla game contro |

> [!IMPORTANT]
> **`momentum_trend` + `last_n_points_won_5` = 43.12% dell'importanza totale.** Ma queste due features hanno correlazione **1.0** (ridondanza pura: `momentum_trend = last_n_points_won_5 - 0.5`). Il modello sta guardando la stessa informazione due volte.

---

## 📈 Distribuzione delle Probabilità

```
<0.1:   28.2% ██████████████       
0.1-0.3: 12.5% ██████               
0.3-0.5:  9.3% █████                Forma a U bimodale
0.5-0.7: 10.0% █████                (tipica del tennis:
0.7-0.9: 11.7% ██████               il servitore domina)
>0.9:   28.4% ██████████████       
```

| Statistica | Valore |
|-----------|--------|
| Range | [0.0000, 1.0000] |
| Media | 0.5007 |
| Mediana | 0.5053 |
| Std | 0.3946 |

**Giudizio**: ✅ La distribuzione bimodale è **coerente col tennis**: molti punti sono "quasi certi" (ace/doppio fallo → estremi) e quelli equilibrati cadono nel centro.

---

## 🎯 Calibrazione per Bins

| Bin | N punti | Predetto | Reale | Gap | Stato |
|-----|---------|----------|-------|-----|-------|
| 0.0-0.1 | 215.950 | 0.0263 | 0.0155 | 0.0108 | ✅ |
| **0.1-0.2** | **56.605** | **0.1354** | **0.0880** | **0.0474** | **⚠️** |
| **0.2-0.3** | **38.938** | **0.2511** | **0.2035** | **0.0476** | **⚠️** |
| 0.3-0.4 | 37.025 | 0.3586 | 0.3483 | 0.0103 | ✅ |
| 0.4-0.5 | 34.302 | 0.4505 | 0.4370 | 0.0135 | ✅ |
| 0.5-0.6 | 38.209 | 0.5542 | 0.5571 | 0.0030 | ✅ |
| 0.6-0.7 | 38.243 | 0.6572 | 0.6692 | 0.0120 | ✅ |
| **0.7-0.8** | **31.675** | **0.7480** | **0.7897** | **0.0417** | **⚠️** |
| **0.8-0.9** | **58.356** | **0.8614** | **0.9075** | **0.0461** | **⚠️** |
| 0.9-1.0 | 178.392 | 0.9685 | 0.9829 | 0.0145 | ✅ |

> [!WARNING]
> **Gap massimo: 0.0476** → Calibrazione **ACCETTABILE** ma non eccellente.
> 
> Il modello ha un pattern sistematico:
> - **Bins 0.1-0.3**: Sovrastima (dice 13-25%, realtà 9-20%) → Per il coach: "È più ottimista del dovuto quando dice che le chance sono basse"
> - **Bins 0.7-0.9**: Sottostima (dice 75-86%, realtà 79-91%) → Per il coach: "È un po' conservativo quando dice che le chance sono alte"
>
> I bins centrali (0.3-0.7) sono **eccellenti** (gap <1.5%).

---

## 🧪 Test Scenari Estremi

| Scenario | p(win) | Atteso | Verdetto |
|----------|--------|--------|----------|
| 🟢 Servitore dominante (1st serve, momentum alto) | **0.9888** | >0.65 | ✅ OK |
| 🟢 Giocatore in crisi alla risposta | **0.0100** | <0.40 | ✅ OK |
| 🔴 **Punto equilibrato** (al servizio, stats medie) | **0.9194** | 0.45-0.70 | ⚠️ Troppo alta |
| 🟢 Break point contro, 2nd serve, pressione | **0.2416** | <0.55 | ✅ OK |

> [!CAUTION]
> **Lo scenario "balanced_point" è il problema più importante.** Un giocatore al servizio con statistiche nella media (62% service points won) produce p(win)=0.92. Questo è **troppo alto** — dovrebbe essere ~0.58-0.65.
> 
> **Causa probabile**: La feature `pct_service_points_won = 0.62` combinata con `is_player_on_serve = 1` e le features cumulative creano una cascata di segnali troppo forti. Il modello sta "sommando" informazioni ridondanti.

---

## 🔗 Ridondanza Features (15 coppie con corr > 0.95)

### 🚨 Critica (da risolvere)
| Feature 1 | Feature 2 | Correlazione | Azione |
|-----------|-----------|:----------:|--------|
| `last_n_points_won_5` | `momentum_trend` | **1.000** | **RIMUOVERE UNA** |

### ⚠️ Da Monitorare (collinearità alta)
Le features cumulative sono quasi tutte ridondanti con `PointNumber`:

| Gruppo | Features | Corr con PointNumber |
|--------|----------|:-------------------:|
| Conteggi servizio | `service_points_played`, `service_points_won` | 0.988, 0.980 |
| Conteggi risposta | `return_points_played` | 0.988 |
| Conteggi 1st serve | `first_serve_points_played`, `first_serve_points_won_cum` | 0.970, 0.961 |
| Conteggi 2nd serve | `second_serve_points_played`, `second_serve_points_won_cum` | 0.957 |

> [!NOTE]
> La collinearità dei conteggi cumulativi è **attesa** (più punti giochi, più crescono tutti i contatori). Ma per XGBoost la collinearità non è dannosa come per la regressione lineare — al massimo divide l'importanza tra features simili.
> 
> L'unica ridondanza **veramente dannosa** è `last_n_points_won_5 ↔ momentum_trend` (correlazione 1.0 = stessa informazione).

---

## 📉 Cross-Validation Temporale (4 Fold)

| Fold | Match Training | Match Test | Accuracy | ROC AUC | Brier | LogLoss |
|------|:-----------:|:--------:|:-------:|:------:|:----:|:------:|
| 1 | 2.101 | 2.101 | **0.7348** | 0.8193 | 0.1728 | 0.5070 |
| 2 | 4.202 | 2.101 | 0.8422 | 0.9275 | 0.1108 | 0.3500 |
| 3 | 6.303 | 2.101 | **0.8909** | 0.9623 | 0.0803 | 0.2631 |
| 4 | 8.404 | 2.101 | 0.8851 | 0.9603 | 0.0804 | 0.2590 |

| Stabilità | Media | Std |
|-----------|:-----:|:---:|
| Accuracy | 0.8383 | **±0.0626** |
| ROC AUC | 0.9173 | ±0.0583 |
| Brier | 0.1111 | ±0.0377 |

> [!WARNING]
> **Verdetto: INSTABILE** — La Fold 1 (solo 2.101 match di training) crolla a 73.5% accuracy.
> 
> **Ma questo è ATTESO e NON un vero problema:**
> - La Fold 1 ha solo il 20% dei dati di training → underfitting naturale
> - Le Fold 3-4 (con 60-80% dei dati) convergono a ~0.885-0.891 → **stabilmente alte**
> - Il modello in produzione usa l'80% dei dati (8.406 match) → le sue performance sono quelle delle Fold 3-4
> - La "instabilità" è semplicemente la curva di apprendimento: con pochi dati il modello performa meno

---

## 🏁 Verdetto Complessivo

### ✅ Cosa Funziona Bene
1. **Metriche eccellenti**: Accuracy 88.4%, ROC AUC 0.96, Brier 0.081
2. **Bundle integro**: Metriche riproducibili al 100%
3. **Feature Importance sensata**: Le features più importanti hanno senso tattico (momentum, servizio, rally)
4. **Distribuzione corretta**: Bimodale, coerente col tennis
5. **Scenari estremi**: 3 su 4 corretti e realistici
6. **Calibrazione centrale**: Eccellente nei bins 0.3-0.7 (dove conta per il coach)

### ⚠️ Problemi Identificati (per priorità)

| # | Problema | Severità | Impatto |
|---|---------|:--------:|---------|
| 1 | `momentum_trend` = `last_n_points_won_5 - 0.5` (corr=1.0) | 🟡 Media | 43% dell'importanza su una sola informazione |
| 2 | Scenario balanced_point → p(win)=0.92 troppo alta | 🟡 Media | Rischio overconfidence per punti "normali" |
| 3 | Calibrazione imprecisa nei bins 0.1-0.3 e 0.7-0.9 | 🟢 Bassa | Gap ~4.7% in zone non critiche |
| 4 | Conteggi cumulativi collineari | 🟢 Bassa | Atteso per XGBoost, impatto minimo |

---

## 🔧 Piano d'Azione Raccomandato

### Priorità 1: Rimuovere ridondanza pura
**Rimuovere `momentum_trend`** dalla lista features. È identica a `last_n_points_won_5 - 0.5`, una trasformazione lineare. XGBoost non beneficia di trasformazioni lineari.

### Priorità 2: Investigare scenario balanced_point
Verificare se il problema dello scenario equilibrato è dovuto alla ridondanza (Priorità 1) o se serve un aggiustamento della calibrazione. Dopo la rimozione di `momentum_trend`, rieseguire la diagnostica.

### Priorità 3 (Opzionale): Ricalibrazione mirata
Se dopo la Priorità 1-2 i bins 0.1-0.3 e 0.7-0.9 restano con gap >4%, valutare una ricalibrazione con `method="sigmoid"` o una calibrazione Platt su quei range specifici.

---

> [!TIP]
> **Per il coach**: Nella versione attuale, il modello è **affidabile e utilizzabile**. Le metriche core sono eccellenti. I problemi identificati sono ottimizzazioni, non bug bloccanti. Il pannello "Model Stats" nel frontend già mostra le metriche reali, quindi la trasparenza è garantita.
