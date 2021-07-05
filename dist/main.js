// ==================
// Main script
// ==================

// const Cards = import("/cards.js")
import Cards, { getShortCardName, getCardInnerHtml } from "/cards.js"
import renderModal from "/modals.js"
import { TurnStates } from "/turn.js"
import Draggable from "/draggable.js"
import { $, $$, $$$ } from "/dollar.js"
import { ChooseOppTurnStates, ModalTurnStates, ComboTurnStates, getTurnStateMsg } from "/turn_states.js"
import { apiPost, apiGet } from "/api_client.js"

const MatchState = {
    WAITING: 0,
    PLAYING: 1,
    COMPLETE: 2
}


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
        return this.turnState === TurnStates.FAVOUR_RECEIVING && this.game.targetPlayerId === this.playerId
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
    forceRerender() {
        // temp hack
        render()
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
        this.debugPiles = false
        this.draggable = new Draggable(this)
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
            // todo ?? found the below bug by chance. need to examine all the ways in which player's hand may be changed
            this.selectedCardsIndices = this.selectedCardsIndices.filter(i => i < this.playState.hand.length)
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
        const { playerId, playerName, gameId } = this.playState
        return `
            <div id="matchPlayCont">
                <div id="matchPlayersTop">${this.renderOppHand('top')}</div>
                <div id="matchPlayBottom">
                    <div id="matchPlayersLeft">${this.renderOppHand('left')}</div>
                    <div id="matchPlayArea">
                        <div id="matchPilesCont">
                            ${this.renderMatchPiles()}
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
                    <div id="playerHandActionsAligner"></div>
                    <div class="hidden" id="playerHandActions">
                        <button id="play-button">play</button>
                        <button id="nope-button">nope</button>
                        ${this.playState.isGivingFavour() ? `<button id="give-button">give</button>` : ''}
                    </div>
                    <div class="hidden" id="debugCont">
                        <input type="checkbox" id="debugPilesCheck" ${this.debugPiles ? 'checked' : ''}><label for="debugPilesCheck">debug</label>
                    </div>
                    <div class="playerInfo">${playerName} (${playerId}) (${gameId})</div>
                </div>
            </div>
            ${this.playState.showModal() ? renderModal(this.playState) : ''}
        `
    }
    calcDiscardPositions(posLength, size) {
        const refEl = $$('#matchDiscardPile .fuCardB')  // one of these should always exist in the dom
        const cH = refEl.offsetHeight, cW = refEl.offsetWidth
        const positions = posLength <= 4 ? [
            {top: (0.00 - 0) * cH, left: 0.00 * cW},  // 0
            {top: (0.05 - 1) * cH, left: 0.85 * cW},  // 1
            {top: (0.50 - 2) * cH, left: 0.53 * cW},  // 2
            {top: (0.10 - 3) * cH, left: 1.70 * cW},  // 3
        ] : [
            {top: (0.00 - 0) * cH, left: 1.06 * 0.0 * cW},  // 0
            {top: (0.00 - 1) * cH, left: 1.06 * 1.0 * cW},  // 1
            {top: (0.52 - 2) * cH, left: 1.06 * 0.5 * cW},  // 2
            {top: (0.00 - 3) * cH, left: 1.06 * 2.0 * cW},  // 3
            {top: (0.52 - 4) * cH, left: 1.06 * 1.5 * cW},  // 4

            {top: ((0.52 * 2.0) - 5) * cH, left: 1.06 * 0.0 * cW},  // 5
            {top: ((0.52 * 2.0) - 6) * cH, left: 1.06 * 1.0 * cW},  // 6
            {top: ((0.52 * 2.0) - 7) * cH, left: 1.06 * 2.0 * cW},  // 7
            {top: ((0.52 * 3.0) - 8) * cH, left: 1.06 * 0.5 * cW},  // 8
            {top: ((0.52 * 3.0) - 9) * cH, left: 1.06 * 1.5 * cW},  // 9
        ]
        if (!size) {
            return positions
        }
        return positions.map((pos, i, arr) => {
            const prev = i ? arr[i-1] : {width: 0, height:0}
            pos.width = Math.max(prev.width, pos.left + cW)
            pos.height = Math.max(prev.height, pos.top + ((i+1) * cH))
            return {width: pos.width, height: pos.height}
        })
    }
    adjustMatchDiscardPile() {
        const len = $('matchDiscardPile').children.length
        const sizes = this.calcDiscardPositions(len, true)
        const size = sizes[len-1]
        $('matchDiscardPile').style.width = `${size.width}px`
        $('matchDiscardPile').style.height = `${size.height}px`
    }
    renderDiscardPileTop(cards) {
        const { game } = this.playState
        if (!Array.isArray(cards)) {
            if (this.playState.turnState.startsWith('NOPE_')) {
                cards = game.discard.slice(0, $('matchDiscardPile').children.length+(this.preNopeDisplayed ? 0 : 1))
                this.preNopeDisplayed = false
            }
            else {
                cards = game.discard.slice(0, cards)
            }
        }
        else if (cards.length === 1 && cards[0].value === Cards.NOPE.value) {
            cards.push(...game.discard.slice(0, $('matchDiscardPile').children.length))
            this.preNopeDisplayed = true  // todo find a better solution than this?
        }
        if (cards.length === 1) {
            return `
            <div class="fuCardB fuCard${getShortCardName(cards[0])}" id="matchDiscardPileTopCard">${getCardInnerHtml(cards[0])}</div>
            `
        }
        const positions = this.calcDiscardPositions(cards.length)
        return [...cards].reverse().map((card, i) => `
        <div class="fuCardB fuCard${getShortCardName(card)}" style="position: relative; top: ${positions[i].top}px; left: ${positions[i].left}px;">
            ${getCardInnerHtml(card)}
        </div>
        `).join('')
    }
    renderMatchPiles() {
        const { game } = this.playState
        const remainderCount = game.remainder.length <= 10 ? game.remainder.length
                             : game.remainder.length < 15 ? '10+'
                             : game.remainder.length < 20 ? '15+'
                             : '?'
        const ts = this.playState.turnState
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
                ${game.discard.length ? 
                    this.renderDiscardPileTop((ComboTurnStates.includes(ts) && game.discard[0].value !== Cards.NOPE.value) ? parseInt(ts[ts.search(/COMBO/)+5]) : 1)
                  : `
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
            ${this.playState.turnState === TurnStates.DEFUSING ? 
                `<div class="fuCardB fuCard${getShortCardName(Cards.BOMB)}">${getCardInnerHtml(Cards.BOMB)}</div>` :
                `<div class="fduCard fuCardB${this.validToPickCard() ? ' enabled' : ''}" id="matchRemPileTopCard"><div class="fuCardInner">${remainderCount}</div></div>`
            }
            </div>
        `]
        const actions = [`
            <div id="matchPlayAreaActions">
                <button id="pick-button">pick</button>
            </div>
        `, '']

        return `
            <div id="matchStacks" class="${this.debugPiles ? '' : 'hidden'}">
                ${discard[0]}
                ${remainder[0]}
                ${actions[0]}
            </div>
            <div id="matchPiles" class="${this.debugPiles ? 'hidden' : ''}">
                ${discard[1]}
                ${remainder[1]}
                ${actions[1]}
            </div>
        `
    }
    renderPlayInfo() {
        return `
            <div id="playInfo">
                <div>
                    ${this.playState.isYourTurn() ? '<b>your</b>' : `<b>${this.playState.currentPlayer.playerName}</b>'s`} turn...${this.playState.attackedTurn ? ` (${this.playState.attackedTurn}/2)` : ''}
                    ${this.playState.player.alive ? "" : "YOU ARE DEAD!"}
                </div>
                <div>
                    ${this.playState.showModal() ? '' : getTurnStateMsg(this.playState)}                
                </div>
            </div>
        `
    }
    renderCard(c, i) {
        return `
        <div id="hand-card-cont-${i}">
            <div id="hand-card-${i}" class="fuCard fuCard${getShortCardName(c)}${this.selectedCardsIndices.includes(i) ? ' fuCardSelected' : ''}">
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
    validToPickCard(){
        return true  // todo complete this later
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
    bindEvents() {
        const { game, playerId } = this.playState

        if (this.matchState === MatchState.PLAYING) {
            $('matchPlayCont').addEventListener("click", e => {
                let el = e.target
                while (el) {
                    if (el.classList && el.classList.contains('enabled')) {
                        return
                    }
                    el = el.parentNode
                }
                this.selectedCardsIndices = []
                document.querySelectorAll('.fuCard').forEach(c => c.classList.remove('fuCardSelected'))
            })
        }
        if (this.matchState === MatchState.PLAYING && $('matchDiscardPile').children.length > 1) {
            this.adjustMatchDiscardPile()
        }

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
                    this.draggable.initiateDrag(e, i)
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
        $$("#matchRemPileTopCard.enabled")?.addEventListener("click", e => {  // todo change form click to draggable
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
        document.querySelectorAll('#combo5DiscardPile .fuCardB.enabled').forEach(c => {
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
            if (this.selectedCardsIndices.length != 1) {
                alert("select 1 card to give")
                return
            }
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

        // handle debug piles checkbox
        $('debugPilesCheck')?.addEventListener('change', e => {
            if (this.debugPiles !== e.target.checked) {
                this.debugPiles = e.target.checked
                $(this.debugPiles ? 'matchPiles': 'matchStacks').classList.add('hidden')
                $(this.debugPiles ? 'matchStacks': 'matchPiles').classList.remove('hidden')
                $('playerHandActions').classList[this.debugPiles ? 'remove' : 'add']('hidden')
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
