# backend/app/services/report_service.py
# Generazione report PDF post-match con reportlab

from io import BytesIO
from typing import Optional
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Table, TableStyle,
    Spacer, HRFlowable, KeepTogether,
)

# ─── Palette brand ──────────────────────────────────────────────────────────
C_DARK      = colors.HexColor('#0B1220')
C_LIME      = colors.HexColor('#8CAD00')   # lime più scuro per stampa
C_SUCCESS   = colors.HexColor('#16A34A')
C_ERROR     = colors.HexColor('#DC2626')
C_AMBER     = colors.HexColor('#D97706')
C_FOG       = colors.HexColor('#6B7280')
C_GRAPHITE  = colors.HexColor('#374151')
C_WHITE     = colors.white
C_LIGHT_BG  = colors.HexColor('#F9FAFB')
C_BORDER    = colors.HexColor('#E5E7EB')

# ─── Stili tipografici ────────────────────────────────────────────────────────
def _styles():
    return {
        "h1": ParagraphStyle("h1", fontSize=22, fontName="Helvetica-Bold",
                              textColor=C_DARK, spaceAfter=4),
        "h2": ParagraphStyle("h2", fontSize=14, fontName="Helvetica-Bold",
                              textColor=C_DARK, spaceAfter=3, spaceBefore=10),
        "h3": ParagraphStyle("h3", fontSize=11, fontName="Helvetica-Bold",
                              textColor=C_GRAPHITE, spaceAfter=2),
        "body": ParagraphStyle("body", fontSize=9, fontName="Helvetica",
                                textColor=C_GRAPHITE, spaceAfter=2, leading=13),
        "small": ParagraphStyle("small", fontSize=8, fontName="Helvetica",
                                  textColor=C_FOG, spaceAfter=1),
        "label": ParagraphStyle("label", fontSize=8, fontName="Helvetica-Bold",
                                  textColor=C_FOG, spaceAfter=1),
        "center": ParagraphStyle("center", fontSize=9, fontName="Helvetica",
                                   textColor=C_GRAPHITE, alignment=TA_CENTER),
        "tagline": ParagraphStyle("tagline", fontSize=9, fontName="Helvetica",
                                    textColor=C_FOG, alignment=TA_RIGHT),
    }


def _hr(story):
    story.append(Spacer(1, 3*mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER))
    story.append(Spacer(1, 3*mm))


def _pattern_label(pid: Optional[str]) -> str:
    mapping = {
        "SERVE_DOMINANT": "Servizio dominante",
        "AGGRESSIVE_RETURN": "Risposta aggressiva",
        "SHORT_RALLY": "Rally breve",
        "MEDIUM_RALLY": "Rally medio",
        "LONG_RALLY": "Rally lungo",
        "SHORT_BALL_ATTACK": "Attacco palla corta",
        "NET_PLAY": "Gioco a rete",
        "DEFENSE_RECOVERY": "Difesa / recupero",
        "PASSING_LOB": "Passante / lob",
    }
    return mapping.get(pid or "", pid or "—")


