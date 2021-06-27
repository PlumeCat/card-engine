// ==================
// Main script
// ==================

// const Cards = import("/cards.js")
import Cards from "/cards.js"

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
    hands: [],
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
                playerName = res.playerName
                gameId = res.gameId
                setScreen(new MatchScreen())
            }).catch(alert)
        })

        $("create-button")?.addEventListener("click", e => {
            e.preventDefault()
            playerName = $("name-input").value
            apiGet("/create-game", { playerName }).then(res => {
                playerId = res.playerId
                playerName = res.playerName
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
    selectedCards = []  // todo ensure to reset this when necessary
    get localPlayerAlive() {
        return game.players.find(p => p.playerId === playerId).alive
    }
    get hand() {
        return game.hands[game.players.find(p => p.playerId === playerId).handIndex] || []
    }
    get currentPlayer() {
        return game.players[game.playerTurn]
    }
    isYourTurn() {
        return this.currentPlayer.playerId === playerId
    }
    onEnter() {
        this.clickRestart = false // TODO: remove this entirely, use game state
        this.interval = setInterval(() => {
            // query state
            apiGet("/state", { gameId }).then(newState => {
                if (!compareState(game, newState)) {
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
            return `
                <div id="matchPlayCont">
                    <div id="matchPlayersTop">${this.renderOppHand('top')}</div>
                    <div id="matchPlayBottom">
                        <div id="matchPlayersLeft">${this.renderOppHand('left')}</div>
                        <div id="matchPlayArea">
                            <div id="matchStacks">
                                <div class="matchCardStackCont" id="matchDiscardStack">
                                    <span>Discard</span>
                                    <hr>
                                    <div class="matchCardStack">
                                        ${game.discard.reduce((v, c) => v + `<p>${c.name}</p>`, "")}
                                    </div>
                                </div>
                                <div class="matchCardStackCont" id="matchRemStack">
                                    <span>Deck</span>
                                    <hr>
                                    <div class="matchCardStack">
                                        ${game.remainder.reduce((v, c) => v + `<p>${c.name}</p>`, "")}
                                    </div>
                                </div>
                                <div id="matchPlayAreaActions">
                                    <button id="pick-button">pick</button>
                                </div>
                            </div>
                            <div id="playInfo">
                                ${this.isYourTurn() ? 'your' : this.currentPlayer.playerName+"'s"} turn...
                                ${this.localPlayerAlive ? "" : "YOU ARE DEAD!"}
                            </div>
                        </div>
                        <div id="matchPlayersRight">${this.renderOppHand('right')}</div>
                    </div>
                </div>
                <div id='playerSection'>
                    <div id='playerHandCont'>
                        <div class="playerHandAligner"></div>
                        <div id='playerHand'>
                            ${this.hand.reduce((v, c, i) => v + this.renderCard(c, i), "")}
                        </div>
                        <div class="playerHandAligner"></div>
                    </div>
                    <div id="playerHandActionsCont">
                        <div id="playerHandActions">
                            <button id="play-button">play</button>
                        </div>
                        <div class="playerInfo">${playerName} (${playerId}) (${gameId})</div>
                    </div>
                </div>
                `
        } else if (game.matchState === MatchState.WAITING) {
            return `<h2>${playerName} (${playerId}) (${gameId})</h2><p>Waiting for 4 players...</p>`
        } else {
            return `<h2>${playerName} (${playerId}) (${gameId})</h2><p>Game over! Winner: ${game.winner}</p>
            ${this.clickRestart ? `<span>waiting for other players...</span>` : `<button id="restart-button">play again</button>`}
            <button id="exit-button">exit</button>` // TODO: exit button / maybe a restart button
        }
    }
    renderCard(c, i) {
        return `
        <div id="hand-card-${i}" class="fuCard fuCard${c.name.split('_').pop().substr(0, 3)}">
            <div class="fuCardInner">
                ${c.displayName || c.name.replace('_', ' ')}
            </div>
        </div>`
    }
    renderOppHand(pos) {
        const n = {left: 1, top: 2, right: 3}[pos]
        const player = game.players[(game.players.findIndex(p => p.playerId === playerId) + n) % 4]
        const len = game.hands[player.handIndex].length  // this will eventually just come from the server (wont send details of other players hands)
        return `
            <div class="oppHandCont" id="oppHand-${player.playerId}">
                <div class="fdCard fdCardOpp">${len}</div>
                <div class="oppPlayerInfo">${player.playerName}</div>
            </div>
        `
    }
    renderMatch() {
        return `
        <div id="matchStage">
            <div id="${this.renderNodeId}"></div>
        </div>
        `
    }
    bindEvents() {
        if (game && game.hands.length) {
            for (let i = 0; i < this.hand.length; i++) {
                $(`hand-card-${i}`).addEventListener("click", (e) => {
                    if (this.selectedCards.includes(i)) {
                        this.selectedCards = this.selectedCards.filter(c => c!== i)
                        $(`hand-card-${i}`).classList.remove('fuCardSelected')
                    }
                    else {
                        this.selectedCards.push(i)
                        $(`hand-card-${i}`).classList.add('fuCardSelected')
                    }
                })
            }
        }

        $("pick-button")?.addEventListener("click", e => {
            apiPost("/action", {
                action: "pick",
                gameId: gameId,
                playerId: playerId
            }).catch(alert)
        })

        $("play-button")?.addEventListener("click", () => {
            console.log("PLAY")
            apiPost("/action", {
                action: "play",
                gameId: gameId,
                playerId: playerId,
                cardIndices: this.selectedCards
            }).then(() => {
                this.selectedCards = []
                document.querySelectorAll('.fuCard').forEach(c => c.classList.remove('fuCardSelected'))
            }).catch(alert)
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

        if (game && game.matchState === MatchState.PLAYING) {
            game.players.forEach(p => {
                if (p.playerId === playerId) {
                    return
                }
                $(`oppHand-${p.playerId}`).addEventListener('click', () => {
                    console.log('CLICKED PLAYER', p.playerName, p.playerId)
                    apiPost("/action", {
                        action: "clicked-player",
                        gameId: gameId,
                        playerId: playerId,
                        targetPlayerId: p.playerId
                    }).catch(alert)
                })
            })
        }
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


const compareState = (oldState, newState) => {
    const keys1 = ['matchState', 'playerTurn']

    for (let key of keys1) {
        if (oldState[key] !== newState[key]) {
            return false
        }
    }

    const keys2 = ['hands', 'players']

    for (let key of keys2) {
        if (!objEqual(oldState[key], newState[key])) {
            return false
        }
    }

    if (!objEqual(Object.keys(oldState), Object.keys(newState))) {
        return false
    }

    // todo watch out for when to enable the below
    const keys3 = ['discard', 'remainder']
    const keys = [].concat(keys1, keys2, keys3)
    Object.keys(newState).forEach(k => {if (!keys.includes(k)) keys3.push(k)})
    
    for (let key of keys3) {
        if (!_isObjEqual(oldState[key], newState[key])) {
            return false
        }
    }

    return true
}
