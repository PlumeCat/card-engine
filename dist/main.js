// ==================
// Main script
// ==================

// const Cards = import("/cards.js")
import Cards from "/cards.js"

const getShortCardName = cardName => cardName.split('_').pop().substr(0, 3)

const getCardInnerHtml = c => `<div class="fuCardInner">${c.displayName || c.name.replace('_', ' ')}</div>`


const MatchState = {
    WAITING: 0,
    PLAYING: 1,
    COMPLETE: 2
}

// ========= TURN STATES =========
const TS_PLAYING_COMBO2    = 'PLAYING_COMBO2',
      TS_PLAYING_COMBO3    = 'PLAYING_COMBO3',
      TS_PLAYING_FAVOUR    = 'PLAYING_FAVOUR',
      TS_COMBO2_STEALING   = 'COMBO2_STEALING',
      TS_COMBO3_NOMINATING = 'COMBO3_NOMINATING',
      TS_COMBO5_RECLAIMING = 'COMBO5_RECLAIMING',
      TS_FAVOUR_RECEIVING  = 'FAVOUR_RECEIVING',
      TS_DEFUSING          = 'DEFUSING'
// ===============================

const ChooseOppTurnStates = [
    TS_PLAYING_COMBO2,
    TS_PLAYING_COMBO3,
    TS_PLAYING_FAVOUR,
]

const ModalTurnStates = [
    TS_COMBO2_STEALING,
    TS_COMBO3_NOMINATING,
    TS_COMBO5_RECLAIMING,
    TS_DEFUSING,
]

const getTurnStateMsg = (state) => {
    const bold = b => `<b>${b}</b>`
    const currentPlayer = bold(state.currentPlayer.playerName)
    const targetPlayer = bold(state.targetPlayer?.playerName)

    const isPlayer = state.playerId === state.currentPlayer.playerId
    const isTarget = state.playerId === state.game.targetPlayerId

    const turnState = state.turnState

    if (turnState.startsWith('NOPE_')) {
        const noper = `<b>${state.game.players.find(p => p.playerId === state.game.noperId).playerName}</b>`
        return `${state.prevTurnStateMsg}. "NOPE${'!'.repeat(state.prevTurnStateMsg.split('NOPE!').length)}" - ${noper}.`
    }
    if (turnState.startsWith('PLAYING_')) {
        const chooseOpp = ChooseOppTurnStates.includes(turnState)
        return isPlayer && chooseOpp ? 'choose a player'
            : `${currentPlayer} is playing "${turnState.replace('PLAYING_', '').split('_').join(' ')}"${chooseOpp ? ', and choosing a player...' : ''}`
    }
    if (turnState === TS_FAVOUR_RECEIVING) {
        return isPlayer ? `waiting for card from ${targetPlayer}`
             : isTarget ? `choose 1 card to give to ${currentPlayer}`
             : `${targetPlayer} has to give 1 card ${currentPlayer}`
    }
    if (turnState === TS_COMBO2_STEALING) {
        return isPlayer ? `pick a card from ${targetPlayer}'s hand`
             : isTarget ? `${bold('your')} cards are fanned out for ${currentPlayer} to grab one!`
             : `${currentPlayer} is picking a card from ${targetPlayer}'s hand`
    }
    if (turnState === TS_COMBO3_NOMINATING) {
        return isPlayer ? `nominate a card to request from ${targetPlayer}`
             : isTarget ? `${currentPlayer} is nominating a card to request from ${bold('you')}`
             : `${currentPlayer} is nominating a card to request from ${targetPlayer}`
    }
    if (turnState === TS_COMBO5_RECLAIMING) {
        return isPlayer ? `pick a card from the discard pile...`
             : `${currentPlayer} is reclaiming a card from the discard pile...`
    }
    if (turnState === TS_DEFUSING) {
        return isPlayer ? 'pick a position to reinsert the bomb...'
             : `${currentPlayer} picked a bomb! defusing...`
    }
    return ''
}


