import Cards from "./cards.js"
import { shuffle } from "./deck.js"


const getNextAlivePlayerIndex = (game) => {
    let index = game.playerTurn
    while (true) {
        index = (index + 1) % 4
        if (game.players[index].alive) {
            return index
        }
        if (index == game.playerTurn) {
            // back to self.. next alive player is self
            return -1
        }
    }
}

const checkWinner = (game) => {
    console.log("check winner: ", game.players)
    const aliveCount = game.players.reduce((v, p) => v + (p.alive ? 1 : 0), 0)
    console.log("alive count: ", aliveCount)
    if (aliveCount < 2) {
        console.log("winner")
        return game.players.find(p => p.alive)
    }
    console.log("no winner")
    return null
}

const isCatCard = card => [
    Cards.CAT_TACO,
    Cards.CAT_MELON,
    Cards.CAT_RAINBOW,
    Cards.CAT_BEARD,
    Cards.CAT_POTATO
].includes(card)


const doNope = (params, game, successState) => {
    // nope can come from any player!
    const nopePlayerId = params.playerId
    const nopePlayer = game.players.find(p => p.playerId === nopePlayerId)
    if (!nopePlayer.alive) {
        return
    }
    const hand = game.hands[nopePlayer.handIndex]
    const nopePos = hand.indexOf(Cards.NOPE)
    if (nopePos == -1) {
        return
    }

    // discard the nope
    hand.splice(nopePos, 1)
    game.discard.unshift(Cards.NOPE)
    return successState
}


