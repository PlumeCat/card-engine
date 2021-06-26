# exploding kittens

hardcoded for 4 players

## list of cards
    cat-rainbow x4
    cat-beard x4
    cat-taco x4
    cat-melon x4
    cat-potato x4
    attack +2 x4
    shuffle x4
    nope x5
    skip x4
    see-the-future x5
    favour (get given a card) x4
    bomb x3
    defuse x6
<!-- Nyan cat? -->
<!-- Grenade cat? Possibly overpowered -->
    Combos:
        2x same: pick another players card (hidden)
        3x same: nominate player + card
        5x different: pick from discarded

## turn:
	Optional: Play see-future [nope-chain]
	Combo x2 [nope-chain], pick
    Combo x3 [nope-chain], pick
    Combo x5 [nope-chain], pick
	Skip [nope-chain [pick] ]
	Attack [nope-chain [pick] ]
	Favor [nope-chain] pick
	Shuffle [nope-chain] pick


## states
Start of turn:
    Click "play"
        - "Seeing future"       -> Playing seeing future
        - "2-of-a-kind"         -> Playing combo x2
        - "3-of-a-kind"         -> Playing combo x2
        - "5 different"         -> Playing combo x5
        - "Skip"                -> Playing skip
        - "Attack"              -> Playing attack
        - "Favour"              -> Playing favour
        - "Shuffle"             -> Playing shuffle
    Click "pick up"
        - Picking up card


Playing seeing future:
    Player used Nope
        -> Nope [see future] Odd
    Timer
        -> Seeing future


Seeing future
    <!-- Player can see top 3 cards until the timer finishes -->
    Timer
        -> Start-of-turn

Playing combo x2
    <!-- Cards go to discard pile, show to all players -->
    Player used Nope
        -> Nope [ combo x2 ] Odd
    Clicked a player
        <!-- this should be behind a timer to allow for Nopes -->
        -> Blind stealing a card


Playing combo x3
    <!-- Cards go to discard pile -->
    Player used Nope
        -> Nope [ combo x3 ] Odd
    Clicked a player
        <!-- put this behind a timer to allow for Nope -->
        -> Naming a card


Playing combo x5
    <!-- Cards go to discard pile -->
    Player used Nope    
        -> Nope [ combo x5 ] Odd
    Timer
        -> Reclaiming a card


Playing skip
    Player used Nope
        -> Nope [ skip ] Odd
    Timer
        -> End of turn


Playing attack
    Player used Nope
        -> Nope [ attack ] Odd
    Timer
        -> Attacking next player [ 1 ]


Playing favour
    Player used Nope
        -> Nope [ favour ] Odd
    Click a player
        <!-- timer delayed to allow for nopes -->
        -> Receiving a card


Playing shuffle
    Players used Nope
        -> Nope [ shuffle ] Odd
    Timer
        -> Shuffling


Attacking next player [ 1 ]
    <!-- Reveal a card to ***next*** player NOT current player -->
    "bomb" && have defuser (next player)
        -> Bomb defusing [ attacked 1 ]
    Is "bomb" && No defuser (next player)
        <!-- Player lost! -->
        <!-- Remove next player from game! -->
        -> End of turn
    Is not bomb
        <!-- Add card to ATTACKED PLAYER hand -->
        -> Attacking next player [ 2 ]


Bomb defusing [ attacked 1 ]
    Submit slider
        <!-- Reinsert the bomb at chosen position -->
        -> Attacking next player [ 2 ]
    Timer
        <!-- reinsert bomb randomly -->
        -> Attacking enxt player [ 2 ]


Attacking next player [ 2 ]
    "Bomb" && have defuser (next player)
        -> Bomb defusing [ attacked 2 ]
    "Bomb" && no defuser (next player)
        <!-- Player lost! -->
        <!-- Remove next player from game -->
        -> End of turn
    Is not bomb
        <!-- Add card to ATTACKED player's hand! -->
        -> End of turn


Bomb defusing [ attacked 2 ]
    Submit slider
        <!-- Reinsert the bomb at chosen position -->
        -> End of turn
    Timer
        <!-- reinsert bomb randomly -->
        -> End of turn


