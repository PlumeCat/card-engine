// server.js

/**/

import express from "express"
import cors from "cors"
import { dealCards } from "./deck.js"
import { TurnStateHandlers, TurnStateTimers, MatchState, checkNope } from "./turn.js"

const log = console.log

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.static("../dist/"))
app.use(express.static("../server/"))
app.use((req, res, next) => {
    res.set("Connection", "close")
    res.set("cache-control", "no-store")
    next()
})


const PORT = 3000
const A = 'A'.charCodeAt(0)
const Z = 'Z'.charCodeAt(0) + 1
let games = {}

const makeGameId = (n = 4) => Array.from({ length: n }).map(() => String.fromCharCode(Math.floor(Math.random() * (Z - A) + A))).join("")
const nextId = (() => {
    // TODO: problem after (1 << 40) players
    let _ = 0
    return () => {
        _ += 1
        return _
    }
})()
const createPlayer = (playerName, handIndex) => ({
    playerId: nextId(),
    playerName,
    handIndex,
    ready: false,
    alive: true
})

const createGame = () => {
    const game = {
        winner: "",
        matchState: MatchState.WAITING,
        players: [],
        playerTurn: 0,
        hands: [],
        discard: [],
        remainder: [],
        attackedId: null,
        turnState: "START",
        pickedCard: null,
        nominatedCard: {targetHas: false, card: null},
        checkpoint: 0,
        timer: 0,
    }

    // deal cards
    const [ hands, remainder ] = dealCards()
    game.hands = hands
    game.remainder = remainder
    
    return game
}


app.get("/create-game", (req, res) => {
    log("create_game")
    const playerName = req.query["playerName"] || 'player 1'
    const numBots = req.query["numBots"] || 0
    
    // get a new unique game id
    let gameId = ""
    do {
        gameId = makeGameId()
    } while (games[gameId])
    
    // create a new game, add to active games
    games[gameId] = createGame()
    games[gameId].players.push(createPlayer(playerName, 0))

    // the calling player joins immediately
    return res.status(200).send({
        gameId: gameId,
        playerName: playerName,
        playerId: games[gameId].players[0].playerId
    })
})

app.get("/join", (req, res) => {
    log("join")
    const gameId = req.query["gameId"]
    // const game = games[gameId]
    const game = Object.values(games)[0]
    if (!game) {
        return res.status(400).send({ message: "game not found" })
    }
    if (game.players.length > 3) {
        log("Rejected connection, too many players: " + req.query["playerName"])
        return res.status(400).send({ message: "too many players" })
    }
    
    const playerName = req.query["playerName"] || `player ${game.players.length + 1}`
    game.players.push(createPlayer(playerName, game.players.length))
    const playerId = game.players[game.players.length - 1].playerId
    log(`Player joined: ${playerName} ${playerId}`)

    if (game.players.length == 4) {
        game.matchState = MatchState.PLAYING
    }
    return res.status(200).send({
        gameId: Object.keys(games)[0],
        playerName,
        playerId
    }) // TODO: return immediate game state?
})

app.get("/leave", (req, res) => {
    log("leave")
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
        if (checkNope(params, game)) {  // todo find a cleaner way of doing this
            params.action = "nope"
        }
        const oldState = game.turnState
        log("Match action: ", params, " | ", oldState)
        const newState = TurnStateHandlers[oldState](params, game)
        if (newState === undefined) {
            return false
        }
        log(`State: ${oldState} -> ${newState}`)
        if (newState != oldState) {
            game.turnState = newState
            if (game.activeTimer) {
                clearTimeout(game.activeTimer)
                game.activeTimer = null
            }

            // set the immediate action
            setImmediate(() => {
                onMatchAction({ action: "immediate" }, game)
            })
            // set the timer action
            game.checkpoint = Date.now()
            game.activeTimer = setTimeout(() => {
                onMatchAction({ action: "timer" }, game)
            }, TurnStateTimers[newState] || 3000)
        }
        return true
    } catch (ex) {
        if (ex == "VICTORY") {
            clearTimeout(game.activeTimer)
            game.matchState = MatchState.COMPLETE
            return true
        }
        return false
    }
}

app.post("/action", (req, res) => {
    log("action")
    const gameId = req.body["gameId"]
    //const game = games[gameId]
    const game = Object.values(games)[0]
    if (!game) {
        return res.status(400).send({ message: "game not found" })
    }
    
    const action = req.body["action"]
    const playerId = parseInt(req.body["playerId"])
    log(`Player: ${playerId}, action: ${action}`)
    const player = game.players.find(p => p.playerId == playerId) //[playerIndex]
    if (!player) {
        return res.status(400).send({ message: "bad player id" })
    }
    
    if (game.matchState == MatchState.PLAYING) {
        if (action === 'update-hand') {  // todo actually feels like the wrong place to put this now...
            if (!req.body.updatedHandIndices || req.body.updatedHandIndices.length !== game.hands[player.handIndex].length) {
                // todo additional validation like the values are all unique and correct indices
                return res.status(400).send({ message: "something went wrong" })
            }
            game.hands[player.handIndex] = req.body.updatedHandIndices.map(i => game.hands[player.handIndex][i])
            return res.status(200).send({ message: "ok" })
        }
        else if (onMatchAction(req.body, game)) {
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
                    p.ready = false,
                    p.alive = true
                })
                if (game.players.length === 4) {
                    game.matchState = MatchState.PLAYING
                    games[gameId] = createGame()
                    games[gameId].matchState = MatchState.PLAYING
                    games[gameId].players = game.players
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
    // log("state")
    const gameId = req.query["gameId"]
    // const game = games[gameId]
    const game = Object.values(games)[0]
    if (!game) {
        return res.status(400).send({ message: "game not found" })
    }

    // TODO: awkward hack
    // remove timer, serialize, put timer back
    const timer = game.activeTimer
    delete game.activeTimer
    game.timer = Math.max(0, (TurnStateTimers[game.turnState] || 3000) - (Date.now() - game.checkpoint))
    res.status(200).send(game)
    game.activeTimer = timer
})

app.listen(PORT, () => {
    log("listening")
})
