export interface NinjaStyle {
  name: string;
  description: string;
  kind: "ninja" | "smoke";
  rank: number;
  suit: string;
  accent: string;
  bg: string;
  fg: string;
}

// Each rank has its own headband, insignia, and colour palette.
const RANKS = [
  ["Rookie", "Every legend starts with a first step. Your training begins here.", "#65758b", "#e7edf5", "#e8edf4", "#35445b"],
  ["Apprentice", "A white headband and a promise to keep practising.", "#334967", "#ffffff", "#dbe8f7", "#29466b"],
  ["Scout", "Quick feet and sharp eyes. Always one move ahead.", "#276d65", "#8ee1c4", "#d7f1e9", "#20594c"],
  ["Shinobi", "A silent guardian learning the art of the shadows.", "#3d5292", "#a6bdff", "#e0e6ff", "#344784"],
  ["Night Blade", "A flash of steel beneath the moonlight.", "#554478", "#c1acee", "#ebe2f7", "#554078"],
  ["Wind Runner", "Light as a leaf, fast as a mountain breeze.", "#257f8a", "#91edf2", "#d5f2f5", "#246570"],
  ["Shadow", "A master of quiet movement. Seen only when it is too late.", "#374151", "#b9c7da", "#dce2ea", "#374151"],
  ["Crimson Fang", "A fearless fighter with a scarlet headband.", "#923a51", "#ff9ba7", "#fbe0e5", "#852f45"],
  ["Storm Guard", "Steady in the thunder, swift as lightning.", "#345c95", "#9fceff", "#dcecff", "#2b5188"],
  ["Dragon Fist", "The spirit of a dragon lives in every move.", "#ae542d", "#ffc17d", "#ffe5ce", "#91451f"],
  ["Sensei", "You have reached 2048. The student has become the master!", "#8d641e", "#ffe39b", "#fff0bd", "#755113"],
  ["Shadow Master", "Beyond the dojo, your legend is only beginning.", "#633b88", "#d4a4ff", "#eadbf9", "#623687"],
  ["Moon Walker", "A silver guardian watching over the sleeping world.", "#426d83", "#d7f6ff", "#dfedf5", "#375b72"],
  ["Phoenix", "Rise again with the strength of a thousand sparks.", "#b54235", "#ffd276", "#ffe1d8", "#92392b"],
  ["Dragon Lord", "The ancient clans bow to your unmatched skill.", "#38435b", "#7ee4d0", "#202c3c", "#a1f3de"],
  ["Golden Ninja", "A rare warrior whose name is written in gold.", "#8f671c", "#ffe591", "#302940", "#ffe591"],
  ["Immortal", "The ultimate ninja. Your legend will never fade.", "#60479b", "#f3c7ff", "#272139", "#f3c7ff"],
] as const;

export const NINJA_LIST: (NinjaStyle & { value: number })[] = RANKS.map(
  ([name, description, suit, accent, bg, fg], rank) => ({
    value: 2 ** (rank + 1), name, description, kind: "ninja", rank, suit, accent, bg, fg,
  }),
);

export const MAX_DEFINED = 131072;

export const SMOKE_STYLE: NinjaStyle = {
  name: "Smoke Bomb",
  description: "A little ninja magic. Merges with any ninja and doubles its value.",
  kind: "smoke", rank: 0, suit: "#59467a", accent: "#dbc1ff", bg: "#ede2fa", fg: "#63458a",
};

export function ninjaFor(value: number): NinjaStyle {
  return NINJA_LIST.find((ninja) => ninja.value === value) ?? NINJA_LIST[NINJA_LIST.length - 1];
}
