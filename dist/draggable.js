// draggable

import { $, $$, $$$ } from "/dollar.js"
import { apiPost } from "/api_client.js"
import Cards from "/cards.js"


export default class Draggable {
    constructor(match) {
        this.match = match
        this.playState = match.playState
        this.renderNodeId = match.renderNodeId
        this.dropZoneCls = 'dropZone'
        this.cardContId = 'hand-card-cont-'
        this.ghostId = `${this.cardContId}ghost`
        this.currentPlayerNode = null
        this.currentDropZone = null
        this.cardsOnLeftQty = null
        this.dragTimeout = 500
        this.moveTimeout = 50
        this.cardW = 125;  // todo dont hardcode

        this.dragee = null
        this.listeners = null
    }
    get selectedCardsIndices() {
        return this.match.selectedCardsIndices
    }
    set selectedCardsIndices(array) {
        return this.match.selectedCardsIndices = array
    }
    addListeners(listeners) {
        this.listeners = listeners
        for (let key of Object.keys(this.listeners)) {
            window.addEventListener(key, this.listeners[key])
        }
    }
    removeListeners() {
        for (let key of Object.keys(this.listeners)) {
            window.removeEventListener(key, this.listeners[key])
        }
        this.listeners = null
    }
    /** cardIdx is "deck" if card is being dragged form deck, else it is the index of selected card in hand */
    initiateDragSelectedCards(event, cardIdx) {
        const previousMouse = {x: event.clientX, y: event.clientY}
        const currentMouse = {x: event.clientX, y: event.clientY}

        const handleMouseMove = (e) => {
            currentMouse.x = e.clientX; currentMouse.y = e.clientY
        }
        window.addEventListener("mousemove", handleMouseMove)

        // do nothing if mouseup before timeout/significant mousemove
        const handleMouseUp = () => {
            cleanup()
        }
        window.addEventListener("mouseup", handleMouseUp)

        // start dragging if mousedown for long enough
        const dragDelayTimer = setTimeout(() => {
            cleanup()
            this.handleDragSelectedCards(event, cardIdx)
        }, this.dragTimeout)

        const multipleSelected = this.selectedCardsIndices.length > 1 || (this.selectedCardsIndices.length && !this.selectedCardsIndices.includes(cardIdx))
        const minSpeed = multipleSelected ? 200 : 100  // px/s
        const minDist = multipleSelected ? 40 : 20  // px
        let doubleChecked = false

        // start dragging if mouse moves significantly
        const moveInterval = setInterval(() => {
            const speed = Math.hypot(currentMouse.x-previousMouse.x, currentMouse.y-previousMouse.y) / (this.moveTimeout / 1000)  // px/s
            const dist  = Math.hypot(currentMouse.x-event.clientX, currentMouse.y-event.clientY)
            // console.log(`${speed} px/s (${speed/1000} px/ms)   dist ${dist} px`, )
            if (speed > minSpeed || dist > minDist) {
                if (doubleChecked) {
                    cleanup()
                    this.handleDragSelectedCards(event, cardIdx)
                }
                else { doubleChecked = true }
            }
            else { doubleChecked = false }
            previousMouse.x = currentMouse.x; previousMouse.y = currentMouse.y
        }, this.moveTimeout)

        const cleanup = () => {
            clearTimeout(dragDelayTimer)
            clearInterval(moveInterval)
            window.removeEventListener("mouseup", handleMouseUp)
            window.removeEventListener("mousemove", handleMouseMove)
        }
    }
    handleDragSelectedCards(e, cardIdx) {
        e.preventDefault()
        const isDeck = cardIdx === "deck"

        if (isDeck) {
            this.match.deselectCardsInHand()  // ensure no selected cards in hand
        }

        if (!isDeck && !this.selectedCardsIndices.includes(cardIdx)) {
            this.selectedCardsIndices.push(cardIdx)
            $(`hand-card-${cardIdx}`).classList.add('fuCardSelected')
        }
        this.selectedCardsIndices.sort((a, b) => a - b)

        const cardsRem = [...Array(this.playState.hand.length).keys()].filter(j => !this.selectedCardsIndices.includes(j))
        const squish = this.getSquish(this.cardW)

        this.dragee = document.body.appendChild(document.createElement('div'))
        // this.dragee.id = 'drag-hand-cards'
        this.dragee.classList.add('draggable', 'flex')
        if (isDeck) {
            this.dragee.innerHTML = `<div class="fduCard fuCardB"><div class="fuCardInner"></div></div>`
        }
        else {
            for (let idx of this.selectedCardsIndices) {
                this.dragee.appendChild($(`${this.cardContId}${idx}`))
            }
        }

        this.dragee.style.top = (e.clientY - (this.dragee.offsetHeight/2)) + "px"
        this.dragee.style.left = (e.clientX - (this.dragee.offsetWidth/2)) + "px"

        $(this.renderNodeId).classList.add('dragging')

        if (!isDeck) {
            if (this.playState.isGivingFavour()) {
                if (this.selectedCardsIndices.length === 1) {
                    this.currentPlayerNode = $(`oppHand-${this.playState.currentPlayer.playerId}`)
                    this.currentPlayerNode.classList.add('dropZone')
                    this.currentPlayerNode.style.padding = '40px'
                }
            }
            else {
                $('matchDiscardPile').classList.add('dropZone')  // todo more validation for this!
            }
        }

        this.addListeners({
            'mousemove': e => this.handleCardMouseMove(e, cardsRem, squish),
            'mouseup': e => this.handleCardMouseUp(e, cardsRem, isDeck),
            'keyup': e => this.handleEscKeyUp(e),
        })
    }
    getSquish(cardW) {
        const handLen = this.playState.hand.length

        if (cardW * handLen > $('playerHand').offsetWidth) {
            const winW = window.innerWidth - (5*2)  // 2 x player hand margin 5px (beware magic number!)
            const minMargin = 5, maxCardP = 15, maxCardW = 75  // hardcoded css values???
            const cardW = winW / handLen
            let minMarginCardWidth = (2*minMargin) + (2*maxCardP) + maxCardW
            if (minMarginCardWidth * handLen < winW) {
                const margin = Math.floor(minMargin + ((cardW - minMarginCardWidth) / 2))
                return margin < 10 ? { margin: margin + 'px' } : {}  // 10px here being normal card margin
            }
            else {
                const innerW  = Math.floor((cardW - (2*minMargin)) * maxCardW/((2*maxCardP)+maxCardW))
                const padding = Math.floor((cardW - (2*minMargin)) * maxCardP/((2*maxCardP)+maxCardW))
                const fontSize = 16 * innerW/maxCardW //  hardcoded css values???
                return {
                    width: innerW + 'px',
                    height: Math.floor(4 * innerW / 3) + 'px',
                    padding: padding + 'px',
                    margin: minMargin + 'px',
                    fontSize: fontSize + 'px',
                }
            }
        }
    }
    applySquish(squish) {
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
    removeSquish() {
        $(this.renderNodeId).classList.remove('squish')
        $$$('.fuCard').forEach(c => {
            for (let k of ['margin-left', 'margin-right', 'padding-left', 'padding-right', 'width', 'height', 'font-size']) {
                c.style.removeProperty(k)
            }
        })
    }
    findDropZoneUnderPoint(x, y) {
        const dropZones = document.querySelectorAll(`.${this.dropZoneCls}`)
        for (let i = 0; i < dropZones.length; i++) {
            const box = dropZones[i].getBoundingClientRect()
            if (x > box.left && x < box.right && y > box.top && y < box.bottom) {
                return dropZones[i]
            }
        }
    }
    handleCardMouseMove(e, cardsRem, squish) {
        e.preventDefault()

        this.dragee.style.top = (e.clientY - (this.dragee.offsetHeight/2)) + "px"
        this.dragee.style.left = (e.clientX - (this.dragee.offsetWidth/2)) + "px"

        const dropZone = this.findDropZoneUnderPoint(e.clientX, e.clientY)

        if (dropZone !== this.currentDropZone) {
            if (dropZone) {
                // -> drag enter zone
                dropZone.classList.add('dropZoneHover')

                if (dropZone.id === 'playerHand') {
                    const ghost = document.body.appendChild(document.createElement('div'))
                    ghost.classList.add('flex')
                    ghost.id = this.ghostId
                    ghost.innerHTML = `<div class="fuCard"><div class="fuCardInner"></div></div>`.repeat(this.selectedCardsIndices.length || 1)
                    if (squish) { this.applySquish(squish) }
                }
            }
            if (this.currentDropZone) {
                // -> drag leave zone
                this.currentDropZone.classList.remove('dropZoneHover')

                if (this.currentDropZone.id === 'playerHand') {
                    $(this.ghostId).remove()
                    this.cardsOnLeftQty = null
                    if (squish) { this.removeSquish() }
                }
            }
            this.currentDropZone = dropZone
        }

        if (dropZone && dropZone.id === 'playerHand') {
            this.handleCardMouseMoveGhost(e, cardsRem, dropZone)
        }
    }
    handleCardMouseMoveGhost(e, cardsRem, dropZone) {
        if (!cardsRem.length) {
            if (!dropZone.children.length) {
                dropZone.appendChild($(this.ghostId))
            }
            return
        }
        const relMouseX = e.clientX - dropZone.offsetLeft
        const cardsOnLeftQty = Math.floor((relMouseX + (this.cardW/2) - (this.cardW * (this.selectedCardsIndices.length||1) * 0.5)) / this.cardW)
        if (cardsOnLeftQty === this.cardsOnLeftQty) {
            return
        }
        this.cardsOnLeftQty = cardsOnLeftQty
        const cardAfter = (this.cardsOnLeftQty >= cardsRem.length) ? null : $(`${this.cardContId}${cardsRem[this.cardsOnLeftQty]}`)

        dropZone.insertBefore($(this.ghostId), cardAfter)
    }
    handleCardMouseUp(e, cardsRem, isDeck) {

        if (this.currentDropZone && (this.currentDropZone.id === 'playerHand' && $(this.ghostId))) {
            // drag completed on player hand drop zone
            $(this.ghostId).replaceWith(...this.dragee.children)

            if (isDeck) {
                apiPost("/action", {
                    action: "pick",
                    insertPos: this.cardsOnLeftQty,
                    ...this.playState.apiParams()
                }).catch(alert)
            }
            else {
                cardsRem.splice(this.cardsOnLeftQty, 0, ...this.selectedCardsIndices)

                if (!cardsRem.every((c, i) => !i || c > cardsRem[i - 1])) {
                    // card order has changed (is no longer ascending)
                    const newSelection = this.selectedCardsIndices.map((_, i) => this.cardsOnLeftQty + i)
                    console.log("UPDATE HAND", cardsRem)
                    apiPost("/action", {
                        action: "update-hand",
                        updatedHandIndices: cardsRem,
                        ...this.playState.apiParams()
                    }).then(() => {
                        this.selectedCardsIndices = newSelection
                    }).catch(err => {
                        alert(`error while arranging cards: ${err}`)  // todo need to handle this properly. revert back to previous hand order. force rerender for now
                        this.playState.forceRerender()
                    })
                }
            }
        }
        else if (this.currentDropZone && (this.currentDropZone.id === 'matchDiscardPile')) {
            console.log("PLAY (draggable)")
            const cards = this.selectedCardsIndices.map(i => this.playState.hand[i])
            $('matchDiscardPile').innerHTML = this.match.renderDiscardPileTop(cards)
            if (cards.length > 1) this.match.adjustMatchDiscardPile()
            apiPost("/action", {
                action: "play",
                cardIndices: this.selectedCardsIndices,
                ...this.playState.apiParams()
            }).then(() => {
                this.selectedCardsIndices = []
                document.querySelectorAll('.fuCard').forEach(c => c.classList.remove('fuCardSelected'))
            }).catch(err => {
                alert(err)
                // this.cancelDragSelectedCards()  // todo this doesnt work, because dragee is already removed :(
                // forcing a re-render, until the cancelDrag thing can work... unless a force rerender is actually fine?
                this.playState.forceRerender()
            })
        }
        else if (this.currentDropZone && (this.currentDropZone === this.currentPlayerNode)) {
            console.log("GIVE")
            apiPost("/action", {
                action: "clicked-card",
                targetCardIndex: this.selectedCardsIndices[0],
                ...this.playState.apiParams()
            }).then(() => {
                this.selectedCardsIndices = []
                document.querySelectorAll('.fuCard').forEach(c => c.classList.remove('fuCardSelected'))
            }).catch(err => {
                alert(err)
                // this.cancelDragSelectedCards()
                this.playState.forceRerender()
            })
        }
        else {
            // drag cancelled
            this.cancelDragSelectedCards()
        }
        this.endDrag()
    }
    endDrag() {
        this.dragee.remove()
        this.currentDropZone?.classList.remove('dropZoneHover')
        this.currentDropZone = null
        this.cardsOnLeftQty = null
        $(this.renderNodeId).classList.remove('dragging', 'squish')
        $('matchDiscardPile').classList.remove('dropZone')
        this.currentPlayerNode?.classList.remove('dropZone')  // todo some of these are way too specific for this general 'endDrag'
        this.currentPlayerNode?.style.removeProperty('padding')
        this.currentPlayerNode = null
        this.removeListeners()
    }
    cancelDragSelectedCards() {
        $(this.ghostId)?.remove()  // todo this bug would have been caught earlier if there was a mechanism to auto handle creation and deletion of nodes/classes/props etc
        for (let i of [...this.selectedCardsIndices].reverse()) {
            $('playerHand').insertBefore($(`${this.cardContId}${i}`), $$(`#playerHand #${this.cardContId}${i + 1}`) || null)
        }
    }
    handleEscKeyUp(e) {
        if (e.key === 'Escape') {
            this.cancelDragSelectedCards()
            this.endDrag()
        }
    }
}
