import type { CharacterOption } from "./types";

export const SF6_CHARACTERS: CharacterOption[] = [
  { id: "luke", name: "Luke", released: true },
  { id: "jamie", name: "Jamie", released: true },
  { id: "manon", name: "Manon", released: true },
  { id: "kimberly", name: "Kimberly", released: true },
  { id: "marisa", name: "Marisa", released: true },
  { id: "lily", name: "Lily", released: true },
  { id: "jp", name: "JP", released: true },
  { id: "juri", name: "Juri", released: true },
  { id: "deejay", name: "Dee Jay", released: true },
  { id: "cammy", name: "Cammy", released: true },
  { id: "ryu", name: "Ryu", released: true },
  { id: "ehonda", name: "E. Honda", released: true },
  { id: "blanka", name: "Blanka", released: true },
  { id: "guile", name: "Guile", released: true },
  { id: "ken", name: "Ken", released: true },
  { id: "chun-li", name: "Chun-Li", released: true },
  { id: "zangief", name: "Zangief", released: true },
  { id: "dhalsim", name: "Dhalsim", released: true },
  { id: "rashid", name: "Rashid", released: true },
  { id: "aki", name: "A.K.I.", released: true },
  { id: "ed", name: "Ed", released: true },
  { id: "akuma", name: "Akuma", released: true },
  { id: "mbison", name: "M. Bison", released: true },
  { id: "terry", name: "Terry", released: true },
  { id: "mai", name: "Mai", released: true },
  { id: "elena", name: "Elena", released: true }
];

export function getCharacterNames(): string[] {
  return SF6_CHARACTERS.map((character) => character.name);
}