Blind stealing a card:
    <!-- Combo X2: Fan out the other player's cards and let the current player click one -->
    Clicked a card
        <!-- Give card to current player -->
        -> End of play


Naming a card:
    <!-- Combo X3: Show the player a UI with one of each type of card, they have to click one -->
    Clicked a card
        <!-- Everyone sees the card that was asked for -->
        <!-- If the target player has one, give to current player -->
        <!-- Everyone sees the exchange IF it happens -->
        -> End of play


Reclaiming a card:
    <!-- Combo x5: Show the player a UI with all of the discard pile spread out (except bombs), they have to click one -->
    Clicked a card
        <!-- Everyone sees the reclaimed card -->
        -> End of play


Receiving a card
    <!-- Combo X2: Targeted player has to click one of their cards; it is given to the other player -->
    <!-- Nobody else sees the card -->
    Timer
        -> End of play


Shuffling
    <!-- animate shuffling the deck -->
    Timer
        -> End of play


End of play:
    -> Picking up card


Picking up card
    <!-- Reveal next card to player -->
    Is "bomb" && Have defuser
        -> Bomb defusing
    Is "bomb" && No defuser
        <!-- Current player is out of game! -->
        -> End of turn
    Is not "bomb"
        <!-- Add card to hand -->
        -> End of turn


Bomb defusing
    <!-- Bomb defused successfully! -->
    <!-- Defuser card goes to discard pile -->
    <!-- Show the slider UI to the player so they can pick a position in the deck to reinsert the bomb, and maybe a "random" button -->
    Submitted the slider
        <!-- Insert the bomb in the cards at the player's chosen position -->
        -> End of turn <!-- next player -->
    Timer
        <!-- Insert randomly -->
        -> End of turn <!-- next player -->


End of turn
    <!-- Only one player left? Victory condition -->
    Timer
        -> Start of turn <!-- next player -->


Nope [see future] Odd
    Player used Nope
        -> Nope [see future] Even
    Timer
        -> Start of turn
Nope [see future] Even
    Player used Nope
        -> Nope [see future] Odd
    Timer
        -> Seeing future
Nope [ combo x2 ] Odd
    Player used Nope
        -> Nope [ combo x2 ] Even
    Timer
        -> End of play
Nope [ combo x2 ] Even
    Player used Nope
        -> Nope [ combo x2 ] Odd
    Timer
        -> Stealing a card
Nope [ combo x3 ] Odd
    Player used Nope
        -> Nope [ combo x3 ] Even
    Timer
        -> End of play
Nope [ combo x3 ] Even
    Player used Nope
        -> Nope [ combo x3 ] Odd
    Timer
        -> Naming a card
Nope [ combo x5 ] Odd
    Player used Nope
        -> Nope [ combo x5 ] Even
    Timer
        -> End of play
Nope [ combo x5 ] Even
    Player used Nope
        -> Nope [ combo x5 ] Odd
    Timer
        -> Reclaiming a card
Nope [ skip ] Odd
    Player used Nope
        -> Nope [ skip ] Even
    Timer
        -> End of play
Nope [ skip ] Even
    Player used Nope
        -> Nope [ skip ] Odd
    Timer
        -> End of turn
Nope [ attack ] Odd
    Player used Nope
        -> Nope [ attack ] Even
    Timer
        -> End of play
Nope [ attack ] Even
    Player used Nope
        -> Nope [ attack ] Odd
    Timer
        -> Attacking next player [ 1 ]
Nope [ favour ] Odd
    Player used Nope
        -> Nope [ favour ] Even
    Timer
        -> End of play
Nope [ favour ] Even
    Player used Nope
        -> Nope [ favour ] Odd
    Timer
        -> Receiving a card
Nope [ shuffle ] Odd
    Player used Nope
        -> Nope [ shuffle ] Even
    Timer
        -> End of play
Nope [ shuffle ] Even
    Player used Nope
        -> Nope [ shuffle ] Odd
    Timer
        -> Shuffling
