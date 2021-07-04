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

export const getShortCardName = cardName => shortCardNames[cardName] //.split('_').pop().substr(0, 3)

export const getCardInnerHtml = c => `<div class="fuCardInner">${c.displayName || c.name.replace('_', ' ')}</div>`

export default cardNames.reduce((obj, entry, index) => {
    obj[entry] = {
        name: entry,
        value: index
    }
    return obj
}, {})
