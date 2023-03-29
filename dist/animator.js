import { $, $$$ } from "/dollar.js"
import Cards, { getShortCardName, getCardInnerHtml } from "/cards.js"
import { TurnStates as TS, TurnStateTimers } from "/turn.js"

const getRelativeXY = (el, refEl) => ({
    x: refEl.offsetLeft + refEl.offsetWidth/2 - el.offsetWidth/2,
    y: refEl.offsetTop + refEl.offsetHeight/2 - el.offsetHeight/2,
})

const getStartEndXY = (el, startId, endId) => {
    const xy0 = getRelativeXY(el, $(startId))
    const xy1 = getRelativeXY(el, $(endId))
    return {x0: xy0.x, y0: xy0.y, x1: xy1.x, y1: xy1.y}
}

const getStartEndBoxes = (el, startId, endId) => {
    const startEl = $(startId), endEl =  $(endId)
    const { offsetLeft: x0, offsetTop: y0, offsetWidth: w0, offsetHeight: h0 } = startEl
    const { offsetLeft: x1, offsetTop: y1, offsetWidth: w1, offsetHeight: h1 } = endEl
    return { x0, y0, w0, h0,  x1, y1, w1, h1 }
}

const rotate = (x, y, theta) => [
    x * Math.cos(theta) - y * Math.sin(theta),
    x * Math.sin(theta) + y * Math.cos(theta)
]

const lerp = (start, end, t) => (1-t)*start + t*end

const linearT = (elapsed, target) => elapsed/target

const rampT = (elapsed, target) => Math.min((2*elapsed/target), 2-(2*elapsed/target))

const jerkT = () => Math.random()

const time = (ts) =>  TurnStateTimers[ts] / 1000


export default class Animator {
    clock = 0;

