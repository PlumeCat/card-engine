# game2.md

## turn:
	Optional: Play see-future [nope-chain]
	Combo x2 [nope-chain], pick
    Combo x3 [nope-chain], pick
    Combo x5 [nope-chain], pick
	Skip [nope-chain [pick] ]
	Attack [nope-chain [pick] ]
	Favor [nope-chain] pick
	Shuffle [nope-chain] pick
    pick


Start of turn
    Drag card
        - "2-of-a-kind"         -> Playing combo x2
        - "3-of-a-kind"         -> Playing combo x3
        - "5 different"         -> Playing combo x5
        - "Seeing future"       -> Playing seeing future
        - "Skip"                -> Playing skip
        - "Attack"              -> Playing attack
        - "Favour"              -> Playing favour
        - "Shuffle"             -> Playing shuffle
    Click "pick up"
        - Bomb + defuse         -> Bomb defusing
        - Bomb                  -> End of turn <!-- player out -->
        - Other                 -> End of turn <!-- next player -->


Playing seeing future:
    Player used Nope
        -> Nope [see future] Odd
    Timer
        -> Seeing future


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
        <!-- Record: Attacking next player -->
        -> End of turn


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


Seeing future
    <!-- Player can see top 3 cards until the timer finishes -->
    Timer
        -> Start of turn


Blind stealing a card:
    <!-- Combo X2: Fan out the other player's cards and let the current player click one -->
    Clicked a card
        <!-- Give card to current player -->
        -> Start of turn


Naming a card:
    <!-- Combo X3: Show the player a UI with one of each type of card, they have to click one -->
    Clicked a card
        <!-- Everyone sees the card that was asked for -->
        <!-- If the target player has one, give to current player -->
        <!-- Everyone sees the exchange IF it happens -->
        -> Start of turn


Reclaiming a card:
    <!-- Combo x5: Show the player a UI with all of the discard pile spread out (except bombs), they have to click one -->
    Clicked a card
        <!-- Everyone sees the reclaimed card -->
        -> Start of turn


Receiving a card
    <!-- Favour: Targeted player has to click one of their cards; it is given to the other player -->
    <!-- Nobody else sees the card -->
    Timer
        -> Start of turn


Shuffling
    <!-- animate shuffling the deck -->
    Timer
        -> Start of turn


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
    Immediately
        -> Start of turn (next player (maybe))
    <!-- Only one player left? Victory condition -->
    <!-- Timer (could be zero seconds idk) -->
        <!-- If there is a recorded attack, same player
            otherwise, next player -->
        <!-- -> Start of turn -->


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
        -> Start of turn
Nope [ combo x2 ] Even
    Player used Nope
        -> Nope [ combo x2 ] Odd
    Timer
        -> Stealing a card
Nope [ combo x3 ] Odd
    Player used Nope
        -> Nope [ combo x3 ] Even
    Timer
        -> Start of turn
Nope [ combo x3 ] Even
    Player used Nope
        -> Nope [ combo x3 ] Odd
    Timer
        -> Naming a card
Nope [ combo x5 ] Odd
    Player used Nope
        -> Nope [ combo x5 ] Even
    Timer
        -> Start of turn
Nope [ combo x5 ] Even
    Player used Nope
        -> Nope [ combo x5 ] Odd
    Timer
        -> Reclaiming a card
Nope [ skip ] Odd
    Player used Nope
        -> Nope [ skip ] Even
    Timer
        -> Start of turn
Nope [ skip ] Even
    Player used Nope
        -> Nope [ skip ] Odd
    Timer
        -> End of turn
Nope [ attack ] Odd
    Player used Nope
        -> Nope [ attack ] Even
    Timer
        -> Start of turn
Nope [ attack ] Even
    Player used Nope
        -> Nope [ attack ] Odd
    Timer
        <!-- Record that there is an attack -->
        -> End of turn
Nope [ favour ] Odd
    Player used Nope
        -> Nope [ favour ] Even
    Timer
        -> Start of turn
Nope [ favour ] Even
    Player used Nope
        -> Nope [ favour ] Odd
    Timer
        -> Receiving a card
Nope [ shuffle ] Odd
    Player used Nope
        -> Nope [ shuffle ] Even
    Timer
        -> Start of turn
Nope [ shuffle ] Even
    Player used Nope
        -> Nope [ shuffle ] Odd
    Timer
        -> Shuffling
