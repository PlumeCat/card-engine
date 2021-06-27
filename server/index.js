// server.js

/**/

import express from "express"
import Cards from "./cards.js"
import { dealCards } from "./deck.js"
import { TurnStates } from "./turn.js"

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
const createPlayer = (playerName, ready = false) => ({ playerId: nextId(), playerName, ready, alive: true })

const createGame = (playerName) => {
    const game = {
        winner: "",
        matchState: MatchState.WAITING,
        players: [ createPlayer(playerName) ],
        playerTurn: 0,
        hands: [],
        discard: [],
        remainder: [],
        attack: false, // ongoing attack
        turnState: TurnStates.START,
        turnStateName: "START"
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

const onMatchAction = (params, game) => {
    try {
        const newStateName = game.turnState(params, game)
        if (newStateName === undefined) {
            return
        }
        if (newStateName != game.turnStateName) {
            game.turnStateName = newStateName
            game.turnState = TurnStates[newStateName]
            if (game.activeTimer) {
                clearTimeout(game.activeTimer)
                game.activeTimer = null
            }

            // set the immediate action
            setImmediate(() => {
                onMatchAction({ action: "immediate" }, game)
            })
            // set the timer action
            game.activeTimer = setTimeout(() => {
                onMatchAction({ action: "timer" }, game)
            }, 3000)
        }
        return true
    } catch (_) {
        // TODO: check for victory (player.alive for 1 player)
        return false
    }
}

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
    const player = game.players.find(p => p.playerId == playerId) //[playerIndex]
    if (!player) {
        return res.status(400).send({ message: "bad player id" })
    }
    
    if (game.matchState == MatchState.PLAYING) {
        if (onMatchAction(req.body, game)) {
            return res.status(200).send({ message: "ok" })
        }
        return res.status(400).send({ message: "illegal action" })
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