    constructor(match) {
        this.match = match
        this.animations = []
    }
    getCallbackChecklist() {
        const match = this.match
        const check = (f) => ({checked: false, callback: f})
        const checklist = {
            playCard: check((fromAnimator) => match.updateDiscardPileAnim(fromAnimator)),
            updateHand: check((fromAnimator) => match.updatePlayerHandAnim(fromAnimator)),
        }
        for (let playerId of match.playState.getOtherPlayerIds()) {
            checklist[`deckPick${playerId}`] = check((fromAnimator) => {
                match.updateOppHandAnim(playerId, fromAnimator)
            })
        }
        return checklist
    }
    queueAnimations(oldState, newState) {
        const {turnState: oldTS} = oldState
        const {turnState: newTS} = newState

        const changedTS = oldTS !== newTS
        const yourTurn = newState.isYourTurn()
        const currPlayer = newState.currentPlayer.playerId
        const targPlayer = newState.targetPlayer?.playerId
        const noper = newState.game.noperId

        const checklist = this.getCallbackChecklist()

        // CLEANUP
        $$$('.animated.seeFutAnim').forEach((el) => {
            if (oldTS !== TS.SEE_FUTURE) el.remove()
        })
        $$$('.animated.bombCardAnim').forEach((el) => {
            if (oldTS !== TS.DEFUSING) el.remove()
        })

        // deck pick
        if (newTS === TS.PICKED && changedTS && !yourTurn) {
            this.animations.push(animateDeckPick(checklist, currPlayer))
        }

        // playing card(s)
        if (
            (newTS.startsWith('PLAYING_') && changedTS && !yourTurn) ||
            (newTS.startsWith('NOPE_') && changedTS && noper !== newState.playerId)
        ) {
            const isNope = newTS.startsWith('NOPE_')
            const cardsLen = { [TS.PLAYING_COMBO2]: 2, [TS.PLAYING_COMBO3]: 3, [TS.PLAYING_COMBO5]: 5 }[newTS] || 1
            const cards = newState.game.discard.slice(0, cardsLen).reverse()
            this.animations.push(animatePlayCards(checklist, isNope ? noper : currPlayer, cards, isNope?0.4:0.75))
        }

        // seeing future (in)
        if (newTS === TS.SEE_FUTURE && changedTS && !yourTurn) {
            this.animations.push(animateSeeFutureIn(currPlayer))
        }
        // seeing future (out)
        if (oldTS === TS.SEE_FUTURE && changedTS && !yourTurn) {
            this.animations.push(animateSeeFutureOut())
        }

        const card = newState.game.nominatedCard
        const cardMargin = this.match.getCardMargin(newState.hand.length)
        // favour/combo2 aftermath
        if (
            (newTS === TS.POST_FAVOUR && changedTS && targPlayer !== newState.playerId) ||
            (newTS === TS.POST_COMBO2 && changedTS)
        ) {
            this.animations.push(animatePostCombo2Favour(checklist, targPlayer, currPlayer, newState.playerId, cardMargin))
        }

        // combo3 aftermath
        if (newTS === TS.POST_COMBO3 && changedTS && card.targetHas) {
            const cardIndex = oldState.hand.findIndex(c => c.value === card.card.value)
            this.animations.push(animatePostCombo3(checklist, targPlayer, currPlayer, newState.playerId, card.card, cardIndex, cardMargin))
        }

        // combo5 aftermath
        if (newTS === TS.POST_COMBO5 && changedTS) {
            this.animations.push(animatePostCombo5(checklist, currPlayer, newState.playerId, card.card, cardMargin))
        }

        // shuffle
        if (newTS === TS.SHUFFLING && changedTS) {
            this.animations.push(animateShuffling())
        }

        // defusing (play defuse)
        if (newTS === TS.DEFUSING && changedTS && !yourTurn) {
            animateDefusingPre(currPlayer)
            this.animations.push(animatePlayCards(checklist, currPlayer, [Cards.DEFUSE], 1))
        }
        // defusing (replace bomb)
        if (oldTS === TS.DEFUSING && changedTS && !oldState.isYourTurn()) {
            this.animations.push(animateDefusing())
        }

        //  exploded
        if (newTS === TS.BOMBED && changedTS && !yourTurn) {
            this.animations.push(animateBombed(currPlayer))
        }


        // run all callbacks not being animated
        for (let key of Object.keys(checklist)) {
            if (!checklist[key].checked) {
                checklist[key].callback(false)
            }
        }
    }
    runAnimation(animation, dt) {
        animation.elapsedT = Math.min(animation.elapsedT+dt, animation.targetT)

        const { nodes, elapsedT, targetT } = animation

        for (let node of nodes) {
            const { el, func } = node
            const { x0, y0, w0, h0, sx0, sy0, a0 } = node
            const { x1, y1, w1, h1, sx1, sy1, a1 } = node

            const t = (func || linearT)(elapsedT, targetT)
            y0 !== undefined && (el.style.top = lerp(y0, y1, t) + 'px')
            x0 !== undefined && (el.style.left = lerp(x0, x1, t) + 'px')
            w0 !== undefined && (el.style.width = lerp(w0, w1, t) + 'px')
            h0 !== undefined && (el.style.height = lerp(h0, h1, t) + 'px')
            a0 !== undefined && (el.style.opacity = lerp(a0, a1, t))

            sx0 !== undefined && (el.style.transform = `scale(${lerp(sx0, sx1, t)}, ${lerp(sy0, sy1, t)})`)
        }
        if (elapsedT+1e-6 >= targetT) {
            animation.done = true
        }
    }
    clearAnimations() {
        this.animations = this.animations.filter(animation => {
            if (animation.done) {
                animation.callback()
                return false
            }
            return true
        })
    }
    render(t) {
        const dt = t - this.clock;
        this.clock = t;

        for (let animation of this.animations) {
            this.runAnimation(animation, dt)
        }
        this.clearAnimations()
    }
}


const animateDeckPick = (checklist, player) => {
    // TODO un-dupe all these
    const el = document.body.appendChild(document.createElement('div'))
    el.classList.add('animated', 'fduCard', 'fuCardB')
    el.style.padding = '0'

    const xywh = getStartEndBoxes(el, 'matchRemPileTopCard', `oppHandInner-${player}`)

    const key = `deckPick${player}`
    const callback = () => {
        el.remove()
        checklist[key].callback(true)
    }
    checklist[key].checked = true
    return { nodes: [{el, ...xywh, a0: 1, a1: 0.85}], elapsedT: 0, targetT: time(TS.PICKED), callback }
}

