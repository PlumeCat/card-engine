import Cards from "./cards"
import { shuffle } from "./deck"


const getNextAlivePlayerIndex = (game, playerId) => {
    let index = game.players.indexOf(p => p.playerId == playerId)
    while (true) {
        index = (index + 1) % 4
        if (game.players[index].alive) {
            return index
        }
        if (game.players[index].playerId == playerId) {
            // back to self.. next alive player is self
            return -1
        }
    }
}

const isCatCard = card => [
    Cards.CAT_TACO,
    Cards.CAT_MELON,
    Cards.CAT_RAINBOW,
    Cards.CAT_BEARD,
    Cards.CAT_POTATO
].includes(card)


export const TurnStates = {
    START: (params, game, nextAction) => {
        const playerIndex = game.players.findIndex(p => p.playerId == params.playerId)
        const action = params.action
        if (!action) {
            throw
        }
        if (action == "play") {
            if (game.playerTurn != playerIndex) {
                throw
            }
            const hand = game.hands[game.players[playerIndex].handIndex]
            if (params.cardIndices.length == 1) {
                // skip, future, attack, favour, shuffle
                const card = hand[params.cardIndices[0]]
                if (card == Cards.SKIP) {
                    // discard the card
                    game.discard.push(...hand.splice(params.cardIndices[0], 1))
                    return "PLAYING_SKIP"
                } else if (card == Cards.SEEING_FUTURE) {
                    // discard the card
                    game.discard.push(...hand.splice(params.cardIndices[0], 1))
                    return "PLAYING_SEEING_FUTURE" // and then in 5 seconds, return "SEEING_FUTURE" (unless noped!)
                } else if (card == Cards.ATTACK) {
                    // discard the card
                    game.discard.push(...hand.splice(params.cardIndices[0], 1))
                    return "PLAYING_ATTACK"
                } else if (card == Cards.SHUFFLE) {
                    // discard dis card
                    game.discard.push(...hand.splice(params.cardIndices[0], 1))
                    return "PLAYING_SHUFFLE"
                } else if (card == Cards.FAVOUR) {
                    // remoof!
                    game.discard.push(...hand.splice(params.cardIndices[0], 1))
                    return "PLAYING_FAVOUR"
                } else {
                    throw
                }
            } else if (params.cardIndices.length == 2) {
                const cards = params.cardIndices.map(i => hand[i])
                if (cards[0] != cards[1]) {
                    throw
                }
                if (!isCatCard(cards[0])) {
                    throw
                }
                // discard cards
                params.cardIndices.forEach(i => game.discard.push(hand[i]))
                game.hands[game.players[playerIndex].handIndex] = hand.filter((c, i) => !params.cardIndices.includes(i))
                return "PLAYING_COMBO2"
            } else if (params.cardIndices.length == 3) {
                const cards = params.cardIndices.map(i => hand[i])
                if (cards[0] != cards[1] || cards[0] != cards[2]) {
                    throw
                }
                if (!isCatCard(cards[0])) {
                    throw
                }
                // discard cards
                params.cardIndices.forEach(i => game.discard.push(hand[i]))
                game.hands[game.players[playerIndex].handIndex] = hand.filter((c, i) => !params.cardIndices.includes(i))
                return "PLAYING_COMBO3"
            } else if (params.cardIndices.length == 5) {
                const cards = params.cardIndices.map(i => hand[i])
                if ((new Set(cards)).size != 5) {
                    throw
                }
                params.cardIndices.forEach(i => game.discard.push(hand[i]))
                game.hands[game.players[playerIndex].handIndex] = hand.filter((c, i) => !params.cardIndices.includes(i))
                return "PLAYING_COMBO5"
            } else {
                throw
            }
        } else if (action == "pick") {
            const card = game.remainder.shift()
            if (card == Cards.BOMB) {
                const defusePos = hand.indexOf(Cards.DEFUSE)
                if (defusePos != -1) {
                    hand.splice(defusePos, 1)
                    game.discard.push(Cards.DEFUSE)
                    return "DEFUSING"
                } else {
                    game.discard.push(Cards.BOMB)
                    game.players[playerIndex].alive = false
                    return "END"
                }
            } else {
                hand.push(card)
                return "END"
            }
        } else {
            throw
        }
    },
    PLAYING_SEEING_FUTURE: (params, game) => {
        const action = params.action
        if (action == "timer") {
            return "SEEING_FUTURE"
        }
    },
    PLAYING_SKIP: (params, game) => {
        const action = params.action
        if (action == "timer") {
            return "END"
        }
    },
    PLAYING_ATTACK: (params, game) => {
        const action = params.action
        const playerId = params.playerId
        if (action == "timer") {
            // attack happened
            const index = getNextAlivePlayerIndex(game, playerId)
            game.attackedId = game.players[index].playerId
            return "END"
        }
    },
    PLAYING_FAVOUR: (params, game) => {
        const action = params.action
        const playerId = params.playerId
        if (action == "clicked-player") {
            // save this player as the target player
            game.targetPlayerId = params.targetPlayerId
            return "FAVOUR_RECEVING"
        }
    },
    PLAYING_SHUFFLE: (params, game) => {
        const action = params.action
        if (action == "timer") {
            return "SHUFFLING"
        }
    },
    PLAYING_COMBO2: (params, game) => {
        const action = params.action
        if (action == "clicked-player") {
            // save this player as the target player
            game.targetPlayerId = params.targetPlayerId
            return "COMBO2_STEALING"
        }
    },
    PLAYING_COMBO3: (params, game) => {
        const action = params.action
        if (action == "clicked-player") {
            // save this player as the target player
            game.targetPlayerId = params.targetPlayerId
            return "COMBO3_NOMINATING"
        }
    },
    PLAYING_COMBO5: (params, game) => {
        const action = params.action
        if (action == "timer") {
            return "COMBO5_RECLAIMING"
        }
    },
    
    SEEING_FUTURE: (params, game) => {
        const action = params.action
        if (action == "timer") {
            return "START"
        }
    },
    COMBO2_STEALING: (params, game) => {
        const action = params.action
        if (action == "clicked-card") {
            // remove clicked card from target player's hand, put into current player's hand
            const target = game.players.find(p => p.playerId == game.targetPlayerId)
            const player = game.players.find(p => p.playerId == params.playerId)
            const card = game.hands[target.handIndex].splice(params.targetCardIndex, 1)[0]
            game.hands[player.handIndex].push(card)
            return "START"
        }
    },
    COMBO3_NOMINATING: (params, game) => {
        const action = params.action
        if (action == "clicked-card") {
            // clicked a card type in the "which card to nominate" popup
            // transfer from targeted player's hand if they have one
            const targetCard = params.targetCard
            const target = game.players.find(p => p.playerId == game.targetPlayerId)
            const player = game.players.find(p => p.playerId == params.playerId)
            const cardIndex = game.hands[target.handIndex].findIndex(c => c.value == params.targetCard)
            if (cardIndex != -1) {
                game.hands[player.handIndex].push(targetCard)
                game.hands[target.handIndex].splice(cardIndex, 1)
            }
            return "START"
        }
    },
    COMBO5_RECLAIMING: (params, game) => {
        const action = params.action
        if (action == "clicked-card") {
            const player = game.players.find(p => p.playerId == params.playerId)
            const card = game.discard.splice(params.targetCardIndex, 1)[0]
            game.hands[player.handIndex].push(card)
            return "END"
        }
    },
    FAVOUR_RECEIVING: (params, game) => {
        const action = params.action
        if (action == "clicked-card") {
            const target = game.players.find(p => p.playerId == params.playerId)
            const player = game.players[game.playerTurn]
            const card = game.hands[target.handIndex].splice(params.targetCardIndex, 1)[0]
            game.hands[player.handIndex].push(card)
            return "START"
        }
    },
    SHUFFLING: (params, game) => {
        const action = params.action
        if (action == "immediate") {
            game.remainder = shuffle(game.remainder)
            return "START"
        }
    },
    
    DEFUSING: () => {
        const action = params.action
        if (action == "submit-slider") {
            // MUST push a bomb - if player times out, insert randomly
            game.remainder.splice(params.insertPos, 0, Cards.BOMB)
            return "END"
        }
    },

    END: (params, game) => {
        if (action == "immediate") {
            if (params.playerId == game.attackedId) {
                game.attackedId = null
            } else {
                game.playerTurn = getNextAlivePlayerIndex(game, params.playerId)
                // TODO: check for victory here
                if (game.playerTurn == -1) {
                    // alert("VICTORY")
                    throw // victory
                }
            }
            return "START"
        } else {
            throw
        }
    }
}