// helper functions
const API_PATH = "//localhost:3000"
const $ = id => document.getElementById(id)
const $$ = selector => document.querySelector(selector)  // todo maybe rename these... perhaps actually have a querySelectorAll which uses "$"
const $$$ = selector => document.querySelectorAll(selector)  // todo this is getting ridiculous
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



class PlayState {
    constructor(params) {
        const { playerId, playerName, gameId } = params
        this.playerId = playerId
        this.playerName = playerName
        this.gameId = gameId
        this.game = {
            matchState: MatchState.WAITING,
            players: [],
            hands: [],
            attackedId: null,
            winner: ""
        }
    }
    get player() {
        return this.getPlayer(this.playerId)
    }
    get currentPlayer() {
        return this.game.players[this.game.playerTurn]
    }
    get targetPlayer() {
        return this.getPlayer(this.game.targetPlayerId)
    }
    get hand() {
        return this.game.hands[this.player.handIndex] || []
    }
    get turnState() {
        return this.game.turnState
    }
    getState() {
        // query state
        apiGet("/state", { gameId: this.gameId })
            .then(newState => {
                if (newState && !compareState(this.game, newState)) {
                    if (newState.turnState !== this.turnState && this.game.matchState === MatchState.PLAYING) {
                        this.prevTurnStateMsg = getTurnStateMsg(this)
                    }
                    this.handleAttackTurn(newState)
                    this.game = newState
                    render()
                }
            }).catch(console.error)
    }
    handleAttackTurn(newState) {
        if (newState.attackedId !== this.game.attackedId) {
            this.attackedTurn = newState.attackedId !== null ? 1 : 2
        }
        else if (newState.attackedId === null) {
            this.attackedTurn = null
        }
    }
    isYourTurn() {
        return this.currentPlayer.playerId === this.playerId
    }
    getPlayer(player) {
        // player == player or playerId
        if (player && player.hasOwnProperty('playerId')) {
            return player
        }
        return this.game.players.find(p => p.playerId === player)
    }
    getNthPlayer(n) {
        return this.game.players[(this.game.players.findIndex(p => p.playerId === this.playerId) + n) % 4]
    }
    showModal() {
        return this.isYourTurn() && ModalTurnStates.includes(this.turnState)
    }
    isGivingFavour() {
        return this.turnState === TS_FAVOUR_RECEIVING && this.game.targetPlayerId === this.playerId
    }
    chooseOppEnabled() {
        return this.isYourTurn() && ChooseOppTurnStates.includes(this.turnState)
    }
    playerAvailable(player) {
        return this.playerAlive(player) && this.playerCardCount(player)
    }
    playerAlive(player) {
        return this.getPlayer(player).alive
    }
    playerCardCount(player) {
        return this.game.hands[this.getPlayer(player).handIndex].length   // this will eventually just come from the server (wont send details of other players hands)
    }
    apiParams() {
        return {
            gameId: this.gameId,
            playerId: this.playerId,
        }
    }
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
            const playerName = $("name-input").value
            const gameId = $("game-id-input").value
            apiGet("/join", { playerName, gameId }).then(res => {
                setScreen(new MatchScreen(res))
            }).catch(alert)
        })

        $("create-button")?.addEventListener("click", e => {
            e.preventDefault()
            const playerName = $("name-input").value
            apiGet("/create-game", { playerName }).then(res => {
                setScreen(new MatchScreen(res))
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
    constructor(params) {
        super()
        this.playState = new PlayState(params)

        this.timeout = 500
        this.renderNodeId = 'matchFloor'
        this.selectedCardsIndices = []  // todo ensure to reset this when necessary
        this.currentDropZone = null  // todo put these in the new class?
        this.cardsOnLeftQty = null
        this.debugPiles = false
    }
    get matchState() {
        return this.playState.game.matchState
    }
    onEnter() {
        this.interval = setInterval(this.playState.getState.bind(this.playState), this.timeout)
        document.body.innerHTML = this.renderMatch()
        this.renderNode = $(this.renderNodeId)
    }
    onExit() {
        clearInterval(this.interval)
    }
    onRender() {
        const { playerId, playerName, gameId } = this.playState
        if (this.matchState === MatchState.PLAYING) {
            return this.renderMatchPlay()
        } else if (this.matchState === MatchState.WAITING) {
            return `<h2>${playerName} (${playerId}) (${gameId})</h2><p>Waiting for 4 players...</p>`
        } else {
            return `<h2>${playerName} (${playerId}) (${gameId})</h2><p>Game over! Winner: ${this.playState.game.winner}</p>
            ${this.playState.player.ready ? `<span>waiting for other players...</span>` : `<button id="restart-button">play again</button>`}
            <button id="exit-button">exit</button>`
        }
    }
    renderMatchPlay() {
        const { playerId, playerName, gameId, game } = this.playState
        return `
            <div id="matchPlayCont">
                <div id="matchPlayersTop">${this.renderOppHand('top')}</div>
                <div id="matchPlayBottom">
                    <div id="matchPlayersLeft">${this.renderOppHand('left')}</div>
                    <div id="matchPlayArea">
                        <div id="matchPilesCont">
                            ${this.renderMatchPiles(game)}
                        </div>
                        ${this.renderPlayInfo()}
                    </div>
                    <div id="matchPlayersRight">${this.renderOppHand('right')}</div>
                </div>
            </div>
            <div id='playerSection'>
                <div id='playerHandCont'>
                    <div class="playerHandAligner"></div>
                    <div id='playerHand' class="dropZone">
                        ${this.playState.hand.reduce((v, c, i) => v + this.renderCard(c, i), "")}
                    </div>
                    <div class="playerHandAligner"></div>
                </div>
                <div id="playerHandActionsCont">
                    <div id="playerHandActions">
                        <button id="play-button">play</button>
                        <button id="nope-button">nope</button>
                        ${this.playState.isGivingFavour() ? `<button id="give-button">give</button>` : ''}
                    </div>
                    <div class="playerInfo">${playerName} (${playerId}) (${gameId})</div>
                </div>
            </div>
            ${this.playState.showModal() ? modal(this.playState) : ''}
        `
    }
    renderMatchPiles(game) {
        const remainderCount = game.remainder.length <= 10 ? game.remainder.length
                             : game.remainder.length < 15 ? '10+'
                             : game.remainder.length < 20 ? '15+'
                             : '?'
        const discard = [`
            <div class="matchCardStackCont" id="matchDiscardStack">
                <span>Discard</span>
                <hr>
                <div class="matchCardStack">
                    ${game.discard.reduce((v, c) => v + `<p>${c.name}</p>`, "")}
                </div>
            </div>
        `, `
            <div class="matchCardPileCont" id="matchDiscardPile">
                ${game.discard.length ? `
                    <div class="fuCardB fuCard${getShortCardName(game.discard[0].name)}" id="matchDiscardPileTop">${getCardInnerHtml(game.discard[0])}</div>
                ` : `
                    <div class="fuCardB invis"><div class="fuCardInner"></div></div>
                `}
            </div>
        `]
        const remainder = [`
            <div class="matchCardStackCont" id="matchRemStack">
                <span>Deck</span>
                <hr>
                <div class="matchCardStack">
                    ${game.remainder.reduce((v, c) => v + `<p>${c.name}</p>`, "")}
                </div>
            </div>
        `, `
            <div class="matchCardPileCont" id="matchRemPile">
                <div class="fduCard fuCardB" id="matchRemPileTop"><div class="fuCardInner">${remainderCount}</div></div>
            </div>
        `]
        const pickButton = [`
            <div id="matchPlayAreaActions">
                <button id="pick-button">pick</button>
            </div>
        `, '']

        return `
            <div id="matchStacks" class="${this.debugPiles ? '' : 'hidden'}">
                ${discard[0]}
                ${remainder[0]}
                ${this.debugPiles ? pickButton[0] : ''}
            </div>
            <div id="matchPiles" class="${this.debugPiles ? 'hidden' : ''}">
                ${discard[1]}
                ${remainder[1]}
                ${this.debugPiles ? '' : pickButton[0]}
            </div>
        `
    }
    renderPlayInfo() {  // todo remove the outer 'playInfoCont' container, and the checkbox
        return `
            <div id="playInfoCont">
                <div id="playInfo">
                <div>
                    ${this.playState.isYourTurn() ? '<b>your</b>' : `<b>${this.playState.currentPlayer.playerName}</b>'s`} turn...${this.playState.attackedTurn ? ` (${this.playState.attackedTurn}/2)` : ''}
                    ${this.playState.player.alive ? "" : "YOU ARE DEAD!"}
                </div>
                <div>
                    ${this.playState.showModal() ? '' : getTurnStateMsg(this.playState)}                
                </div>
                </div>
                <div id="debugCont">
                    <input type="checkbox" id="debugPilesCheck" ${this.debugPiles ? 'checked' : ''}><label for="debugPilesCheck">debug</label>
                </div>
            </div>
        `
    }
    renderCard(c, i) {
        return `
        <div id="hand-card-cont-${i}">
            <div id="hand-card-${i}" class="fuCard fuCard${getShortCardName(c.name)}${this.selectedCardsIndices.includes(i) ? ' fuCardSelected' : ''}">
                ${getCardInnerHtml(c)}
            </div>
        </div>`
    }
    renderOppHand(pos) {
        const n = {left: 1, top: 2, right: 3}[pos]
        const player = this.playState.getNthPlayer(n)
        const alive = this.playState.playerAlive(player)
        const len = this.playState.playerCardCount(player)
        const classes = [
            'oppHandCont',
            (this.playState.chooseOppEnabled() && this.playState.playerAvailable(player)) ? 'enabled' : '',
            !alive ? 'dead' : '',
        ].filter(c => c).join(' ')
        return `
            <div class="${classes}" id="oppHand-${player.playerId}">
                <div class="fdCard fdCardOpp">${alive ? len : ''}</div>
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
    validateCardsForPlay() {
        return true  // todo enable front end validation when ready
        if (this.playState.isYourTurn()) {
            // todo finish the rules here
            // todo can nope be played when it's your turn?
            return this.selectedCardsIndices.length
        }
        else {
            // todo also check the turnState is nope-able
            return this.selectedCardsIndices.length === 1 && this.playState.hand[this.selectedCardsIndices[0]].name === Cards.NOPE.name
        }
    }
    buttonIsDisabled(id) {
        return false  // todo enable front end validation when ready
        if (id === 'give-button') {
            return this.selectedCardsIndices.length !== 1
        }
        if (id === 'play-button') {
            return !this.validateCardsForPlay()
        }
    }
    findDropZoneUnderPoint(x, y) {
        const dropZones = document.querySelectorAll(".dropZone")
        for (let i = 0; i < dropZones.length; i++) {
            const box = dropZones[i].getBoundingClientRect()
            if (x > box.left && x < box.right && y > box.top && y < box.bottom) {
              return dropZones[i]
            }
        }
    }
    handleCardMouseMoveGhost(e, refEl, cardsRem, dropZone) {
        if (!cardsRem.length) {
            if (!dropZone.children.length) {
                dropZone.appendChild($('hand-card-cont-ghost'))
            }
            return
        }
        const relMouseX = e.clientX - dropZone.offsetLeft
        const cardWidth = refEl.offsetWidth  // assumes all cards are same dimensions
        const cardsOnLeftQty = Math.floor((relMouseX + (cardWidth/2) - (cardWidth * this.selectedCardsIndices.length * 0.5)) / cardWidth)
        if (cardsOnLeftQty === this.cardsOnLeftQty) {
            return
        }
        this.cardsOnLeftQty = cardsOnLeftQty
        const cardAfter = (this.cardsOnLeftQty >= cardsRem.length) ? null : $(`hand-card-cont-${cardsRem[this.cardsOnLeftQty]}`)

        dropZone.insertBefore($('hand-card-cont-ghost'), cardAfter)
    }
    handleCardMouseMove(e, cont, refEl, cardsRem, squish) {
        e.preventDefault()

        cont.style.top = (e.clientY - (cont.offsetHeight/2)) + "px"
        cont.style.left = (e.clientX - (cont.offsetWidth/2)) + "px"

        const dropZone = this.findDropZoneUnderPoint(e.clientX, e.clientY)

        if (dropZone !== this.currentDropZone) {
            if (dropZone) {
                // -> drag enter zone
                dropZone.classList.add('dropZoneHover')

                if (dropZone.id === 'playerHand') {
                    const ghost = document.body.appendChild(document.createElement('div'))
                    ghost.classList.add('flex')
                    ghost.id = 'hand-card-cont-ghost'
                    ghost.innerHTML = `<div class="fuCard"><div class="fuCardInner"></div></div>`.repeat(this.selectedCardsIndices.length)

                    if (squish) {
                        $(this.renderNodeId).classList.add('squish')
                        $$$('.fuCard').forEach(c => {
                            if (squish.margin) {c.style.marginLeft = squish.margin;  c.style.marginRight = squish.margin}

                            if (Object.keys(squish).length > 1) {
                                c.style.paddingLeft = squish.padding;  c.style.paddingRight = squish.padding
                                c.firstElementChild.style.width = squish.width; c.firstElementChild.style.height = squish.height
                                c.firstElementChild.style.fontSize = squish.fontSize
                            }
                        })
                    }
                }
            }
            if (this.currentDropZone) {
                // -> drag leave zone
                this.currentDropZone.classList.remove('dropZoneHover')
                // cont.classList.remove('draggableHandHover')
                if (this.currentDropZone.id === 'playerHand') {
                    $('hand-card-cont-ghost').remove()
                    this.cardsOnLeftQty = null

                    if (squish) {
                        $(this.renderNodeId).classList.remove('squish')
                        $$$('.fuCard').forEach(c => {
                            for (let k of ['margin-left', 'margin-right', 'padding-left', 'padding-right', 'width', 'height', 'font-size']) {
                                c.style.removeProperty(k)
                            }
                        })
                    }
                }
            }
            this.currentDropZone = dropZone
        }

        if (dropZone && dropZone.id === 'playerHand') {
            this.handleCardMouseMoveGhost(e, refEl, cardsRem, dropZone)
        }
    }
    handleCardMouseUp(e, cont, cardsRem, _handleCardMouseMove, _handleCardMouseUp) {
        if (this.currentDropZone && (this.currentDropZone.id === 'playerHand' && $('hand-card-cont-ghost'))) {
            // drag completed on player hand drop zone
            $('hand-card-cont-ghost').replaceWith(...cont.children)
            cardsRem.splice(this.cardsOnLeftQty, 0, ...this.selectedCardsIndices)

            if (!cardsRem.every((c, i) => !i || c > cardsRem[i-1])) {
                const newSelection = this.selectedCardsIndices.map((_, i) => this.cardsOnLeftQty + i)
                // card order has changed (is no longer ascending)
                console.log("UPDATE HAND", cardsRem)
                apiPost("/action", {
                    action: "update-hand",
                    updatedHandIndices: cardsRem,
                    ...this.playState.apiParams()
                }).then(() => {
                    this.selectedCardsIndices = newSelection
                }).catch(console.error)
            }
        }
        else {
            // drag cancelled
            for (let i of this.selectedCardsIndices) {  // todo does this not work properly anymore?
                $('playerHand').insertBefore($(`hand-card-cont-${i}`), $$(`#playerHand #hand-card-cont-${i + 1}`) || null)
            }
        }
        cont.remove()
        this.currentDropZone?.classList.remove('dropZoneHover')
        this.currentDropZone = null
        this.cardsOnLeftQty = null
        $(this.renderNodeId).classList.remove('dragging', 'squish')

        window.removeEventListener("mousemove", _handleCardMouseMove)
        window.removeEventListener("mouseup", _handleCardMouseUp)
    }
    handleDragSelectedCards(e, i) {
        // todo extract all the draggable to its own class
        // todo cancel drag with esc
        e.preventDefault()

        if (!this.selectedCardsIndices.includes(i)) {
            this.selectedCardsIndices.push(i)
            $(`hand-card-${i}`).classList.add('fuCardSelected')
        }
        this.selectedCardsIndices.sort((a, b) => a - b)

        const cardsRem = [...Array(this.playState.hand.length).keys()].filter(j => !this.selectedCardsIndices.includes(j))
        const refEl = cardsRem.length ? $(`hand-card-cont-${cardsRem[0]}`) : null

        const handLen = this.playState.hand.length
        let squish
        if (refEl.offsetWidth * handLen > $('playerHand').offsetWidth) {
            const winW = window.innerWidth - (5*2)  // 2 x player hand margin 5px (beware magic number!)
            const minMargin = 5, maxCardP = 15, maxCardW = 75  // hardcoded css values???
            const cardW = winW / handLen
            let minMarginCardWidth = (2*minMargin) + (2*maxCardP) + maxCardW
            if (minMarginCardWidth * handLen < winW) {
                const margin = Math.floor(minMargin + ((cardW - minMarginCardWidth) / 2))
                squish = margin < 10 ? { margin: margin + 'px' } : {}  // 10px here being normal card margin
            }
            else {
                const innerW  = Math.floor((cardW - (2*minMargin)) * maxCardW/((2*maxCardP)+maxCardW))
                const padding = Math.floor((cardW - (2*minMargin)) * maxCardP/((2*maxCardP)+maxCardW))
                const fontSize = 16 * innerW/maxCardW //  hardcoded css values???
                squish = {
                    width: innerW + 'px',
                    height: Math.floor(4 * innerW / 3) + 'px',
                    padding: padding + 'px',
                    margin: minMargin + 'px',
                    fontSize: fontSize + 'px',
                }
            }
        }

        const cont = document.body.appendChild(document.createElement('div'))
        cont.id = 'drag-hand-cards'
        cont.classList.add('draggable', 'flex')
        for (let idx of this.selectedCardsIndices) {
            cont.appendChild($(`hand-card-cont-${idx}`))
        }

        cont.style.top = (e.clientY - (cont.offsetHeight/2)) + "px"
        cont.style.left = (e.clientX - (cont.offsetWidth/2)) + "px"

        $(this.renderNodeId).classList.add('dragging')

        const handleCardMouseMove = e => this.handleCardMouseMove(e, cont, refEl, cardsRem, squish)
        const handleCardMouseUp = e => this.handleCardMouseUp(e, cont, cardsRem, handleCardMouseMove, handleCardMouseUp)
        window.addEventListener("mousemove", handleCardMouseMove)
        window.addEventListener("mouseup", handleCardMouseUp)
    }
    bindEvents() {
        const { game, playerId } = this.playState

        // player selects their cards when clicked
        if (this.matchState === MatchState.PLAYING) {
            for (let i = 0; i < this.playState.hand.length; i++) {
                $(`hand-card-${i}`).addEventListener("click", (e) => {
                    if (this.selectedCardsIndices.includes(i)) {
                        this.selectedCardsIndices = this.selectedCardsIndices.filter(c => c!== i)
                        $(`hand-card-${i}`).classList.remove('fuCardSelected')
                    }
                    else {
                        if (this.playState.isGivingFavour()) {
                            this.selectedCardsIndices = []
                            document.querySelectorAll('.fuCard').forEach(c => c.classList.remove('fuCardSelected'))
                        }
                        this.selectedCardsIndices.push(i)
                        $(`hand-card-${i}`).classList.add('fuCardSelected')
                    }
                    document.querySelectorAll('#playerHandActions button').forEach(b => {b.disabled = this.buttonIsDisabled(b.id)})
                })
                $(`hand-card-${i}`).addEventListener("mousedown", (e) => {
                    // todo keep cards mousemove-ing if re-render
                    if (e.button !== 0) {
                        return
                    }
                    this.activeTimer = setTimeout(() => {this.handleDragSelectedCards(e, i)}, 500)
                    const handleMouseUp = (e) => {
                        clearTimeout(this.activeTimer)
                        this.activeTimer = null
                        window.removeEventListener("mouseup", handleMouseUp)
                    }
                    window.addEventListener("mouseup", handleMouseUp)
                })
            }
        }

        // check whether to disable any buttons
        document.querySelectorAll('button').forEach(b => b.disabled = this.buttonIsDisabled(b.id))

        $("pick-button")?.addEventListener("click", e => {
            apiPost("/action", {
                action: "pick",
                ...this.playState.apiParams()
            }).catch(alert)
        })

        $("play-button")?.addEventListener("click", () => {
            console.log("PLAY")
            apiPost("/action", {
                action: "play",
                cardIndices: this.selectedCardsIndices,
                ...this.playState.apiParams()
            }).then(() => {
                this.selectedCardsIndices = []
                document.querySelectorAll('.fuCard').forEach(c => c.classList.remove('fuCardSelected'))
            }).catch(alert)
        })

        $("restart-button")?.addEventListener("click", () => {
            console.log("RESTART")
            apiPost("/action", { action: "restart", ...this.playState.apiParams() }).catch(alert)
        })

        $("exit-button")?.addEventListener("click", () => {
            console.log("EXIT")
            apiGet("/leave", { ...this.playState.apiParams() }).catch(alert)
            setScreen(new MenuScreen())
        })

        $("nope-button")?.addEventListener("click", () => {
            console.log("NOEP")
            apiPost("/action", { playerId, action: "nope" }).catch(alert)
        })

        // handle clicking on a player
        if (game.matchState === MatchState.PLAYING && this.playState.chooseOppEnabled()) {
            game.players.forEach(p => {
                if (p.playerId === playerId || !this.playState.playerAvailable(p)) {
                    return
                }
                $(`oppHand-${p.playerId}`).addEventListener('click', () => {
                    console.log('CLICKED PLAYER', p.playerName, p.playerId)
                    apiPost("/action", {
                        action: "clicked-player",
                        targetPlayerId: p.playerId,
                        ...this.playState.apiParams()
                    }).catch(alert)
                })
            })
        }

        // handle clicking on other player's fanned out cards (combo2)
        document.querySelectorAll('#combo2OppHand .fdCard').forEach(c => {
            const index = parseInt(c.id.split('-').pop())
            c.addEventListener('click', () => {
                console.log(`${index} card clicked`)
                apiPost("/action", {
                    action: "clicked-card",
                    targetCardIndex: index,
                    ...this.playState.apiParams()
                }).catch(alert)
            })
        })

        // handle nominating a card (combo3)
        document.querySelectorAll('#combo3AllOptions .fuCardB').forEach(c => {
            const cardVal = parseInt(c.id.split('-').pop())
            c.addEventListener('click', () => {
                console.log(`${cardVal} card nominated`)
                apiPost("/action", {
                    action: "clicked-card",
                    targetCard: cardVal,
                    ...this.playState.apiParams()
                }).catch(alert)
            })
        })

        // handle reclaiming a card (combo5)
        document.querySelectorAll('#combo5DiscardPile .fuCardB').forEach(c => {
            const index = parseInt(c.id.split('-').pop())
            c.addEventListener('click', () => {
                console.log(`${index} card clicked`)
                apiPost("/action", {
                    action: "clicked-card",
                    targetCardIndex: index,
                    ...this.playState.apiParams()
                }).catch(alert)
            })
        })

        // handle giving a selected card (favour)
        $("give-button")?.addEventListener("click", () => {
            console.log("PLAY")
            apiPost("/action", {
                action: "clicked-card",
                targetCardIndex: this.selectedCardsIndices[0],
                ...this.playState.apiParams()
            }).then(() => {
                this.selectedCardsIndices = []
                document.querySelectorAll('.fuCard').forEach(c => c.classList.remove('fuCardSelected'))
            }).catch(alert)
        })

        // handle reinserting a card (defusing)
        document.querySelectorAll('#defusingRemPile .defusingRemPick').forEach(c => {
            const index = parseInt(c.id.split('-').pop())
            c.addEventListener('click', () => {
                apiPost("/action", {
                    action: "submit-slider",
                    insertPos: index,
                    ...this.playState.apiParams()
                }).catch(alert)
            })
        })

        $('debugPilesCheck')?.addEventListener('change', e => {
            if (this.debugPiles !== e.target.checked) {
                this.debugPiles = e.target.checked
                $(this.debugPiles ? 'matchPiles': 'matchStacks').classList.add('hidden')
                $(this.debugPiles ? 'matchStacks': 'matchPiles').classList.remove('hidden')
                $(this.debugPiles ? 'matchStacks': 'matchPiles').appendChild($('matchPlayAreaActions'))
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


const compareState = (oldState, newState) => {
    const keys1 = ['matchState', 'turnState', 'playerTurn', 'attackedId', 'targetPlayerId', 'winner']

    for (let key of keys1) {
        if (oldState[key] !== newState[key]) {
            return false
        }
    }

    const keys2 = ['hands', 'players']
    const keys3 = ['discard', 'remainder']

    for (let _keys of [keys2, keys3]) {
        for (let key of _keys) {
            if (!objEqual(oldState[key], newState[key])) {
                return false
            }
        }
    }

    if (!objEqual(Object.keys(oldState), Object.keys(newState))) {
        return false
    }

    const keys4 = []
    const keys = [].concat(keys1, keys2, keys3)
    Object.keys(oldState).forEach(k => {if (!keys.includes(k) && !keys4.includes(k)) keys4.push(k)})
    Object.keys(newState).forEach(k => {if (!keys.includes(k) && !keys4.includes(k)) keys4.push(k)})

    for (let key of keys4) {
        if (!_isObjEqual(oldState[key], newState[key])) {
            return false
        }
    }

    return true
}


const modal = (state) => {
    return `
<div class="modal fade show" id="exampleModalCenter" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
        ${modalContent(state)}
        ${modalFooter(state)}
    </div>
  </div>
</div>

<div class="modal-backdrop fade show"></div>
`
}

const modalContent = (state) => {
    if (state.turnState === TS_COMBO2_STEALING) {
        return combo2StealingModal(state)
    }
    if (state.turnState === TS_COMBO3_NOMINATING) {
        return combo3NominatingModal()
    }
    if (state.turnState === TS_COMBO5_RECLAIMING) {
        return combo5ReclaimingModal(state)
    }
    if (state.turnState === TS_DEFUSING) {
        return defusingModal(state)
    }
    return ''
}

const combo2StealingModal = (state) => {
    const len = state.playerCardCount(state.targetPlayer)
    return `
    <div id="combo2OppHand">
    ${Array.from({length: len}, (_, i) => `<div class="fdCard" id="combo2pick-${i}"></div>`).join('')}
    </div>
    `
}

const combo3NominatingModal = () => {
    const half2 = Object.values(Cards).filter(c => c.name !== Cards.BOMB.name)
    const half1 = half2.splice(0, half2.length / 2)
    console.log([...half1, ...half2])
    return `
    <div id="combo3AllOptions">
        ${[half1, half2].reduce((u, h) => u + `
            <div class="combo3OptionsRow">
                ${h.reduce((v, c) => v + `<div class="fuCardB enabled fuCard${getShortCardName(c.name)}" id="fuCard-${c.value}">${getCardInnerHtml(c)}</div>`, "")}
            </div>
        `, "")}
    </div>
    `
}

const combo5ReclaimingModal = (state) => {
    return `
    <div id="combo5DiscardPile">
        ${state.game.discard.reduce((v, c, i) => v + `<div class="fuCardB fuCard${getShortCardName(c.name)} ${c.name !== Cards.BOMB.name ? 'enabled': ''}" id="fuCard-${i}">${getCardInnerHtml(c)}</div>`, "")}
    </div>
    `
}

const defusingModal = (state) => {
    const len = state.game.remainder.length  // todo this comes from server eventually ?
    return `
    <div id="defusingRemPile">
        ${Array.from({length: len}, (_, i) => `<div class="defusingRemPick" id="defusingRemPick-${i}">${i ? `${i}` : 'top'}</div><div class="fdCard"></div>`).join('')}
        <div class="defusingRemPick" id="defusingRemPick-${len}">bottom</div>
    </div>
    `
}

const modalFooter = (state) => {
    return `
    <div>
        <hr>
        ${getTurnStateMsg(state)}                
    </div>
    `
}