const animatePlayCards = (checklist, player, cards, targetT) => {
    const cardsMid =  (cards.length/2) - 0.5

    const nodes = cards.map((card, i) => {
        const el = document.body.appendChild(document.createElement('div'))
        el.classList.add('animated', 'fuCardB', `fuCard${getShortCardName(card)}`)
        el.innerHTML = `<div class="fuCardInner">${getCardInnerHtml(card)}</div>`

        const xy = getStartEndXY(el, `oppHandInner-${player}`, 'matchDiscardPile')
        const {offsetWidth: w0, offsetHeight: h0} = $(`oppHandInner-${player}`)
        const {offsetWidth: w1, offsetHeight: h1} = el
        const s = {sx0: w0/w1, sy0: h0/h1, sx1: 1, sy1: 1}

        const x1 = (i-cardsMid) * w1 * 0.25 + xy.x1, y1 = (i-cardsMid) * h1 * 0.125 + xy.y1

        return { el, ...xy, ...s, a0: 0.85, a1: 1, x1, y1 }
    })

    const callback = () => {
        nodes.forEach(n => n.el.remove())
        checklist.playCard.callback(true)
    }
    checklist.playCard.checked = true
    return { nodes, elapsedT: 0, targetT, callback }
}

const animateSeeFutureIn = (player) => {
    const nodes = [-1, 0, 1].map((i) => {
        const el = document.body.appendChild(document.createElement('div'))
        el.classList.add('animated', 'fduCard', 'fuCardB', 'seeFutAnim')
        el.style.padding = '0'

        const xywh = getStartEndBoxes(el, 'matchRemPileTopCard', `oppHandInner-${player}`)

        const {x0, y0, x1, y1} = xywh
        const dx = x1-x0, dy = y1-y0
        const [dx1, dy1] = rotate(dx, dy, i*50/Math.hypot(dx, dy))

        return { el, ...xywh, a0: 1, a1: 0.85, x1: x0+dx1, y1: y0+dy1 }
    })

    const callback = () => {}
    return { nodes, elapsedT: 0, targetT: 1, callback }
}
const animateSeeFutureOut = () => {
    const nodes = []

    const { offsetLeft: x1, offsetTop: y1, offsetWidth: w1, offsetHeight: h1 } = $('matchRemPileTopCard')

    $$$('.animated.seeFutAnim').forEach((el) => {
        el.classList.remove('seeFutAnim')
        const { offsetLeft: x0, offsetTop: y0, offsetWidth: w0, offsetHeight: h0 } = el
        nodes.push({
            el,
            x0, y0, w0, h0, a0: +el.style.opacity,
            x1, y1, w1, h1, a1: 1,
        })
    })

    const callback = () => {
        nodes.forEach(n => n.el.remove())
    }
    return { nodes, elapsedT: 0, targetT: 1, callback }
}

const animatePostCombo2Favour = (checklist, giver, receiver, playerId, cardMargin) => {
    const el = document.body.appendChild(document.createElement('div'))
    el.classList.add('animated', 'fduCard', 'fuCardB')
    el.style.padding = '0'

    const nodes = []

    if (playerId !== giver && playerId !== receiver) {
        const xywh = getStartEndBoxes(el, `oppHandInner-${giver}`, `oppHandInner-${receiver}`)
        nodes.push({el, ...xywh})
    }
    else if (playerId === receiver) {
        const ghost = document.body.appendChild(document.createElement('div'))
        ghost.classList.add('flex', 'invis')
        ghost.innerHTML = `<div class="fuCard" id="combo2Ghost"><div class="fuCardInner"></div></div>`
        $('playerHand').appendChild(ghost)
        $$$('.fuCard').forEach(c => {c.style.margin = cardMargin + 'px'})

        const xywh = getStartEndBoxes(el, `oppHandInner-${giver}`, 'combo2Ghost')
        nodes.push({el, ...xywh})
    }
    else if (playerId === giver) {
        const xy = getStartEndXY(el, 'playerHand', `oppHandInner-${receiver}`)
        const {offsetWidth: w0, offsetHeight: h0} = $('matchRemPileTopCard')
        const {offsetWidth: w1, offsetHeight: h1, offsetLeft: x1, offsetTop: y1, } = $(`oppHandInner-${receiver}`)
        nodes.push({ el, ...xy, x1, y1, w0, h0, w1, h1, a0: 0, a1: 1 })
    }

    const key = playerId === receiver ? 'updateHand' : `deckPick${receiver}`

    const callback = () => {
        nodes.forEach(n => n.el.remove())
        checklist[key].callback(true)
    }
    checklist[key].checked = true
    return { nodes, elapsedT: 0, targetT: time(TS.POST_COMBO2), callback }
}

