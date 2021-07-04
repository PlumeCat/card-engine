// modals.js

import { TurnStates } from "/turn.js"
import Cards, { getShortCardName, getCardInnerHtml } from "/cards.js"
import { getTurnStateMsg } from "/turn_states.js"


export default (state) => {
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
    if (state.turnState === TurnStates.COMBO2_STEALING) {
        return combo2StealingModal(state)
    }
    if (state.turnState === TurnStates.COMBO3_NOMINATING) {
        return combo3NominatingModal()
    }
    if (state.turnState === TurnStates.COMBO5_RECLAIMING) {
        return combo5ReclaimingModal(state)
    }
    if (state.turnState === TurnStates.DEFUSING) {
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
    const half2 = Object.values(Cards).filter(c => c.value !== Cards.BOMB.value)
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
