const counter = (() => {
    let next = 0
    return () => next += 1
})()

const Actions = {
    PLAY_SEEING_FUTURE: counter(),
    PLAY_COMBO2: counter(),
    PLAY_COMBO3: counter(),
    PLAY_COMBO5: counter(),
    PLAY_SKIP: counter(),
    PLAY_ATTACK: counter(),
    PLAY_FAVOUR: counter(),
    PLAY_SHUFFLE: counter(),
    PICK: counter(),
    NOPE: counter(),
    TIMER: counter(),
    CLICK_PLAYER: counter(),

    ATTACK_DEFUSED: counter(),
    ATTACK_SUCCESS: counter(),
    ATTACK_FAILED: counter(),

    PICK_BOMB_DEFUSE: counter(),
    PICK_BOMB: counter(),
    REINSERT_BOMB: counter(),
}

const TurnStates = {
    START_OF_TURN: {
        [Actions.PLAY_SEEING_FUTURE]:   TurnStates.PLAYING_FUTURE,
        [Actions.PLAY_COMBO2]:          TurnStates.PLAYING_COMBO2,
        [Actions.PLAY_COMBO3]:          TurnStates.PLAYING_COMBO3,
        [Actions.PLAY_COMBO5]:          TurnStates.PLAYING_COMBO5,
        [Actions.PLAY_SKIP]:            TurnStates.PLAYING_SKIP,
        [Actions.PLAY_ATTACK]:          TurnStates.PLAYING_ATTACK,
        [Actions.PLAY_FAVOUR]:          TurnStates.PLAYING_FAVOUR,
        [Actions.PLAY_SHUFFLE]:         TurnStates.PLAYING_SHUFFLE,
        [Actions.PICK]:                 TurnStates.PICKING
    },
    PLAYING_FUTURE: {
        [Actions.NOPE]:         TurnStates.NOPE_FUTURE_ODD,
        [Actions.TIMER]:        TurnStates.SEEING_FUTURE,
    },
    PLAYING_COMBO2: {
        [Actions.NOPE]:         TurnStates.NOPE_COMBO2_ODD,
        [Actions.CLICK_PLAYER]: TurnStates.COMBO2_STEALING,
    },
    PLAYING_COMBO3: {
        [Actions.NOPE]:         TurnStates.NOPE_COMBO3_ODD,
        [Actions.CLICK_PLAYER]: TurnStates.COMBO3_NAMING,
    },
    PLAYING_COMBO5: {
        [Actions.NOPE]:         TurnStates.NOPE_COMBO5_ODD,
        [Actions.TIMER]:        TurnStates.COMBO5_RECLAIMING,
    },
    PLAYING_SKIP: {
        [Actions.NOPE]:         TurnStates.NOPE_SKIP_ODD,
        [Actions.TIMER]:        TurnStates.END_OF_TURN,
    },
    PLAYING_ATTACK: {
        [Actions.NOPE]:         TurnStates.NOPE_ATTACK_ODD,
        [Actions.TIMER]:        TurnStates.ATTACKING_1
    },
    PLAYING_FAVOUR: {
        [Actions.NOPE]:         TurnStates.NOPE_FAVOUR_ODD,
        [Actions.CLICK_PLAYER]: TurnStates.FAVOUR_RECEIVING,
    },
    PLAYING_SHUFFLE: {
        [Actions.NOPE]:         TurnStates.NOPE_SHUFFLE_ODD,
        [Actions.TIMER]:        TurnStates.SHUFFLING,
    },
    SEEING_FUTURE: {
        [Actions.TIMER]:        TurnStates.START_OF_TURN,
    },
    ATTACKING_1: {
        [Actions.ATTACK_DEFUSED]: TurnStates.DEFUSING_ATTACK_1,
        [Actions.ATTACK_SUCCESS]: TurnStates.END_OF_TURN,
        [Actions.ATTACK_FAILED]:  TurnStates.ATTACKING_2,
    },
    DEFUSING_ATTACK_1: {
        [Actions.REINSERT_BOMB]:    TurnStates.ATTACKING_2,
        [Actions.TIMER]:            TurnStates.ATTACKING_2
    },
    ATTACKING_2: {
        [Actions.ATTACK_DEFUSED]: TurnStates.DEFUSING_ATTACK_2,
        [Actions.ATTACK_SUCCESS]: TurnStates.END_OF_TURN,
        [Actions.ATTACK_FAILED]:  TurnStates.END_OF_TURN,
    },
    DEFUSING_ATTACK_2: {
        [Actions.REINSERT_BOMB]:    TurnStates.END_OF_TURN,
        [Actions.TIMER]:            TurnStates.END_OF_TURN,
    },
    COMBO2_STEALING: {
        [Actions.CLICK_CARD]:       TurnStates.END_OF_PLAY,
    },
    COMBO3_NAMING: {
        [Actions.CLICK_CARD]:       TurnStates.END_OF_PLAY,
    },
    COMBO5_RECLAIMING: {
        [Actions.CLICK_CARD]:       TurnStates.END_OF_PLAY,
    },
    FAVOR_RECEIVING: {
        [Actions.TIMER]:            TurnStates.END_OF_PLAY,
    },
    SHUFFLING: {
        [Actions.TIMER]:            TurnStates.END_OF_PLAY,
    },
    END_OF_PLAY: {
        [Actions.TIMER]:            TurnStates.PICKING,
    },
    PICKING: {
        [Actions.PICK_BOMB_DEFUSE]: TurnStates.DEFUSING,
        [Actions.PICK_BOMB]:        TurnStates.END_OF_TURN,
    },
    DEFUSING: {
        [Actions.REINSERT_BOMB]:    TurnStates.END_OF_TURN, // next player
        [Actions.TIMER]:            TurnStates.END_OF_TURN
    },
    END_OF_TURN: {
        [Actions.TIMER]:            TurnStates.START_OF_TURN, // reset for next player
    },
    NOPE_FUTURE_ODD: {
        [Actions.NOPE]: TurnStates.NOPE_FUTURE_EVEN,
        [Actions.TIMER]:TurnStates.START_OF_TURN,
    },
    NOPE_FUTURE_EVEN: {
        [Actions.NOPE]: TurnStates.NOPE_FUTURE_ODD,
        [Actions.TIMER]:TurnStates.SEEING_FUTURE,
    },
    NOPE_COMBO2_ODD: {
        [Actions.NOPE]: TurnStates.NOPE_COMBO2_EVEN,
        [Actions.TIMER]:TurnStates.END_OF_PLAY,
    },
    NOPE_COMBO2_EVEN: {
        [Actions.NOPE]: TurnStates.NOPE_COMBO2_ODD,
        [Actions.TIMER]:TurnStates.COMBO2_STEALING,
    },
    NOPE_COMBO3_ODD: {
        [Actions.NOPE]: TurnStates.NOPE_COMBO3_EVEN,
        [Actions.TIMER]:TurnStates.END_OF_PLAY,
    },
    NOPE_COMBO3_EVEN: {
        [Actions.NOPE]: TurnStates.NOPE_COMBO3_ODD,
        [Actions.TIMER]:TurnStates.COMBO3_NAMING,
    },
    NOPE_COMBO5_ODD: {
        [Actions.NOPE]: TurnStates.NOPE_COMBO5_EVEN,
        [Actions.TIMER]:TurnStates.END_OF_PLAY,
    },
    NOPE_COMBO5_EVEN: {
        [Actions.NOPE]: TurnStates.NOPE_COMBO5_ODD,
        [Actions.TIMER]:TurnStates.COMBO5_RECLAIMING,
    },

    NOPE_SKIP_ODD: {
        [Actions.NOPE]: TurnStates.NOPE_SKIP_EVEN,
        [Actions.TIMER]:TurnStates.END_OF_PLAY,
    },
    NOPE_SKIP_EVEN: {
        [Actions.NOPE]: TurnStates.NOPE_SKIP_ODD,
        [Actions.TIMER]:TurnStates.END_OF_TURN,
    },


    NOPE_ATTACK_ODD: {
        [Actions.NOPE]: TurnStates.NOPE_ATTACK_EVEN,
        [Actions.TIMER]:TurnStates.END_OF_PLAY,
    },
    NOPE_ATTACK_EVEN: {
        [Actions.NOPE]: TurnStates.NOPE_ATTACK_ODD,
        [Actions.TIMER]:TurnStates.ATTACKING_1,
    },



    NOPE_FAVOUR_ODD: {
        [Actions.NOPE]: TurnStates.NOPE_FAVOUR_EVEN,
        [Actions.TIMER]:TurnStates.END_OF_PLAY,
    },
    NOPE_FAVOUR_EVEN: {
        [Actions.NOPE]: TurnStates.NOPE_FAVOUR_ODD,
        [Actions.TIMER]:TurnStates.FAVOUR_RECEIVING,
    },


    NOPE_SHUFFLE_ODD: {
        [Actions.NOPE]: TurnStates.NOPE_SHUFFLE_EVEN,
        [Actions.TIMER]:TurnStates.END_OF_PLAY,
    },
    NOPE_SHUFFLE_EVEN: {
        [Actions.NOPE]: TurnStates.NOPE_SHUFFLE_ODD,
        [Actions.TIMER]:TurnStates.SHUFFLING,
    },
}

class StateMachine {
    constructor(states, initial) {
        this.currentState = states[initial]
    }
    applyAction() {

    }
}