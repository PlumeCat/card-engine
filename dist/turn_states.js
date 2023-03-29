import { TurnStates } from "/turn.js"

export const ChooseOppTurnStates = [
    TurnStates.PLAYING_COMBO2,
    TurnStates.PLAYING_COMBO3,
    TurnStates.PLAYING_FAVOUR,
]

export const ModalTurnStates = [
    TurnStates.SEE_FUTURE,
    TurnStates.COMBO2_STEALING,
    TurnStates.COMBO3_NOMINATING,
    TurnStates.COMBO5_RECLAIMING,
    TurnStates.DEFUSING,
]

export const ComboTurnStates = [
    TurnStates.PLAYING_COMBO2,
    TurnStates.PLAYING_COMBO3,
    TurnStates.PLAYING_COMBO5,
    TurnStates.COMBO2_STEALING,
    TurnStates.COMBO3_NOMINATING,
    TurnStates.COMBO5_RECLAIMING,
]

export const getTurnStateMsg = (state) => {
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
    if (turnState === TurnStates.FAVOUR_RECEIVING) {
        return isPlayer ? `waiting for card from ${targetPlayer}`
             : isTarget ? `choose 1 card to give to ${currentPlayer}`
             : `${targetPlayer} has to give 1 card ${currentPlayer}`
    }
    if (turnState === TurnStates.COMBO2_STEALING) {
        return isPlayer ? `pick a card from ${targetPlayer}'s hand`
             : isTarget ? `${bold('your')} cards are fanned out for ${currentPlayer} to grab one!`
             : `${currentPlayer} is picking a card from ${targetPlayer}'s hand`
    }
    if (turnState === TurnStates.COMBO3_NOMINATING) {  // todo need msg for what was nominated and whether target player had the card
        return isPlayer ? `nominate a card to request from ${targetPlayer}`
             : isTarget ? `${currentPlayer} is nominating a card to request from ${bold('you')}`
             : `${currentPlayer} is nominating a card to request from ${targetPlayer}`
    }
    if (turnState === TurnStates.COMBO5_RECLAIMING) {  // todo need msg for what was reclaimed
        return isPlayer ? `pick a card from the discard pile...`
             : `${currentPlayer} is reclaiming a card from the discard pile...`
    }
    if (turnState === TurnStates.DEFUSING) {
        return isPlayer ? 'pick a position to reinsert the bomb...'
             : `${currentPlayer} picked a bomb! defusing...`
    }
    if (turnState === TurnStates.SEE_FUTURE) {
        return isPlayer ? 'seeing the future'
             : `${currentPlayer} is peeking at the top 3 cards...`
    }
    if (turnState === TurnStates.SHUFFLING) {
        return 'SHUFFLING...'
    }
    if (turnState === TurnStates.POST_COMBO3) {
        const card =  state.game.nominatedCard
        return card.targetHas ? `${currentPlayer} requested ${bold(card.card.name)}` : `whoops... ${targetPlayer} does not have a ${bold(card.card.name)} :(`
    }
    if (turnState === TurnStates.POST_COMBO5) {
        const card =  state.game.nominatedCard
        return `${currentPlayer} reclaimed a ${bold(card.card.name)}`
    }
    if (turnState === TurnStates.BOMBED) {
        return `${currentPlayer} BLEW UP`
    }
    return ''
}

