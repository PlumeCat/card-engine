// ==================
// Main script
// ==================

const MatchState = {
    WAITING: 0,
    PLAYING: 1,
    COMPLETE: 2
}

// helper functions
const API_PATH = "//localhost:3000"
const $ = id => document.getElementById(id)
const makeParams = (params) => (params ? Object.entries(params).reduce((value, entry, i) => value + `${i ? "&" : ""}${encodeURIComponent(entry[0])}=${encodeURIComponent(entry[1])}`, "?") : "")
const api = (method, path, params, headers, body) => fetch(API_PATH + path + makeParams(params), {
        method: method,
        headers: {
            "Content-Type": "application/json"
        },
        body: body ? JSON.stringify(body) : null
    })
    .then(
        response => {
            if (response.status >= 200 && response.status < 299) {
                return response.json()
            }
            throw new Error(`${response.status} ${response.statusText}`)
        },
        error => { throw error }
    )
const apiPost = (path, body) => api("POST", path, null, null, body)
const apiGet = (path, params) => api("GET", path, params, null, null)

// TODO: no global variables (or redux)
let currentScreen = null
const setScreen = (screen) => {
    if (currentScreen) {
        currentScreen.onExit()
    }
    currentScreen = screen
    currentScreen.onEnter()
    render()
}
const render = () => {
    currentScreen.renderNode.innerHTML = currentScreen.onRender()
    currentScreen.bindEvents()
}


let playerId = null
let gameId = ""
let playerName = ""
let game = {
    matchState: MatchState.WAITING,
    players: [],
    winner: ""
}


class GameScreen {
    onEnter() {}
    onExit() {}
    onRender() {}
    bindEvents() {} // TODO: messy
    renderNode = document.body  // reasonable default?
}

class MenuScreen extends GameScreen {
    onEnter() {}
    onExit() {}
    bindEvents() {
        $("join-button")?.addEventListener("click", e => {
            e.preventDefault()
            playerName = $("name-input").value
            gameId = $("game-id-input").value
            apiGet("/join", { playerName, gameId }).then(res => {
                playerId = res.playerId
                setScreen(new MatchScreen())
            }).catch(alert)
        })

        $("create-button")?.addEventListener("click", e => {
            e.preventDefault()
            playerName = $("name-input").value
            apiGet("/create-game", { playerName }).then(res => {
                playerId = res.playerId
                gameId = res.gameId
                setScreen(new MatchScreen())
            }).catch(alert) // TODO: not very helpful
        })
    }
    onRender() {
        return `
        <div>
            <h2>exploding kittens</h2>
            <span>player name:</span><input id="name-input"/>
            <br>
            <span>game ID:</span><input id="game-id-input"/>
            <br>
            <button id="join-button">join</button>
            <br>
            <button id="create-button">create</button>
        </div>
        `
    }
}
class MatchScreen extends GameScreen {
    renderNodeId = 'matchFloor'
    onEnter() {
        this.clickRestart = false // TODO: remove this entirely, use game state
        this.interval = setInterval(() => {
            // query state
            apiGet("/state", { gameId }).then(newState => {
                if (game.matchState !== newState.matchState ||
                    !objEqual(game.hands, newState.hands) ||
                    !objEqual(game.players, newState.players)) {
                    game = newState
                    if (game.matchState != MatchState.COMPLETE) {
                        this.clickRestart = false
                    }
                    render()
                }
            })
        }, 500)
        document.body.innerHTML = this.renderMatch()
        this.renderNode = $(this.renderNodeId)
    }
    onExit() {
        clearInterval(this.interval)
    }
    onRender() {
        if (game.matchState === MatchState.PLAYING) {
            return "<p>Click to win!</p>" + game.players.map(p => `<p>${p.playerName} | ${p.score}</p>`).join("") +
                `<div id='playerHand'>
                    ${game.hands[game.players.find(p => p.playerId === playerId).handIdx].map(c => this.renderCard(c)).join('')}
                    <div id='playerHandActions'><button id="play-button">play</button></div>
                 </div>`
        } else if (game.matchState === MatchState.WAITING) {
            return "<p>Waiting for 4 players...</p>"
        } else {
            return `<p>Game over! Winner: ${game.winner}</p>
            ${this.clickRestart ? `<span>waiting for other players...</span>` : `<button id="restart-button">play again</button>`}
            <button id="exit-button">exit</button>` // TODO: exit button / maybe a restart button
        }
    }
    renderCard(c) {
        return `
        <div class="fuCard fuCard${c}">${c}</div>
    `
    }
    renderMatch() {
        return `
        <div id="matchStage">
            <h2>${playerName} (${playerId}) (${gameId})</h2>
            <h4>game state</h4>
            <div id="${this.renderNodeId}"></div>
        </div>
        `
    }
    bindEvents() {
        $("play-button")?.addEventListener("click", () => {
            console.log("CLICK")
            apiPost("/action", { gameId, playerId, action: "play" })
        })

        $("restart-button")?.addEventListener("click", () => {
            console.log("RESTART")
            this.clickRestart = true
            apiPost("/action", { gameId, playerId, action: "restart" })
        })

        $("exit-button")?.addEventListener("click", () => {
            console.log("EXIT")
            apiGet("/leave", { gameId, playerId })
            setScreen(new MenuScreen())
        })
        document.querySelectorAll('.fuCard').forEach(c => {
            c.onclick = e => {
                document.querySelectorAll('.fuCard').forEach(_c => _c.classList.remove('fuCardSelected'))
                e.target.classList.add('fuCardSelected')
            }
        })
    }
}

document.addEventListener("DOMContentLoaded", () => {
    setScreen(new MenuScreen())
})


const objEqual = (a, b) => {
    const isArr = Array.isArray(a)
    const bIsArr = Array.isArray(b)

    if (isArr !== bIsArr) {
        return false
    }

    if (isArr) {
        if (a.length !== b.length) {
            return false
        }
        for (let i=0; i<a.length; i++) {
            if (!_isObjEqual(a[i], b[i])) {
                return false
            }
        }
    }
    else {
        if (Object.keys(a).length !== Object.keys(b).length) {
            return false
        }
        for (let key of Object.keys(a)) {
            if (!b.hasOwnProperty(key)) {
                return false
            }
        }
        for (let key of Object.keys(a)) {
            if (!_isObjEqual(a[key], b[key])) {
                return false
            }
        }
    }
    return true
}


const _isObjEqual = (a, b) => {
    if (_isObject(a)) {
        if (_isObject(b)) {
            return objEqual(a, b)
        }
        return false
    }
    return a === b
}


const _isObject = obj => obj === Object(obj)