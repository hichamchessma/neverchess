import type { Persona } from "./types";

// Three distinct coach personalities. Lines are intentionally short and punchy —
// they are spoken aloud AND become the narration of the shareable story.
export const PERSONAS: Persona[] = [
  {
    id: "sergent",
    name: "Le Sergent",
    tagline: "Dur mais juste. Il te pousse à fond.",
    emoji: "🎖️",
    accent: "#fb923c",
    voice: { rate: 1.02, pitch: 0.95, lang: "fr-FR" },
    lines: {
      gameStart: [
        { text: "Debout soldat. On joue pour gagner, pas pour participer.", mood: "hype" },
        { text: "Pas d'excuses aujourd'hui. Concentre-toi sur chaque coup.", mood: "hype" },
      ],
      brilliant: [
        { text: "ÇA c'est un coup ! Je savais que tu l'avais en toi.", mood: "proud" },
        { text: "Magnifique. Garde cette intensité, lâche rien.", mood: "proud" },
      ],
      great: [
        { text: "Bien joué. Voilà le niveau que j'attends de toi.", mood: "proud" },
        { text: "Solide. Tu commences à réfléchir comme un vrai joueur.", mood: "hype" },
      ],
      inaccuracy: [
        { text: "Mouais. Pas terrible, mais on continue. Reste concentré.", mood: "warn" },
        { text: "Tu peux mieux faire. Regarde tout l'échiquier.", mood: "warn" },
      ],
      mistake: [
        { text: "Erreur. Tu as joué trop vite ? Reprends-toi.", mood: "warn" },
        { text: "Non. Ce coup affaiblit ta position. Sois plus rigoureux.", mood: "warn" },
      ],
      blunder: [
        { text: "Qu'est-ce que c'était que ça, soldat ?! Concentre-toi !", mood: "warn" },
        { text: "Gaffe énorme. Respire. On ne lâche pas la partie pour autant.", mood: "tense" },
      ],
      impulse: [
        { text: "Tu as joué en deux secondes et ça t'a coûté cher. Ralentis !", mood: "warn" },
        { text: "L'impulsivité, c'est ton ennemi. Compte jusqu'à trois avant de jouer.", mood: "warn" },
      ],
      spiral: [
        { text: "Deux erreurs de suite. STOP. Respire et recommence à zéro.", mood: "tense" },
        { text: "Tu pars en vrille. Reprends le contrôle, maintenant.", mood: "tense" },
      ],
      comeback: [
        { text: "VOILÀ ! C'est comme ça qu'on revient dans une partie !", mood: "hype" },
        { text: "Tu as renversé la vapeur. Ça, c'est du mental.", mood: "proud" },
      ],
      givingCheck: [
        { text: "Échec ! Mets-le sous pression, ne le laisse pas respirer.", mood: "hype" },
      ],
      underThreat: [
        { text: "Attention, il prépare quelque chose. Reste sur tes gardes.", mood: "tense" },
      ],
      winning: [
        { text: "Tu domines. Maintenant, termine le travail sans te relâcher.", mood: "hype" },
      ],
      losing: [
        { text: "C'est dur, mais un soldat ne baisse jamais les bras. Bats-toi.", mood: "tense" },
      ],
      winMate: [
        { text: "ÉCHEC ET MAT ! Voilà le résultat du travail. Fier de toi.", mood: "proud" },
      ],
      loseMate: [
        { text: "Mat. On encaisse, on apprend, on revient plus fort. Debout.", mood: "calm" },
      ],
      draw: [
        { text: "Nulle. Tu as tenu bon. La prochaine, on vise la victoire.", mood: "calm" },
      ],
    },
  },
  {
    id: "zen",
    name: "Maître Zen",
    tagline: "Calme, patient, il t'apprend à respirer.",
    emoji: "🧘",
    accent: "#34d399",
    voice: { rate: 0.95, pitch: 1.02, lang: "fr-FR" },
    lines: {
      gameStart: [
        { text: "Respire. Une partie d'échecs, c'est cent petites décisions calmes.", mood: "calm" },
        { text: "Pas de précipitation. Observe, puis joue.", mood: "calm" },
      ],
      brilliant: [
        { text: "Superbe. Tu as vu ce que les autres ne voient pas.", mood: "proud" },
        { text: "Un coup d'une grande beauté. Savoure-le.", mood: "proud" },
      ],
      great: [
        { text: "Très bon choix. Ton plan prend forme tranquillement.", mood: "calm" },
        { text: "Joli. Tu joues avec clarté.", mood: "proud" },
      ],
      inaccuracy: [
        { text: "Une petite imprécision. Ce n'est rien, recentre-toi.", mood: "calm" },
        { text: "Pas le coup idéal, mais reste serein. Continue.", mood: "calm" },
      ],
      mistake: [
        { text: "Une erreur s'est glissée là. Respire, et regarde à nouveau.", mood: "warn" },
        { text: "Ce coup fragilise ton plan. Ralentis ton esprit.", mood: "warn" },
      ],
      blunder: [
        { text: "Une grosse erreur. Mais le calme est ta force. Tout n'est pas perdu.", mood: "warn" },
        { text: "Ça arrive à tout le monde. Laisse passer l'émotion, et concentre-toi.", mood: "calm" },
      ],
      impulse: [
        { text: "Tu as joué trop vite. La patience t'aurait montré un meilleur chemin.", mood: "warn" },
        { text: "Le temps est ton allié. Prends-le.", mood: "calm" },
      ],
      spiral: [
        { text: "Deux erreurs. C'est le moment de fermer les yeux une seconde et de revenir au présent.", mood: "tense" },
        { text: "Ne te juge pas. Reviens simplement à la position devant toi.", mood: "calm" },
      ],
      comeback: [
        { text: "Tu as retrouvé ton équilibre. La rivière coule à nouveau dans ton sens.", mood: "hype" },
        { text: "Beau retour. Le calme paie toujours.", mood: "proud" },
      ],
      givingCheck: [
        { text: "Échec. Doucement, sans t'emballer.", mood: "calm" },
      ],
      underThreat: [
        { text: "Une menace se forme. Observe-la sans peur.", mood: "tense" },
      ],
      winning: [
        { text: "Tu es devant. Reste humble, et finis avec précision.", mood: "calm" },
      ],
      losing: [
        { text: "La position est difficile. Joue chaque coup comme s'il était le seul.", mood: "tense" },
      ],
      winMate: [
        { text: "Échec et mat. Une victoire née du calme. Bravo.", mood: "proud" },
      ],
      loseMate: [
        { text: "Mat. Chaque défaite est une leçon. Tu en sors plus sage.", mood: "calm" },
      ],
      draw: [
        { text: "Une nulle équilibrée. L'harmonie a son charme.", mood: "calm" },
      ],
    },
  },
  {
    id: "maestro",
    name: "Il Maestro",
    tagline: "Théâtral, drôle, il met le show.",
    emoji: "🎭",
    accent: "#a78bfa",
    voice: { rate: 1.0, pitch: 1.1, lang: "fr-FR" },
    lines: {
      gameStart: [
        { text: "Mesdames et messieurs, le rideau se lève ! Que le spectacle commence.", mood: "hype" },
        { text: "Ah, une nouvelle partie ! J'adore l'odeur d'une bataille au matin.", mood: "hype" },
      ],
      brilliant: [
        { text: "BRAVISSIMO ! Un coup digne des plus grands. Chef-d'œuvre !", mood: "hype" },
        { text: "Magnifico ! Le public se lève. Tu viens de signer une œuvre d'art !", mood: "proud" },
      ],
      great: [
        { text: "Ohhh, quel goût ! Un coup élégant, je l'applaudis.", mood: "proud" },
        { text: "Très joli. Tu as du style, ça me plaît.", mood: "hype" },
      ],
      inaccuracy: [
        { text: "Hmm... une fausse note. Mais l'orchestre continue.", mood: "warn" },
        { text: "Petit couac. Rien de dramatique, reprends ta partition.", mood: "calm" },
      ],
      mistake: [
        { text: "Aïe. Le critique dans ma tête fronce les sourcils.", mood: "warn" },
        { text: "Une erreur ! Le drame s'invite sur scène...", mood: "tense" },
      ],
      blunder: [
        { text: "MAMMA MIA ! Quelle catastrophe ! Le public retient son souffle !", mood: "tense" },
        { text: "Oh non, non, non ! Un faux pas spectaculaire. Quel suspense !", mood: "tense" },
      ],
      impulse: [
        { text: "Trop vite ! Un artiste ne se précipite jamais sur sa toile.", mood: "warn" },
        { text: "Du calme, virtuose. La précipitation tue la beauté.", mood: "warn" },
      ],
      spiral: [
        { text: "Deux fausses notes de suite ! L'orchestre déraille, ressaisis-toi !", mood: "tense" },
        { text: "Le deuxième acte tourne au drame... Renverse la situation !", mood: "tense" },
      ],
      comeback: [
        { text: "INCROYABLE retournement ! Le héros se relève ! Standing ovation !", mood: "hype" },
        { text: "Quel rebondissement ! Voilà pourquoi j'aime ce jeu !", mood: "proud" },
      ],
      givingCheck: [
        { text: "Échec ! Le roi tremble sur son trône !", mood: "hype" },
      ],
      underThreat: [
        { text: "Suspense... l'adversaire affûte ses lames. Attention !", mood: "tense" },
      ],
      winning: [
        { text: "Tu mènes la danse ! Maintenant, le final en apothéose.", mood: "hype" },
      ],
      losing: [
        { text: "Le héros est au pied du mur... mais les meilleurs récits ont des rebonds !", mood: "tense" },
      ],
      winMate: [
        { text: "ÉCHEC ET MAT ! Rideau ! Le public est debout, BRAVISSIMO !", mood: "hype" },
      ],
      loseMate: [
        { text: "Mat... La tragédie est belle aussi. La revanche n'attend que toi.", mood: "calm" },
      ],
      draw: [
        { text: "Match nul ! Un duel équilibré, digne d'un grand opéra.", mood: "calm" },
      ],
    },
  },
];

export function getPersona(id: string) {
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];
}
