import csv
import json
import os

filename = '/Users/giovannigraziano/Desktop/tennisai-pro/live_match_sess_1776434270933_4751_2026-04-17T1759.csv'

if not os.path.exists(filename):
    print("File not found")
    exit()

with open(filename, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    print("Fields found:", reader.fieldnames)
    
    tactical_fields = [
        'isPlayerOnServe', 'rallyCount', 
        'isBreakPoint', 'isGamePoint', 'isGamePointAgainst',
        'momentumLast5', 'modelPointWinProbability',
        'tacticalCall', 'tacticalConfidence', 'tacticalExplanation', 'riskLevel'
    ]
    
    # Check what fields we actually have
    fields_to_print = [f for f in tactical_fields if f in reader.fieldnames]
    
    print("\n--- SAMPLE ROWS ---")
    for i, row in enumerate(reader):
        if i >= 5: # Just print first 5 points
            break
        print(f"Point {i+1}:")
        for field in fields_to_print:
            print(f"  {field}: {row.get(field)}")
        print()

