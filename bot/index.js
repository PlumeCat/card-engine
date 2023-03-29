// bot

import '../server/fetch_polyfill.js'
import { apiGet, apiPost } from '../dist/api_client.js'
import { TurnStates, MatchState } from '../server/turn.js'
import { application } from 'express'
const log = console.log
const makeBotName = () => "BOT-" + Math.floor(Math.random() * 1000).toString()

const main = async () => {
    // const gameId = process.argv[2]
    // log("attempting to join game: ", gameId)
    log("joining game")
    const name = makeBotName()
    
    try {
        const res = await apiGet("/join", { playerName:name, gameId: "WASD" })
        const gameId = res.gameId
        const playerId = res.playerId
        log("successfully joined as bot: ", name, playerId)
        
        setInterval(async () => {
            const gameState = await apiGet("/state", { gameId, playerId })
            console.log(gameState.matchState)
            const getMyIndex = () => gameState.players.findIndex(p => p.playerId == playerId)
            const getMyHand = () => gameState.hands[getMyIndex()]
            const getIsMyTurn = () => gameState.playerTurn == getMyIndex()

            if (gameState.matchState == MatchState.COMPLETE) {
                process.exit()
            } else if (gameState.matchState == MatchState.WAITING) {
                // waiting for game to begin
            }            
            else {
                // decision tree
                if (gameState.turnState == TurnStates.START) {
                    if (getIsMyTurn()) {

                        // 10% chance to play a random card (if possible)
                        
                        // if (Math.random() * 100 < 10) {
                        //     const hand = getMyHand()
                        //     const i = Math.floor(Math.random() * hand.length)
                        //     const card = hand[i]
                        //     try {
                                
                        //     } catch (e) {
                        //         log(`tried to play card: ${1} failed`, e)
                        //     }
                        // }
                        
                        // pick card from deck
                        try {
                            const res = await apiPost("/action", { action: "pick", gameId, playerId })
                            log("pick res: ", res)
                        } catch (e) {
                            log("tried to pick, error: ", e)
                        }
                    }
                } else if (gameState.turnState == TurnStates.FAVOUR_RECEIVING) {
                    // must nominate a card to give to favour player
                    if (playerId == gameState.targetPlayerId) {
                        const card = Math.floor(Math.random() * getMyHand().length)
                        log("picking favour card", card)
                        const clickRes = await apiPost("/action", {
                            action: "clicked-card",
                            targetCardIndex: card,
                            gameId, playerId
                        })
                    }
                }
            }
        }, 500)
    } catch(e) {
        log("failed to join game: ", e)
        process.exit()
    }

}

main()