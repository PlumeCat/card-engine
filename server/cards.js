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

const shortCardNames = {
    "CAT_RAINBOW": "RAI",
    "CAT_BEARD": "BEA",
    "CAT_TACO": "TAC",
    "CAT_MELON": "MEL",
    "CAT_POTATO": "POT",

    "ATTACK": "ATT",
    "SKIP": "SKI",
    "FAVOUR": "FAV",
    "SHUFFLE": "SHU",

    "NOPE": "NOP",
    "SEE_FUTURE": "FUT",

    "DEFUSE": "DEF",
    "BOMB": "BOM",
}

export const getShortCardName = card => shortCardNames[card.name]

export const getCardInnerHtml = card => `<div class="fuCardInner">${card.displayName || card.name.replace('_', ' ')}</div>`

export default cardNames.reduce((obj, entry, index) => {
    obj[entry] = {
        name: entry,
        value: index
    }
    return obj
}, {})
