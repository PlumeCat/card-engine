// cards.js
/*
cat-rainbow x4
cat-beard x4
cat-taco x4
cat-melon x4
cat-potato x4
attack +2 x4
shuffle x4
skip x4
favour (get given a card) x4
nope x5
see-the-future x5
defuse x6
bomb x3

<!-- Nyan cat? -->
<!-- Grenade cat? Possibly overpowered -->
Combos:
    2x same: pick another players card (hidden)
    3x same: nominate player + card
    5x different: pick from discarded
*/

const Cards = [
    "CAT_RAINBOW",
    "CAT_BEARD",
    "CAT_TACO",
    "CAT_MELON",
    "CAT_POTATO",

    "ATTACK",
    "SKIP",
    "FAVOUR",
    "SHUFFLE",

    "NOPE",
    "SEE_FUTURE",

    "DEFUSE",
    "BOMB"
]

module.exports = Cards.reduce((obj, entry, index) => {
    obj[entry] = index
    return obj
}, {})

