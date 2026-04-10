# Percentile Distribution Analysis

**Branch:** feat/percentile-viz-exploration
**Date:** 2026-04-10
**Source:** live production Supabase (ideas.status='active')

## Dataset

- Total active ideas: **1000**
- Score range: **3.5** → **5.46998856651968**
- Unique scores: **997** (99.7% unique)

## Tier Distribution (midrank getPercentile + current formatPercentileLabel)

| Tier | Count | % | Bar |
|------|-------|---|-----|
| Top 10% | 105 | 10.5% | `████` |
| Top 25% | 150 | 15.0% | `██████` |
| Average | 350 | 35.0% | `██████████████` |
| Below Avg | 250 | 25.0% | `██████████` |
| Bottom 15% | 145 | 14.5% | `██████` |

### Synthetic test baseline (from shipping PR)

The synthetic uniform-ish test showed: 11% / 15% / 35% / 25% / 14%

## Score Histogram (20 buckets)

```
    3.5-    3.6      4  
    3.6-    3.7      0  
    3.7-    3.8      0  
    3.8-    3.9      0  
    3.9-    4.0      0  
    4.0-    4.1      0  
    4.1-    4.2      0  
    4.2-    4.3      0  
    4.3-    4.4      0  
    4.4-    4.5      0  
    4.5-    4.6      0  
    4.6-    4.7      0  
    4.7-    4.8      0  
    4.8-    4.9      0  
    4.9-    5.0      0  
    5.0-    5.1      0  
    5.1-    5.2      0  
    5.2-    5.3     36  ██
    5.3-    5.4    341  ██████████████████████
    5.4-    5.5    619  ████████████████████████████████████████
```

## Representative Ideas Across Tiers

| Percentile | Score | Tier | Title |
|-----------:|------:|------|-------|
| 5 | 5.27525837439005 | Bottom 15% | Phone Distraction Blocker |
| 20 | 5.28348356073264 | Below Avg | Simple Data Visualization Tool |
| 35 | 5.28388766258449 | Below Avg | Enterprise Prototype Quality Validator |
| 50 | 5.46811894267708 | Average | Global Street View Canvas |
| 65 | 5.46818890216782 | Average | Mental Health Check-In Tracker |
| 80 | 5.46826943226042 | Top 25% | Noodles – Codebase-to-Diagram Visualization |
| 92 | 5.46834165448264 | Top 10% | Juttu - Bluesky-Powered Blog Comments |
| 98 | 5.46837832114931 | Top 10% | Offline AI Web Browser & Tools |