const animatePostCombo3 = (checklist, giver, receiver, playerId, card, cardIndex, cardMargin) => {
    const el = document.body.appendChild(document.createElement('div'))
    el.classList.add('animated', 'fuCardB', `fuCard${getShortCardName(card)}`)
    el.innerHTML = `<div class="fuCardInner">${getCardInnerHtml(card)}</div>`
    const { offsetWidth: w1, offsetHeight: h1 } = el

    const nodes = []

    if (playerId !== giver && playerId !== receiver) {
        const xy = getStartEndXY(el, `oppHandInner-${giver}`, `oppHandInner-${receiver}`)
        const {offsetWidth: w0, offsetHeight: h0} = $(`oppHandInner-${giver}`)
        const s = {sx0: w0/w1, sy0: h0/h1, sx1: 1, sy1: 1}
        nodes.push({ el, ...xy, a0: 0.85, a1: 1 })
        nodes.push({ el, ...s, func: rampT })
    }
    else if (playerId === receiver) {
        const ghost = document.body.appendChild(document.createElement('div'))
        ghost.classList.add('flex', 'invis')
        ghost.innerHTML = `<div class="fuCard" id="combo3Ghost"><div class="fuCardInner"></div></div>`
        $('playerHand').appendChild(ghost)
        $$$('.fuCard').forEach(c => {c.style.margin = cardMargin + 'px'})

        const xy = getStartEndXY(el, `oppHandInner-${giver}`, 'combo3Ghost')
        const {offsetWidth: w0, offsetHeight: h0} = $(`oppHandInner-${giver}`)
        const s = {sx0: w0/w1, sy0: h0/h1, sx1: 1, sy1: 1}
        nodes.push({ el,...xy, ...s, a0: 0.85, a1: 1 })
    }
    else if (playerId === giver) {
        console.log(cardIndex)
        const ghost = document.body.appendChild(document.createElement('div'))
        ghost.classList.add('flex', 'invis')
        ghost.innerHTML = `<div class="fuCard" id="combo3Ghost"><div class="fuCardInner"></div></div>`
        $(`hand-card-cont-${Math.max(0, cardIndex)}`).replaceWith(ghost)

        const xy = getStartEndXY(el, 'combo3Ghost', `oppHandInner-${receiver}`)
        const {offsetWidth: w0, offsetHeight: h0} = $(`oppHandInner-${receiver}`)
        const s = {sx0: 1, sy0: 1, sx1: w0/w1, sy1: h0/h1 }
        nodes.push({ el, ...xy, ...s, a0: 1, a1: 0.85 })
    }

    const keys = [playerId === receiver ? 'updateHand' : `deckPick${receiver}`]
    if (playerId === giver && !keys.includes('updateHand')) {
        keys.push('updateHand')
    }

    const callback = () => {
        nodes.forEach(n => n.el.remove())
        keys.forEach(key => checklist[key].callback(true))
    }
    keys.forEach(key => checklist[key].checked = true)
    return { nodes, elapsedT: 0, targetT: time(TS.POST_COMBO3), callback }
}

