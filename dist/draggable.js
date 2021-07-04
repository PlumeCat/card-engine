// draggable

import { $, $$, $$$ } from "/dollar.js"
import { apiPost } from "/api_client.js"


export default class Draggable {
    constructor(match) {
        this.match = match
        this.playState = match.playState
        this.renderNodeId = match.renderNodeId
        this.dropZoneCls = 'dropZone'
        this.cardContId = 'hand-card-cont-'
        this.ghostId = `${this.cardContId}ghost`
        this.currentDropZone = null
        this.cardsOnLeftQty = null
        this.activeTimer = null
        this.dragTimeout = 500

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
    initiateDrag(event, cardIdx) {
        this.activeTimer = setTimeout(() => {this.handleDragSelectedCards(event, cardIdx)}, this.dragTimeout)
        const handleMouseUp = () => {
            clearTimeout(this.activeTimer)
            this.activeTimer = null
            window.removeEventListener("mouseup", handleMouseUp)
        }
        window.addEventListener("mouseup", handleMouseUp)
    }
    handleDragSelectedCards(e, cardIdx) {
        e.preventDefault()

        if (!this.selectedCardsIndices.includes(cardIdx)) {
            this.selectedCardsIndices.push(cardIdx)
            $(`hand-card-${cardIdx}`).classList.add('fuCardSelected')
        }
        this.selectedCardsIndices.sort((a, b) => a - b)

        const cardsRem = [...Array(this.playState.hand.length).keys()].filter(j => !this.selectedCardsIndices.includes(j))
        const refEl = cardsRem.length ? $(`${this.cardContId}${cardsRem[0]}`) : null
        const squish = this.getSquish(refEl.offsetWidth)

        this.dragee = document.body.appendChild(document.createElement('div'))
        this.dragee.id = 'drag-hand-cards'
        this.dragee.classList.add('draggable', 'flex')
        for (let idx of this.selectedCardsIndices) {
            this.dragee.appendChild($(`${this.cardContId}${idx}`))
        }

        this.dragee.style.top = (e.clientY - (this.dragee.offsetHeight/2)) + "px"
        this.dragee.style.left = (e.clientX - (this.dragee.offsetWidth/2)) + "px"

        $(this.renderNodeId).classList.add('dragging')

        this.addListeners({
            'mousemove': e => this.handleCardMouseMove(e, refEl, cardsRem, squish),
            'mouseup': e => this.handleCardMouseUp(e, cardsRem),
            'keyup': e => this.handleEscKeyUp(e),
        })
    }
    getSquish(refElWidth) {
        const handLen = this.playState.hand.length

        if (refElWidth * handLen > $('playerHand').offsetWidth) {
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
    handleCardMouseMove(e, refEl, cardsRem, squish) {
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
                    ghost.innerHTML = `<div class="fuCard"><div class="fuCardInner"></div></div>`.repeat(this.selectedCardsIndices.length)
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
            this.handleCardMouseMoveGhost(e, refEl, cardsRem, dropZone)
        }
    }
    handleCardMouseMoveGhost(e, refEl, cardsRem, dropZone) {
        if (!cardsRem.length) {
            if (!dropZone.children.length) {
                dropZone.appendChild($(this.ghostId))
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
        const cardAfter = (this.cardsOnLeftQty >= cardsRem.length) ? null : $(`${this.cardContId}${cardsRem[this.cardsOnLeftQty]}`)

        dropZone.insertBefore($(this.ghostId), cardAfter)
    }
    handleCardMouseUp(e, cardsRem) {
        if (this.currentDropZone && (this.currentDropZone.id === 'playerHand' && $(this.ghostId))) {
            // drag completed on player hand drop zone
            $(this.ghostId).replaceWith(...this.dragee.children)
            cardsRem.splice(this.cardsOnLeftQty, 0, ...this.selectedCardsIndices)

            if (!cardsRem.every((c, i) => !i || c > cardsRem[i-1])) {
                // card order has changed (is no longer ascending)
                const newSelection = this.selectedCardsIndices.map((_, i) => this.cardsOnLeftQty + i)
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
