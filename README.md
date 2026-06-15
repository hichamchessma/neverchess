# ♟ GAMBIT — le coach qui vit tes parties et les transforme en histoires

MVP web d'un jeu d'échecs avec un **coach IA à personnalité** qui te parle pendant
la partie (voix + texte, réactions émotionnelles à ton jeu), et qui à la fin
génère **la story partageable** de ton moment fort — pensée pour la viralité
(TikTok / Stories / Shorts).

## L'idée
1. Tu joues contre Stockfish.
2. Le coach (Le Sergent / Maître Zen / Il Maestro) réagit à chaque coup :
   gaffe, coup brillant, panique, retournement… avec sa propre voix.
3. À la fin, il repère ton **moment fort** (plus gros swing d'évaluation) et le
   transforme en image verticale 1080×1920 prête à partager, avec narration,
   stats (précision, brillants) et watermark GAMBIT.

C'est la boucle : la story ramène du monde (acquisition virale) + le coach
attache émotionnellement (rétention → abonnement).

## Stack
- **Vite + React + TypeScript**
- **chess.js** — règles et légalité
- **react-chessboard** (v5) — échiquier
- **Stockfish (WASM, single-thread)** dans un Web Worker — adversaire + analyse
- **Web Speech API** — voix du coach (gratuite, offline)
- **Framer Motion** — animations
- **Canvas 2D** — génération de la story partageable (aucune dépendance externe)

## Lancer
```bash
npm install
npm run dev      # http://localhost:5173
```

## Architecture
```
src/
  engine/stockfish.ts      Wrapper UCI async autour du worker Stockfish
  game/useGambitGame.ts    Orchestrateur : chess.js + moteur + coach + éval
  coach/
    personas.ts            3 personnalités + leurs répliques
    coachBrain.ts          Classification des coups + choix des répliques
    voice.ts               Synthèse vocale (Web Speech API)
    types.ts
  story/
    momentDetector.ts      Détection du moment fort (courbe d'éval)
    storyImage.ts          Rendu canvas de la story 9:16
  components/              UI : board, eval bar, coach panel, move list, start, story
```

## Pistes "next" (post-MVP)
- Voix premium (ElevenLabs) en tier payant ; voix native = gratuit.
- Coach branché sur l'API Claude pour des répliques dynamiques et contextuelles.
- Story animée (vidéo MP4 via Remotion) + feed vertical interne.
- Multijoueur, comptes, abonnement, ligues.
- Wrapper React Native / Expo pour Android.