def generate_match_report(data: dict) -> bytes:
    """
    Genera un report PDF del match a partire dai dati della sessione.
    Restituisce i byte del PDF.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18*mm, rightMargin=18*mm,
        topMargin=16*mm, bottomMargin=16*mm,
        title="TennisAI Pro — Match Report",
        author="TennisAI Pro",
    )

    s = _styles()
    story = []

    # ── INTESTAZIONE ─────────────────────────────────────────────────────────
    header_data = [[
        Paragraph("<b>TennisAI Pro</b>", ParagraphStyle(
            "logo", fontSize=18, fontName="Helvetica-Bold", textColor=C_WHITE)),
        Paragraph("Match Report", ParagraphStyle(
            "rpt", fontSize=11, fontName="Helvetica", textColor=colors.HexColor('#D4FF3A'),
            alignment=TA_RIGHT)),
    ]]
    header_table = Table(header_data, colWidths=["60%", "40%"])
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), C_DARK),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING", (0, 0), (0, -1), 12),
        ("RIGHTPADDING", (-1, 0), (-1, -1), 12),
        ("ROUNDEDCORNERS", [6]),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 5*mm))

    # ── INFO MATCH ────────────────────────────────────────────────────────────
    player_name  = data.get("player_name", "Player")
    opp_name     = data.get("opponent_name", "Opponent")
    tournament   = data.get("tournament", "Match")
    surface      = data.get("surface", "Hard")
    match_type   = data.get("match_type", "BO3")
    match_date   = data.get("date", "")
    sets_me      = data.get("sets_me", 0)
    sets_opp     = data.get("sets_opp", 0)
    total_pts    = data.get("total_points", 0)
    svc_pct      = data.get("svc_pct", 0)
    rtn_pct      = data.get("rtn_pct", 0)
    first_pct    = data.get("first_pct", 0)
    second_pct   = data.get("second_pct", 0)
    recorded     = data.get("recorded_points", [])

    story.append(Paragraph(tournament, s["h1"]))
    info_data = [
        [Paragraph("Giocatore", s["label"]), Paragraph(player_name, s["h3"]),
         Paragraph("Avversario", s["label"]), Paragraph(opp_name, s["h3"])],
        [Paragraph("Superficie", s["label"]), Paragraph(surface, s["body"]),
         Paragraph("Formato", s["label"]), Paragraph(match_type, s["body"])],
        [Paragraph("Data", s["label"]), Paragraph(match_date or "—", s["body"]),
         Paragraph("Punti registrati", s["label"]), Paragraph(str(total_pts), s["body"])],
    ]
    info_table = Table(info_data, colWidths=["22%", "28%", "22%", "28%"])
    info_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), C_LIGHT_BG),
        ("GRID", (0, 0), (-1, -1), 0.3, C_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(info_table)
    _hr(story)

    # ── RISULTATO FINALE ──────────────────────────────────────────────────────
    story.append(Paragraph("Risultato Finale", s["h2"]))
    winner = player_name if sets_me > sets_opp else opp_name
    score_data = [[
        Paragraph(player_name, ParagraphStyle("pn", fontSize=13, fontName="Helvetica-Bold",
                                               textColor=C_DARK, alignment=TA_CENTER)),
        Paragraph(f"{sets_me}", ParagraphStyle("sc", fontSize=36, fontName="Helvetica-Bold",
                                                 textColor=C_SUCCESS if sets_me > sets_opp else C_ERROR,
                                                 alignment=TA_CENTER)),
        Paragraph("–", ParagraphStyle("dash", fontSize=24, fontName="Helvetica",
                                        textColor=C_FOG, alignment=TA_CENTER)),
        Paragraph(f"{sets_opp}", ParagraphStyle("sc2", fontSize=36, fontName="Helvetica-Bold",
                                                   textColor=C_ERROR if sets_me > sets_opp else C_SUCCESS,
                                                   alignment=TA_CENTER)),
        Paragraph(opp_name, ParagraphStyle("on", fontSize=13, fontName="Helvetica-Bold",
                                             textColor=C_DARK, alignment=TA_CENTER)),
    ]]
    score_table = Table(score_data, colWidths=["28%", "16%", "12%", "16%", "28%"])
    score_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), C_LIGHT_BG),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("BOX", (0, 0), (-1, -1), 0.5, C_BORDER),
    ]))
    story.append(score_table)
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(
        f"Vincitore: <b>{winner}</b>",
        ParagraphStyle("w", fontSize=10, fontName="Helvetica", textColor=C_GRAPHITE, alignment=TA_CENTER)
    ))
    _hr(story)

    # ── STATISTICHE ───────────────────────────────────────────────────────────
    story.append(Paragraph("Statistiche di Rendimento", s["h2"]))
    stats_data = [
        ["Metrica", "Valore", "Benchmark ATP"],
        ["Punti vinti al servizio", f"{svc_pct:.0f}%", "65–75%"],
        ["Punti vinti in risposta", f"{rtn_pct:.0f}%", "30–45%"],
        ["Punti vinti con la prima", f"{first_pct:.0f}%", "70–80%"],
        ["Punti vinti con la seconda", f"{second_pct:.0f}%", "45–55%"],
    ]
    stats_table = Table(stats_data, colWidths=["55%", "22%", "23%"])
    stats_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), C_GRAPHITE),
        ("TEXTCOLOR", (0, 0), (-1, 0), C_WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [C_WHITE, C_LIGHT_BG]),
        ("GRID", (0, 0), (-1, -1), 0.3, C_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (0, -1), 8),
    ]))
    story.append(stats_table)
    _hr(story)

    # ── DISTRIBUZIONE PATTERN ─────────────────────────────────────────────────
    if recorded:
        from collections import Counter
        pattern_counts = Counter(
            pt.get("macroPattern") for pt in recorded if pt.get("macroPattern")
        )
        top_patterns = pattern_counts.most_common(5)

        story.append(Paragraph("Pattern di Gioco Dominanti", s["h2"]))
        pts_with_pattern = sum(pattern_counts.values())

        pattern_data = [["Pattern", "Frequenza", "% sul totale"]]
        for pname, cnt in top_patterns:
            pct = (cnt / pts_with_pattern * 100) if pts_with_pattern > 0 else 0
            pattern_data.append([_pattern_label(pname), str(cnt), f"{pct:.1f}%"])

        pat_table = Table(pattern_data, colWidths=["60%", "20%", "20%"])
        pat_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), C_DARK),
            ("TEXTCOLOR", (0, 0), (-1, 0), C_WHITE),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [C_WHITE, C_LIGHT_BG]),
            ("GRID", (0, 0), (-1, -1), 0.3, C_BORDER),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (0, -1), 8),
        ]))
        story.append(pat_table)
        _hr(story)

    # ── WIN PROBABILITY ────────────────────────────────────────────────────────
    probs = [
        pt.get("modelPointWinProbability")
        for pt in recorded
        if pt.get("modelPointWinProbability") is not None
    ]
    if probs:
        avg_p = sum(probs) / len(probs)
        high_p = max(probs)
        low_p = min(probs)
        last_p = probs[-1]

        story.append(Paragraph("Win Probability (Modello XGBoost)", s["h2"]))
        wp_data = [
            ["Metrica", "Valore"],
            ["Attuale (ultimo punto)", f"{last_p * 100:.1f}%"],
            ["Massima del match", f"{high_p * 100:.1f}%"],
            ["Minima del match", f"{low_p * 100:.1f}%"],
            ["Media del match", f"{avg_p * 100:.1f}%"],
        ]
        wp_table = Table(wp_data, colWidths=["70%", "30%"])
        wp_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), C_GRAPHITE),
            ("TEXTCOLOR", (0, 0), (-1, 0), C_WHITE),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [C_WHITE, C_LIGHT_BG]),
            ("GRID", (0, 0), (-1, -1), 0.3, C_BORDER),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (0, -1), 8),
        ]))
        story.append(wp_table)
        _hr(story)

    # ── ULTIME RACCOMANDAZIONI TATTICHE ─────────────────────────────────────────
    tac_calls = [
        pt.get("tacticalCall")
        for pt in reversed(recorded)
        if pt.get("tacticalCall")
    ][:5]

    if tac_calls:
        story.append(Paragraph("Ultime Raccomandazioni Tattiche (AI)", s["h2"]))
        for i, call in enumerate(tac_calls, 1):
            story.append(Paragraph(
                f"<b>{i}.</b> {call}",
                ParagraphStyle("tac", fontSize=9, fontName="Helvetica",
                                textColor=C_GRAPHITE, spaceAfter=4, leading=13,
                                leftIndent=10)
            ))
        _hr(story)

    # ── FOOTER ───────────────────────────────────────────────────────────────
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph(
        "Generato da <b>TennisAI Pro</b> — Analisi tattica live con XGBoost",
        ParagraphStyle("footer", fontSize=8, fontName="Helvetica",
                        textColor=C_FOG, alignment=TA_CENTER)
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()
