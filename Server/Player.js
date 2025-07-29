class Player {
  constructor(id, username, type = 'user') {
    this.id = id;
    this.username = username;
    this.type = type; // 'user' or 'bot'
    this.cards = [];
    this.score = 0;
    this.bid = 0;
    this.tricksWon = 0;
    this.isReady = false;
  }

  getUser() {
    return this.username;
  }

  isGuest() {
    return this.username.toLowerCase().startsWith('guest');
  }

  getId() {
    return this.id;
  }

  addCardsAndOrders(cards) {
    this.cards = cards.sort((a, b) => a - b);
  }

  removeCard(cardId) {
    this.cards = this.cards.filter(card => card.id !== cardId);
  }

  makeBid(bid) {
    this.bid = bid;
  }

  winTrick() {
    this.tricksWon++;
  }

  resetForNewRound() {
    this.bid = 0;
    this.tricksWon = 0;
    this.cards = [];
  }

  botMakeBid(maxCall, bids, nPlayer) {
    let newbid = Math.floor(Math.random() * (maxCall + 1));

    const missingBids = nPlayer - Object.values(bids).length;

    // Se manca solo una chiamata
    if (missingBids === 1) {
      console.log('Missing bid for last player');
      const currentSum = Object.values(bids).reduce((sum, bid) => sum + (bid || 0), 0);
      while(currentSum + newbid === maxCall) 
        newbid = Math.floor(Math.random() * (maxCall + 1));
    }
    this.makeBid(newbid);
    return newbid;
  }

  botChoseCard( firstCard = null) {
    if(this.type !== 'bot') {
      throw new Error('Only bots can play this method');
    }
    console.log('sto scegliendo')
    if (this.cards.length > 0) {
      if(firstCard === null) {
        return this.cards[Math.floor(Math.random() * this.cards.length)];
      }
      const suit = Math.floor(firstCard/ 10)
      let card = this.cards.find(c => Math.floor(c / 10) === suit);
      if (card) {
        return card;
      }
      card = this.cards[Math.floor(Math.random() * this.cards.length)];
      return card;
    }
    return null;
  }

  calculateRoundScore() {
    if (this.bid === this.tricksWon) {
      this.score += 10 + (5 * this.bid);
    } else {
      this.score -= 10;
    }
    return this.score;
  }
}

export default Player;