const animatePostCombo5 = (checklist, receiver, playerId, card, cardMargin) => {
    const el = document.body.appendChild(document.createElement('div'))
    el.classList.add('animated', 'fuCardB', `fuCard${getShortCardName(card)}`)
    el.innerHTML = `<div class="fuCardInner">${getCardInnerHtml(card)}</div>`
    const { offsetWidth: w1, offsetHeight: h1 } = el

    const nodes = []

    if (playerId !== receiver) {
        const xy = getStartEndXY(el, 'matchDiscardPile', `oppHandInner-${receiver}`)
        const {offsetWidth: w0, offsetHeight: h0} = $(`oppHandInner-${receiver}`)
        const s = {sx0: 1, sy0: 1, sx1: w0/w1, sy1: h0/h1 }
        nodes.push({ el, ...xy, ...s, a0: 0.85, a1: 1 })
    }
    else {
        const ghost = document.body.appendChild(document.createElement('div'))
        ghost.classList.add('flex', 'invis')
        ghost.innerHTML = `<div class="fuCard" id="combo5Ghost"><div class="fuCardInner"></div></div>`
        $('playerHand').appendChild(ghost)
        $$$('.fuCard').forEach(c => {c.style.margin = cardMargin + 'px'})

        const xy = getStartEndXY(el, 'matchDiscardPile', 'combo5Ghost')
        nodes.push({ el,...xy, a0: 0.85, a1: 1 })
    }

    const key = playerId === receiver ? 'updateHand' : `deckPick${receiver}`

    const callback = () => {
        nodes.forEach(n => n.el.remove())
        checklist[key].callback(true)
    }
    checklist[key].checked = true
    return { nodes, elapsedT: 0, targetT: time(TS.POST_COMBO5), callback }
}

const animateShuffling = () => {
    const topCard = $('matchRemPileTopCard')
    topCard.style.zIndex = '10'
    const {offsetLeft: x, offsetTop: y} = topCard

    const nodes = [0, 1, 2].map(i => {
        const el = document.body.appendChild(document.createElement('div'))
        el.classList.add('animated', 'fduCard', 'fuCardB')
        el.innerHTML = `<div class="fuCardInner"></div>`
        el.style.zIndex = '5'
        const shakes = [{x0: x-5, y0: y-5, x1: x+5, y1: y+5}, {x0: x-5, y0: y, x1: x+5, y1: y}, {x0: x-5, y0: y+7, x1: x+5, y1: y-7}]
        return {el, ...shakes[i], func: jerkT}
    })
    const callback = () => {
        nodes.forEach(n => n.el.remove())
    }
    return { nodes, elapsedT: 0, targetT: time(TS.SHUFFLING), callback }
}

const animateDefusingPre = (player) => {
    const card = Cards.BOMB
    const el = document.body.appendChild(document.createElement('div'))
    el.classList.add('animated', 'fuCardB', `fuCard${getShortCardName(card)}`, 'bombCardAnim')
    el.id = `bombCardAnim${player}`
    el.innerHTML = `<div class="fuCardInner">${getCardInnerHtml(card)}</div>`
    const { offsetWidth: w1, offsetHeight: h1 } = el

    const oppHand = $(`oppHandInner-${player}`)
    const {x, y} = getRelativeXY(el, oppHand)
    const {offsetWidth: w0, offsetHeight: h0} = oppHand
    el.style.left = x+'px'; el.style.top = y+'px'
    el.style.transform = `scale(${w0/w1}, ${h0/h1})`
    el.style.opacity = '0.85'
}

const animateDefusing = () => {
    const nodes = []

    const { offsetLeft: x1, offsetTop: y1, offsetWidth: w1, offsetHeight: h1 } = $('matchRemPileTopCard')

    $$$('.animated.bombCardAnim').forEach((el) => {
        el.classList.remove('bombCardAnim')
        const { offsetLeft: x0, offsetTop: y0, offsetWidth: w0, offsetHeight: h0 } = el
        const s = {sx0: w0/w1, sy0: h0/h1, sx1: 1, sy1: 1}
        nodes.push({
            el, ...s,
            x0, y0, a0: 1,
            x1, y1, a1: 0.25,
        })
    })

    const callback = () => {
        nodes.forEach(n => n.el.remove())
    }
    return { nodes, elapsedT: 0, targetT: 1, callback }
}

const animateBombed = (player) => {
    animateDefusingPre(player)
    const el = $(`bombCardAnim${player}`)
    el.classList.remove('bombCardAnim')

    const callback = () => {
        el.remove()
    }
    return { nodes: [{el, a0: 1, a1:0}], elapsedT: 0, targetT: time(TS.BOMBED), callback }
}
