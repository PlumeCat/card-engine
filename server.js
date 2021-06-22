// server.js

/**/

const express = require("express")
const fs = require("fs")
const app = express()
app.use(express.json())
const PORT = 3000

const MatchState = {
    WAITING: 0,
    PLAYING: 1,
    COMPLETE: 2
}


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
const createPlayer = (playerName, score = 0, ready = false) => ({ playerId: nextId(), playerName, score, ready })


let games = {}


app.get("/create-game", (req, res) => {
    res.set("Connection", "close")
    const playerName = req.query["playerName"]
    
    // get a new unique game id
    let gameId = ""
    do {
        gameId = makeGameId()
    } while (games[gameId])
    
    // create a new game, add to active games
    const game = {
        winner: "",
        matchState: MatchState.WAITING,
        players: [ createPlayer(playerName) ]
    }
    games[gameId] = game

    // the calling player joins immediately
    res.send({ gameId: gameId, playerId: game.players[0].playerId })
})



app.get("/join", (req, res) => {
    res.set("Connection", "close")
    const gameId = req.query["gameId"]
    const game = games[gameId]
    if (!game) {
        res.status(400)
        res.send({ message: "game not found" })
    } else {
        if (game.players.length > 3) {
            console.log("Rejected connection, too many players: " + req.query["playerName"])
            res.status(400)
            res.send({ message: "too many players" })
        } else {
            const playerName = req.query["playerName"]
            console.log(`Player joined: ${playerName}`)
            game.players.push(createPlayer(playerName))
            if (game.players.length == 4) {
                game.matchState = MatchState.PLAYING
            }
            res.send({ playerId: game.players[game.players.length - 1].playerId }) // TODO: return immediate state
        }
    }
})

app.get("/leave", (req, res) => {
    res.set("Connection", "close")
    const gameId = req.query["gameId"]
    const playerId = parseInt(req.query["playerId"])
    // TODO...
    const game = games[gameId]
    if (!game) {
        res.status(400)
        res.send({ message: "game not found" })
    } else {
        // delete the player that left
        game.players = game.players.filter(p => p.playerId != playerId)
        // COMPLETE => COMPLETE
        // WAITING => WAITING
        // PLAYING => WAITING
        if (game.matchState == MatchState.PLAYING) {
            // TODO: abort game, go back to waiting state
            game.matchState = MatchState.WAITING
            game.players.forEach(p => {
                p.score = 0
                p.ready = false
            })
        }
    }
})

app.post("/action", (req, res) => {
    res.set("Connection", "close")
    // Player performed an action
    // { "action": "...", "playerId": "..." }
    const gameId = req.body["gameId"]
    const game = games[gameId]
    if (!game) {
        res.status(400)
        res.send({ message: "game not found" })
    } else {
        // TODO: filter by match state
        const action = req.body["action"]
        const playerId = parseInt(req.body["playerId"])
        console.log(`Player: ${playerId}, action: ${action}`)
        const player = game.players.find(p => p.playerId == playerId)
        if (!player) {
            res.status(400)
            res.send({ message: "bad player id" })
            return
        }

        if (game.matchState == MatchState.PLAYING) {
            if (action == "play") {
                player.score += 1
                if (player.score >= 10) {
                    // victory!
                    game.winner = player.playerName
                    game.matchState = MatchState.COMPLETE
                }
                // game.scores[id] += 1
                // else if action == "..." {}
                res.send({ message: "ok" })
            } else {
                res.status(400)
                res.send({ message: "bad action" })
            }
        } else if (game.matchState == MatchState.COMPLETE) {
            if (action == "restart") {
                player.ready = true
                // are all players ready?
                if (game.players.every(p => p.ready)) {
                    // TODO: reset match state, deal new cards etc
                    game.players.forEach(p => {
                        p.score = 0,
                        p.ready = false
                    })
                    if (game.players.length === 4) {
                        game.matchState = MatchState.PLAYING
                    } else {
                        game.matchState = MatchState.WAITING
                    }
                }
            }
        }
    }
})

app.get("/state", (req, res) => {
    res.set("Connection", "close")
    // Player requesting state update
    res.setHeader("cache-control", "no-store")
    const gameId = req.query["gameId"]
    const game = games[gameId]
    if (!game) {
        res.status(400)
        res.send({ message: "game not found" })
    } else {
        res.send(game)
    }
})



app.get("/", (req, res) => {
    res.set("Connection", "close")
    const file = fs.readFileSync("index.html")
    res.setHeader("Content-Type", "text/html")
    res.send(file)
})
app.listen(PORT, () => {
    console.log("listening")
})
