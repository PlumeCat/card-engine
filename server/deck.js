// deck.js

import Cards from "./cards.js"

const DEFAULT_DECK = [
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


export const shuffle = (deck) => {
    const newDeck = deck.slice()
    for (let i = 0; i < deck.length; i++) {
        const j = i + Math.floor(Math.random() * (deck.length - i))
        const buf = newDeck[i]
        newDeck[i] = newDeck[j]
        newDeck[j] = buf
    }
    return newDeck
}

export const dealCards = () => {
    // shuffle the default deck and deal cards
    // returns [ [ hands... ], remainder ]
    // each hand has at least 1 defuse, and 3 bombs in remainder

    // remove all bombs and all but 2 defuses, and shuffle
    let deck = DEFAULT_DECK.filter(c => c != Cards.DEFUSE && c != Cards.BOMB)
    deck.push(Cards.DEFUSE, Cards.DEFUSE) // add 2 defuses back in
    deck = shuffle(deck)
    const hands = [ [Cards.DEFUSE], [Cards.DEFUSE], [Cards.DEFUSE], [Cards.DEFUSE] ]
    
    // deal each hand 7 cards (they already had a defuse, so 6 each)
    for (let hand of hands) {
        while (hand.length < 7) {
            hand.push(deck.shift())
        }
    }

    // shuffle the remainder again
    const remainder = shuffle([ ...deck, Cards.BOMB, Cards.BOMB, Cards.BOMB ])

    return [ hands.map(hand => shuffle(hand)), remainder ]
}