export const TurnStates = {
    START: (params, game, nextAction) => {
        const action = params.action
        if (!action) {
            return
        }
        if (action == "play") {
            const playerIndex = game.players.findIndex(p => p.playerId == params.playerId)
            const hand = game.hands[game.players[playerIndex].handIndex]
            console.log(`PLAY: ${params.cardIndices}`)
            if (game.playerTurn != playerIndex) {
                return
            }
            if (params.cardIndices.length == 1) {
                // skip, future, attack, favour, shuffle
                const card = hand[params.cardIndices[0]]
                if (card == Cards.SKIP) {
                    // discard the card
                    game.discard.unshift(...hand.splice(params.cardIndices[0], 1))
                    return "PLAYING_SKIP"
                } else if (card == Cards.SEE_FUTURE) {
                    // discard the card
                    game.discard.unshift(...hand.splice(params.cardIndices[0], 1))
                    return "PLAYING_SEE_FUTURE"
                } else if (card == Cards.ATTACK) {
                    // discard the card
                    game.discard.unshift(...hand.splice(params.cardIndices[0], 1))
                    return "PLAYING_ATTACK"
                } else if (card == Cards.SHUFFLE) {
                    // discard dis card
                    game.discard.unshift(...hand.splice(params.cardIndices[0], 1))
                    return "PLAYING_SHUFFLE"
                } else if (card == Cards.FAVOUR) {
                    // remoof!
                    game.discard.unshift(...hand.splice(params.cardIndices[0], 1))
                    return "PLAYING_FAVOUR"
                }
            } else if (params.cardIndices.length == 2) {
                const cards = params.cardIndices.map(i => hand[i])
                if (cards[0] != cards[1]) {
                    return
                }
                if (!isCatCard(cards[0])) {
                    return
                }
                // discard cards
                params.cardIndices.forEach(i => game.discard.unshift(hand[i]))
                game.hands[game.players[playerIndex].handIndex] = hand.filter((c, i) => !params.cardIndices.includes(i))
                return "PLAYING_COMBO2"
            } else if (params.cardIndices.length == 3) {
                const cards = params.cardIndices.map(i => hand[i])
                if (cards[0] != cards[1] || cards[0] != cards[2]) {
                    return
                }
                if (!isCatCard(cards[0])) {
                    return
                }
                // discard cards
                params.cardIndices.forEach(i => game.discard.unshift(hand[i]))
                game.hands[game.players[playerIndex].handIndex] = hand.filter((c, i) => !params.cardIndices.includes(i))
                return "PLAYING_COMBO3"
            } else if (params.cardIndices.length == 5) {
                const cards = params.cardIndices.map(i => hand[i])
                if ((new Set(cards)).size != 5) {
                    return
                }
                params.cardIndices.forEach(i => game.discard.unshift(hand[i]))
                game.hands[game.players[playerIndex].handIndex] = hand.filter((c, i) => !params.cardIndices.includes(i))
                return "PLAYING_COMBO5"
            }
        } else if (action == "pick") {
            const playerIndex = game.players.findIndex(p => p.playerId == params.playerId)
            if (game.playerTurn != playerIndex) {
                return
            }
            const hand = game.hands[game.players[playerIndex].handIndex]
            const card = game.remainder.shift()
            console.log(`PICK: ${card.name}`)
            if (card == Cards.BOMB) {
                const defusePos = hand.indexOf(Cards.DEFUSE)
                if (defusePos != -1) {
                    hand.splice(defusePos, 1)
                    game.discard.unshift(Cards.DEFUSE)
                    return "DEFUSING"
                } else {
                    game.discard.unshift(Cards.BOMB)
                    game.players[playerIndex].alive = false

                    // check for a winner here
                    console.log("checking for winner")
                    const winner = checkWinner(game)
                    if (winner !== null) {
                        console.log(`winner! ${winner.playerName}`)
                        game.winner = winner.playerName
                        throw "VICTORY"
                    }
                    return "END"
                }
            } else {
                hand.push(card)
                return "END"
            }
        }
    },
    
    PLAYING_SEE_FUTURE: (params, game) => {
        const action = params.action
        if (action == "timer") {
            return "SEE_FUTURE"
        } else if (action == "nope") {
            return doNope(params, game, "NOPE_FUTURE_ODD")
        }
    },
    PLAYING_SKIP: (params, game) => {
        const action = params.action
        if (action == "timer") {
            return "END"
        } else if (action == "nope") {
            return doNope(params, game, "NOPE_SKIP_ODD")
        }
    },
    PLAYING_ATTACK: (params, game) => {
        const action = params.action
        if (action == "timer") {
            return "ATTACKING"
        }
    },
    PLAYING_FAVOUR: (params, game) => {
        const action = params.action
        const playerId = params.playerId
        if (action == "clicked-player") {
            // save this player as the target player
            game.targetPlayerId = params.targetPlayerId
            return "FAVOUR_RECEIVING"
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
        } else if (action == "nope") {
            return doNope(params, game, "NOPE_COMBO2_ODD")
        }
    },
    PLAYING_COMBO3: (params, game) => {
        const action = params.action
        if (action == "clicked-player") {
            // save this player as the target player
            game.targetPlayerId = params.targetPlayerId
            return "COMBO3_NOMINATING"
        } else if (action == "nope") {
            return doNope(params, game, "NOPE_COMBO3_ODD")
        }
    },
    PLAYING_COMBO5: (params, game) => {
        const action = params.action
        if (action == "timer") {
            return "COMBO5_RECLAIMING"
        } else if (action == "nope") {
            return doNope(params, game, "NOPE_COMBO5_ODD")
        }
    },
    
    SEE_FUTURE: (params, game) => {
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
            return "START"
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
    ATTACKING: (params, game) => {
        const action = params.action
        if (action == "immediate") {
            // attack happened
            const index = getNextAlivePlayerIndex(game)
            game.attackedId = game.players[index].playerId
            return "END"
        }
    },    
    DEFUSING: (params, game) => {
        const action = params.action
        if (action == "timer") {
            // MUST push a bomb - if player times out, insert randomly
            const pos = Math.floor(Math.random() * game.remainder.length)
            console.log(`Reinserted bomb at ${pos}`)
            game.remainder.splice(pos, 0, Cards.BOMB)
            return "END"
        } else if (action == "submit-slider") {
            game.remainder.splice(params.insertPos, 0, Cards.BOMB)
            return "END"
        }
    },
    END: (params, game) => {
        const action = params.action
        if (action == "immediate") {
            if (game.players[game.playerTurn].playerId == game.attackedId) {
                game.attackedId = null
                // if attack was played, end of the attacker's turn can't be victory condition
            } else {
                game.playerTurn = getNextAlivePlayerIndex(game)
            }
            return "START"
        }
    },

    NOPE_FUTURE_ODD: (params, game) => {
        if (action == "timer") {
            // nope succeeded
            return "START"
        } else if (action == "nope") {
            return doNope(params, game, "NOPE_FUTURE_EVEN")
        }
    },
    NOPE_FUTURE_EVEN: (params, game) => {
        const action = params.action
        if (action == "timer") {
            // nope was cancelled
            return "SEE_FUTURE"
        } else if (action == "nope") {
            return doNope(params, game, "NOPE_FUTURE_ODD")
        }
    },
    NOPE_SKIP_ODD: (params, game) => {
        const action = params.action
        if (action == "timer") {
            // nope succeeded
            return "START"
        } else if (action == "nope") {
            // nope was noped
            return doNope(params, game, "NOPE_SKIP_EVEN")
        }
    },
    NOPE_SKIP_EVEN: (params, game) => {
        const action = params.action
        if (action == "timer") {
            // nope was cancelled
            return "END"
        } else if (action == "nope") {
            // cancelled nope was re-noped
            return doNope(params, game, "NOPE_SKIP_ODD")
        }
    },
    NOPE_COMBO2_ODD: (params, game) => {
        const action = params.action
        if (action == "timer") {
            return "START"
        } else if (action == "nope") {
            return doNope(params, game, "NOPE_COMBO2_EVEN")
        }
    },
    NOPE_COMBO2_EVEN: (params, game) => {
        const action = params.action
        if (action == "timer") {
            return "COMBO2_STEALING"
        } else if (action == "nope") {
            return doNope(params, game, "NOPE_COMBO2_ODD")
        }
    },
    NOPE_COMBO3_ODD: (params, game) => {
        const action = params.action
        if (action == "timer") {
            return "START"
        } else if (action == "nope") {
            return doNope(params, game, "NOPE_COMBO3_EVEN")
        }
    },
    NOPE_COMBO3_EVEN: (params, game) => {
        const action = params.action
        if (action == "timer") {
            return "COMBO3_NOMINATING"
        } else if (action == "nope") {
            return doNope(params, game, "NOPE_COMBO3_ODD")
        }
    },
    NOPE_COMBO5_ODD: (params, game) => {
        const action = params.action
        if (action == "timer") {
            return "START"
        } else if (action == "nope") {
            return doNope(params, game, "NOPE_COMBO5_EVEN")
        }
    },
    NOPE_COMBO5_EVEN: (params, game) => {
        const action = params.action
        if (action == "timer") {
            return "COMBO5_RECLAIMING"
        } else if (action == "nope") {
            return doNope(params, game, "NOPE_COMBO5_ODD")
        }
    },

    NOPE_SHUFFLE_ODD: (params, game) => {
        if (action == "timer") {
            return "START"
        } else if (action == "nope") {
            return doNope(params, game, "NOPE_SHUFFLE_EVEN")
        }
    },
    NOPE_SHUFFLE_EVEN: (params, game) => {
        if (action == "timer") {
            return "SHUFFLING"
        } else if (action == "nope") {
            return doNope(params, game, "NOPE_SHUFFLE_EVEN")
        }
    },
    NOPE_ATTACK_ODD: (params, game) => {
        if (action == "timer") {
            return "START"
        } else if (action == "nope") {
            return doNope(params, game, "NOPE_ATTACK_EVEN")
        }
    },
    NOPE_ATTACK_EVEN: (params, game) => {
        if (action == "timer") {
            return "ATTACKING"
        } else if (action == "nope") {
            return doNope(params, game, "NOPE_ATTACK_ODD")
        }
    },
    NOPE_FAVOUR_ODD: (params, game) => {
        if (action == "timer") {
            return "FAVOUR_RECEIVING"
        } else if (action == "nope") {
            return doNope(params, game, "NOPE_FAVOUR_EVEN")
        }
    },
    NOPE_FAVOUR_EVEN: (params, game) => {
        if (action == "timer") {
            return "START"
        } else if (action == "nope") {
            return doNope(params, game, "NOPE_FAVOUR_ODD")
        }
    },
}
