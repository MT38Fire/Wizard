import Player from './Player.js';
import { saveMatchResult } from './saveGame.js';
class Room {
  constructor(name, maxPlayers, creator) {
    this.id = `room_${Math.random().toString(36).substr(2, 9)}`;
    this.name = name;
    this.maxPlayers = maxPlayers;
    this.creator = creator;
    this.players = [new Player(0, creator)];
    this.status = 'waiting'; // 'waiting', 'bidding', 'playing', 'finished'
    this.deck = [];
    this.currentRound = 0;
    this.currentPlayer = null;
    this.currentTrick = []; 
    this.bids = {};
    this.realPlayers = [new Player(0, creator)]
  }

  addPlayer(player) {
    if (this.players.length >= this.maxPlayers) {
      throw new Error('Room is full');
    }
    //if (this.players.some(p => p.id === player.id)) {
    //  throw new Error('Player already in room');
    //}
    this.players.push(new Player(this.players.length, player.username));
    this.realPlayers.push(new Player(this.players.length, player.username));
    //invio a player players e proprio id
    //invio player a tutti gli altri
  }

  removePlayer(username) {
    const playerIndex = this.players.findIndex(p => p.username === username);
    console.log("prova a cavare")
    if (playerIndex !== -1) {
      console.log("sta cavando")
      this.realPlayers.splice(playerIndex, 1);
      if(this.status === 'waiting') {
        this.players.splice(playerIndex, 1);
        return 0;
      }

      this.realPlayers.splice(playerIndex, 1);
      this.players[playerIndex].type = 'bot'; 
      return 1
      
      // Se era il creatore a lasciare e ci sono ancora giocatori,
      // il nuovo creatore diventa il primo giocatore nella lista
      // non serve farlo, tanto l'admin del gioco diventa in automatico il primo
      
    }
    return null;
  }

  startGame() {
    if (this.realPlayers.length < 3) {
      throw new Error('Not enough players to start');
    }
  
    this.status = 'playing';
    this.currentRound = 2;
    this.startingPlayer = this.players[Math.floor(Math.random() * this.players.length)].getId();
    this.currentPlayer = this.startingPlayer; //da distinguere per capire a chi tocca nel round dopo
    this.initializeRound();
  }

  initializeRound() {
    this.currentPlayer = (this.startingPlayer + this.currentRound - 2) % this.players.length;
    // Initialize deck and shuffle
    this.deck = this.generateDeck();
    this.shuffleDeck();
        
    // piglia le prime carte dal mazzo per ogni giocatore
    this.players.forEach(player => {
      player.addCardsAndOrders(this.deck.splice(0, this.currentRound));
    });
    
    // Transition to bidding phase
    this.status = 'bidding';
    this.bids = {};
  }

  handleBid(playerId, bid) {
    if (this.status !== 'bidding') {
      throw new Error('Not in bidding phase');
    }

    this.bids[playerId] = bid;

    console.log(this.bids)

    this.currentPlayer = (this.currentPlayer+ 1) % this.players.length;
    
    if (Object.keys(this.bids).length === this.players.length) {
      // Start first trick
      this.status = 'playing';
      this.currentTrick = [];
      return true;
    }
    return false;
  }

  playCard(playerId, card) {
    if (this.status !== 'playing') {
        throw new Error('Not in playing phase');
    }
    
    // Validate player's turn
    if (playerId !== this.players[this.currentPlayer].getUser()) {
        throw new Error('Not your turn');
    }

    // Find the player and remove the card from their hand
    const player = this.players.find(p => p.username === playerId);
    if (!player) {
        throw new Error('Player not found');
    }

    // Remove the played card from player's hand
    
    player.cards = player.cards.filter(c => c !== card);

    // Add card to current trick
    this.currentTrick.push({ 
        playerId,
        card
    });

    // fine mano
    if (this.currentTrick.length === this.players.length) {
        console.log('Trick completed with cards:', JSON.stringify(this.currentTrick));
        return this.resolveTrick();
    }

    // prossimo a giocare (se non è fine mano)
    this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
    return 0;
  }
  
  resolveTrick() {

    console.trace('resolveTrick was called');
    if (!this.currentTrick || !Array.isArray(this.currentTrick)) {
      console.error('Invalid trick cards received:', this.currentTrick);
      throw new Error('Invalid trick cards');
    }

    console.log('Resolving trick with cards:', JSON.stringify(this.currentTrick));
    
    const winnerUsername = this.determineTrickWinner();
    const winner = this.players.find(p => p.username === winnerUsername);

    if (!winner) {
      throw new Error(`Winner not found: ${winnerUsername}`);
    }

    // log mani prese
    winner.tricksWon += 1;
    this.currentTrick = [];

    // Check if round is complete
    if (this.players.every(p => p.cards.length === 0)) {
      return this.endRound();
    }
        
    // Set winner as next player
    this.currentPlayer = winner.id;
    
    return 1;
  }

  endRound() {
    this.currentRound++;
    // Calculate scores
    this.players.forEach(player => {
      const bid = this.bids[player.username];
      const tricks = player.tricksWon;
      console.log('player' + player.username + 'got tricks:' + player.tricksWon )
      
      //console.log(this.bids)
      //console.log(`Player ${player.username} - Bid: ${bid}, Tricks: ${tricks}`);
      if (bid === tricks) {
        player.score += 10 + (5 * bid);
      } else {
        player.score -= 10;
      }
      player.tricksWon=0;
    });
    
    // Check if game is over or start next round
    //console.log(this.currentRound*this.players.length)
    if (this.currentRound*this.players.length > 40) {
      this.status = 'finished';
      this.endGame();
      return 3;
    } else {
      this.initializeRound();
      return 2;
    }
  }

  async endGame() {
    
    const matchResult = {
        room_name: this.name,
        players: this.players.map(p => ({
            username: p.username,
            score: p.score,
            isGuest: p.isGuest()  // Assume che Player abbia questa proprietà
        }))
    };
    
    try {
      await saveMatchResult(matchResult);
    } catch (error) {
      console.error('Failed to save match:', error);
    }
  }

  generateDeck() {
    const deck = [];
    for (let i = 0; i <= 39; i++) {
      deck.push(i);
    }
    return deck;
  }

  shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }


  determineTrickWinner() {
    if (!Array.isArray(this.currentTrick)) {
      console.error('Trick cards is not an array:', this.currentTrick);
      throw new Error('Trick cards must be an array');
    }
    
    if (this.currentTrick.length === 0) {
      throw new Error('No cards in current trick');
    }

    // Verifica che tutte le carte abbiano i campi necessari
    const validCards = this.currentTrick.every(c => 
        c && typeof c === 'object' && 
        'playerId' in c && 'card' in c
    );
    
    if (!validCards) {
      throw new Error('Invalid card format in trick');
    }

    // Sort in descending order by card value
    const sorted = [...this.currentTrick].sort((a, b) => b.card - a.card);
    return sorted[0].playerId;
  }

  determineFinalWinner() {
    // Ordina i giocatori per punteggio (decrescente)
    const sortedPlayers = [...this.players].sort((a, b) => b.score - a.score);
    
    // Controlla se c'è un pareggio tra i primi classificati
    const topScore = sortedPlayers[0].score;
    const winners = sortedPlayers.filter(p => p.score === topScore);
    
    return {
        winners: winners.map(p => p.username),
        scores: this.players.map(p => ({
            username: p.username,
            score: p.score,
            tricksWon: p.tricksWon,
            bids: this.bids[p.id] || 0
        })),
        isDraw: winners.length > 1
    };
  }
}

export default Room;
