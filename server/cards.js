// cards.js

const cardNames = [
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

export default cardNames.reduce((obj, entry, index) => {
    obj[entry] = {
        name: entry,
        value: index
    }
    return obj
}, {})
