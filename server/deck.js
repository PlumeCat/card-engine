// deck.js

import Cards from "./cards.js"

export default [
    ...Array(4).fill(Cards.CAT_RAINBOW),
    ...Array(4).fill(Cards.CAT_BEARD),
    ...Array(4).fill(Cards.CAT_POTATO),
    ...Array(4).fill(Cards.CAT_TACO),
    ...Array(4).fill(Cards.CAT_MELON),

    ...Array(4).fill(Cards.ATTACK),
    ...Array(4).fill(Cards.SKIP),
    ...Array(4).fill(Cards.FAVOUR),
    ...Array(4).fill(Cards.SHUFFLE),

    ...Array(5).fill(Cards.NOPE),
    ...Array(5).fill(Cards.SEE_FUTURE),

    ...Array(6).fill(Cards.DEFUSE),
    ...Array(3).fill(Cards.BOMB),
]
