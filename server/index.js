// server.js

/**/

import express from "express"
import Cards from "./cards.js"
import DEFAULT_DECK from "./deck.js"

const app = express()
app.use(express.json())
app.use(express.static("./dist/"))
app.use(express.static("./server/"))

const MatchState = {
    WAITING: 0,
    PLAYING: 1,
    COMPLETE: 2
}

const PORT = 3000
const A = 'A'.charCodeAt(0)
const Z = 'Z'.charCodeAt(0) + 1

const makeGameId0 = () => String.fromCharCode(Math.floor(Math.random() * (Z - A) + A))
const makeGameId = (n = 4) => Array.from({ length: n }).map(makeGameId0).join("")
const nextId = (() => {
    // TODO: problem after (1 << 40) players
    let _ = 0
    return () => {
        _ += 1
        return _
    }
})()
const createPlayer = (playerName, ready = false) => ({ playerId: nextId(), playerName, ready })

const shuffle = (deck) => {
    const newDeck = deck.slice()
    for (let i = 0; i < deck.length; i++) {
        const j = i + Math.floor(Math.random() * (deck.length - i))
        const buf = newDeck[i]
        newDeck[i] = newDeck[j]
        newDeck[j] = buf
    }
    return newDeck
}

const dealCards = () => {
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

    return [ hands, remainder ]
}

const createGame = (playerName) => {
    const game = {
        winner: "",
        matchState: MatchState.WAITING,
        players: [ createPlayer(playerName) ],
        playerTurn: 0,
        hands: [],
        discard: [],
        remainder: []
    }

    // deal cards
    const [ hands, remainder ] = dealCards()
    game.hands = hands
    game.remainder = remainder
    
    return game
}

let games = {}


app.get("/create-game", (req, res) => {
    res.set("Connection", "close")
    const playerName = req.query["playerName"] || 'player 1'
    
    // get a new unique game id
    let gameId = ""
    do {
        gameId = makeGameId()
    } while (games[gameId])
    
    // create a new game, add to active games
    const game = createGame(playerName)
    games[gameId] = game

    // the calling player joins immediately
    return res.status(200).send({
        gameId: gameId,
        playerName: playerName,
        playerId: game.players[0].playerId
    })
})



app.get("/join", (req, res) => {
    res.set("Connection", "close")
    const gameId = req.query["gameId"]
    // const game = games[gameId]
    const game = Object.values(games)[0]
    console.log(game)
    if (!game) {
        return res.status(400).send({ message: "game not found" })
    }
    if (game.players.length > 3) {
        console.log("Rejected connection, too many players: " + req.query["playerName"])
        return res.status(400).send({ message: "too many players" })
    }
    
    const playerName = req.query["playerName"] || `player ${game.players.length + 1}`
    console.log(`Player joined: ${playerName}`)
    game.players.push(createPlayer(playerName))
    if (game.players.length == 4) {
        game.matchState = MatchState.PLAYING
        game.players.forEach((p, i) => {  p.handIndex = i })
    }
    return res.status(200).send({
        gameId: Object.keys(games)[0],
        playerName: playerName,
        playerId: game.players[game.players.length - 1].playerId
    }) // TODO: return immediate game state?
})

app.get("/leave", (req, res) => {
    res.set("Connection", "close")
    const gameId = req.query["gameId"]
    const playerId = parseInt(req.query["playerId"])
    const game = games[gameId]
    if (!game) {
        return res.status(400).send({ message: "game not found" })
    }
    
    // delete the player that left
    game.players = game.players.filter(p => p.playerId != playerId)
    
    // COMPLETE => COMPLETE
    // WAITING => WAITING
    // PLAYING => WAITING
    if (game.matchState == MatchState.PLAYING) {
        // TODO: abort game, go back to waiting state  (until we can automate turns for missing/disconnected players)
        game.matchState = MatchState.WAITING
        game.players.forEach(p => {
            p.ready = false
        })
    }
    return res.status(200).send({ message: "left game" })
})

app.post("/action", (req, res) => {
    res.set("Connection", "close")
    const gameId = req.body["gameId"]
    //const game = games[gameId]
    const game = Object.values(games)[0]
    if (!game) {
        return res.status(400).send({ message: "game not found" })
    }
    
    const action = req.body["action"]
    const playerId = parseInt(req.body["playerId"])
    console.log(`Player: ${playerId}, action: ${action}`)
    const playerIndex = game.players.findIndex(p => p.playerId == playerId)
    const player = game.players[playerIndex]
    if (!player) {
        return res.status(400).send({ message: "bad player id" })
    }
    
    if (game.matchState == MatchState.PLAYING) {
        if (action == "play") {
            if (playerIndex != game.playerTurn) {
                return res.status(400).send({ message: "not your turn" })
            }
            
            //const cardIndex = req.body["cardIndex"]
            const cardIndices = req.body["cardIndices"]
            
            // add the played cards to discard pile
            for (let c of cardIndices) {
                game.discard.push(game.hands[player.handIndex][c])
            }
            // remove the played cards from the hand
            game.hands[player.handIndex] = game.hands[player.handIndex].filter(
                (c, i) => !cardIndices.includes(i)
            )

            // const card = game.hands[player.handIndex][cardIndex]
            // game.hands[player.handIndex].splice(cardIndex, 1)
            // game.discard.push(card)
            return res.status(200).send({ message: "ok" })
        } else if (action == "pick") {
            if (playerIndex != game.playerTurn){
                return res.status(400).send({ message: "not your turn" })
            }
            if (game.remainder.length) {
                game.hands[player.handIndex].push(game.remainder.shift())
            }
            game.playerTurn = (game.playerTurn + 1) % 4
            return res.status(200).send({ message: "ok" })
        }
    } else if (game.matchState == MatchState.COMPLETE) {
        if (action == "restart") {
            player.ready = true
            // are all players ready?
            if (game.players.every(p => p.ready)) {
                // TODO: reset match state, deal new cards etc
                game.players.forEach(p => {
                    p.ready = false
                })
                if (game.players.length === 4) {
                    game.matchState = MatchState.PLAYING
                } else {
                    game.matchState = MatchState.WAITING
                }
            }
            return res.status(200).send({ message: "will restart" })
        }
    }
    return res.status(400).send({ message: "bad action" })
})

app.get("/state", (req, res) => {
    res.set("Connection", "close")
    res.setHeader("cache-control", "no-store")

    const gameId = req.query["gameId"]
    // const game = games[gameId]
    const game = Object.values(games)[0]
    if (!game) {
        return res.status(400).send({ message: "game not found" })
    }
    return res.status(200).send(game)
})

app.listen(PORT, () => {
    console.log("listening")
})
