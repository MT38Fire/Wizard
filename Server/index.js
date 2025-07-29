import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import http from 'http';
import { WebSocketServer } from 'ws';

import { loginUser, registerUser, sendProfileInfo } from './authController.js';
import Room from './Room.js';

const app = express();
const server = http.createServer(app);

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({}));
app.use(cors());

// In-memory data stores
const rooms = new Map(); // { roomId: Room instance }
const activeConnections = new Map(); // { userId: WebSocket }

// REST API Routes

// Authentication routes
app.post('/api/auth/login', loginUser);
app.post('/api/auth/register', registerUser);
app.get('/api/auth/profile/:username', sendProfileInfo);

// Room management routes
app.post('/api/rooms/createRoom', async (req, res) => {
  const { name, maxPlayers, creator } = req.body;

  if (!name || !maxPlayers || !creator) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Check if room name already exists
  for (const room of rooms.values()) {
    if (room.name === name) {
      return res.status(400).json({ error: 'Room name already exists' });
    }
  }
  const newRoom = new Room(name, maxPlayers, creator);
  rooms.set(newRoom.id, newRoom);

  res.status(201).json({ 
    roomId: newRoom.id,
    name: newRoom.name,
    maxPlayers: newRoom.maxPlayers,
    creator: newRoom.creator
  });
});

app.get('/api/rooms', (req, res) => {
  const roomList = Array.from(rooms.values()).filter(room => room.status === 'waiting').map(room => ({
    id: room.id,
    name: room.name,
    players: room.players.length,
    maxPlayers: room.maxPlayers,
    status: room.status
  }));
  res.json(roomList);
});

app.post('/api/rooms/:roomId/join', (req, res) => {
  const { roomId } = req.params;
  const playerName = req.body.username;


  //console.log(roomId)
  if (!roomId) {
    return res.status(701).json({ error: 'Missing IDozzo Stanza' });
  }
  if (!playerName) {
    return res.status(801).json({ error: 'Missing ID pLa' });
  }
  
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  if (room.players.length >= room.maxPlayers) {
    return res.status(403).json({ error: 'Room is full' });
  }
  if (room.players.some(p => p.username === playerName)) {
    return res.status(409).json({ error: 'Player already in room' });
  }
  room.addPlayer({ username: playerName });
  res.json({ success: true, roomName: room.name});
});

// WebSocket Server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const urlParams = new URLSearchParams(req.url.split('?')[1]);
  const roomId = urlParams.get('roomId');
  const username = urlParams.get('user');

  if (!roomId || !username) {
    ws.close();
    return;
  }

  const room = rooms.get(roomId);
  if (!room) {
    ws.close();
    return;
  }

  // Store the connection
  activeConnections.set(username, ws );

  // quando un giocatore entra, invio a tutti gli altri giocatori il nuovo giocatore
  broadcastToRoom(roomId, {
    type: 'player_join',
    player: { username: username }
  }, username);

  //ricezione messaggi
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleWebSocketMessage(roomId, username, message);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

});

//funzione per ricezione messaggi
function handleWebSocketMessage(roomId, user, message) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  const handleGameState = (currentEnd) => {
    if (currentEnd > 1) {
      console.log("round finito");
      broadcastToRoom(roomId, {
        type: 'round_ended',
        players: room.players.map(player => ({
          username: player.username,
          score: player.score    
        }))
      });
    }
    if(currentEnd===1 && room.players[room.currentPlayer].type=== 'bot'){
      botPlayingCard();
    }
    if (currentEnd === 2) {
      console.log("nuovo round");
      room.players.forEach(player => {
        if (activeConnections.has(player.username) && room.realPlayers.some(p => p.username === player.username)) {
          const ws = activeConnections.get(player.username);
          ws.send(JSON.stringify({
            type: 'give_cards',
            cards: player.cards
          }));
        }
      });
      if(room.players[room.currentPlayer].type === 'bot'){
        botBidding();
      }//INIZIA QUA
    }
    else if (currentEnd === 3) {
      console.log("partita finita");
      const finalResults = room.determineFinalWinner();
      broadcastToRoom(roomId, {
        type: 'game_ended',
        result: finalResults.isDraw 
            ? `Pareggio tra ${finalResults.winners.join(' e ')} con ${finalResults.scores[0].score} punti!` 
            : `${finalResults.winners[0]} vince con ${finalResults.scores[0].score} punti!`,
          scores: finalResults.scores
      });
    }
  };

  function botBidding(){
    setTimeout(()=>{
      const botBid = room.players[room.currentPlayer].botMakeBid(room.currentRound, room.bids, room.players.length);
      //console.log(`Bot ${room.players[room.currentPlayer].username} made bid: ${botBid}`);
      const botUsername = room.players[room.currentPlayer].username;
      const stat = room.handleBid(botUsername, botBid);
      broadcastToRoom(roomId, {
        type: 'bid_made',
        user: botUsername,
        nextPlayer: room.currentPlayer,
        end: stat,
        bid: botBid
      });

      if(room.players[room.currentPlayer].type==='bot' && room.status=== 'bidding'){
        botBidding();
      }
      if (room.players[room.currentPlayer].type==='bot' && room.status==='playing'){
        botPlayingCard();
      }
    }, 1000);
    return
  }

  function botPlayingCard(){
    setTimeout(() => {
      const botCard = room.players[room.currentPlayer].botChoseCard(room.currentTrick.length !== 0 ? room.currentTrick[0].card : null);
      const usId = room.currentPlayer;
      const botEnd = room.playCard(room.players[room.currentPlayer].username, botCard);
      
      broadcastToRoom(roomId, {
        type: 'card_played',
        playerId: usId,
        nextPlayer: room.currentPlayer,
        card: botCard,
        firstSuit: (botEnd === 0 ? Math.floor(room.currentTrick[0].card / 10) : null),
        end: botEnd
      });

      handleGameState(botEnd);
      if(room.players[room.currentPlayer].type==='bot' && room.status==='playing' && botEnd==0){
        botPlayingCard();
      }
    }, 1000);
    return
  }
  switch (message.type) {
    case 'initialize_room':
      // Send the current state of the room to the user
      const roomState = {
        type: 'room_state',
        room: {
          id: room.id,
          name: room.name,
          players: room.players.map(p => ({ id: p.id, username: p.username })),
          status: room.status,
          maxPlayers: room.maxPlayers
        }
      };
      if (activeConnections.has(user)) {
        activeConnections.get(user).send(JSON.stringify(roomState));
      }
      break;
    case 'leave_room':
      const playerIndex = room.players.findIndex(p => p.username === user);
      if (playerIndex !== -1) {

        const removedPlayer = room.removePlayer(user);
         // Rimuove il giocatore dalla stanza
        if (removedPlayer === 0) {
          broadcastToRoom(roomId, {
            type: 'player_left',
            player: { username: user, type: 'user'}
          }, user);
        }
        else if (removedPlayer === 1) {
          // Se il giocatore era in gioco, cambia il tipo a bot
          broadcastToRoom(roomId, {
            type: 'player_left',
            player: { username: user, type: 'bot' }
          }, user);
          if(room.players[room.currentPlayer].username===user){
            if(room.status==='playing'){
              botPlayingCard();
            }
            else if(room.status==='bidding'){
              botBidding();
            }
          }
        }

        // Chiudi la connessione
          if (activeConnections.has(user)) {
            activeConnections.get(user).close();
            activeConnections.delete(user);
          }

          console.log(room.realPlayers);
          if (room.realPlayers.length === 0) { //TODO rimuovi la stanza se sono tutti bot
            rooms.delete(roomId);
            console.log("deleting room")
          }
      }
      break;

    case 'start_game':
      if (room.creator === user && room.status === 'waiting' && room.players.length >= 3) {

        //inizializza tutto
        room.startGame();

        //noticica gioco iniziato
        broadcastToRoom(roomId, { 
          type: 'game_started',
          round: room.currentRound,
          startingPlayer: room.currentPlayer
        });

        //manda carte ai player
        room.players.forEach(player => {
          if (activeConnections.has(player.username)) {
            const ws = activeConnections.get(player.username);
            ws.send(JSON.stringify({
              type: 'give_cards',
              cards: player.cards
            }));
          }
        });

      } else {
        // Invia messaggio di errore solo al creator
        if (activeConnections.has(user)) {
          activeConnections.get(user).send(JSON.stringify({
            type: 'error',
            message: room.players.length < 3 ? 'Not enough players (min 3 required)' : 'Only room creator can start the game'
          }));
        }
      }
      break;

    case 'make_bid': //chiamata mani previste
      if (room.status === 'bidding') {
        const stat = room.handleBid(user, message.bid);

        //console.log(stat + " " + user + " " + room.currentPlayer);

        broadcastToRoom(roomId, {
          user: user,
          type: 'bid_made',
          nextPlayer: room.currentPlayer,
          end: stat,
          bid: message.bid
        });

        if (room.players[room.currentPlayer].type === 'bot' && room.status==='bidding'){
            botBidding();
        }
        if(room.players[room.currentPlayer].type === 'bot' && room.status==='playing'){
            botPlayingCard();
        }
      }
      break;
      
    case 'play_card':
      if (room.status === 'playing') {
        const end = room.playCard(user, message.card);
        const usId = room.players.findIndex(p => p.username === user);

        broadcastToRoom(roomId, {
          type: 'card_played',
          playerId: usId,
          nextPlayer: room.currentPlayer,
          card: message.card,
          firstSuit: (end === 0 ? Math.floor(room.currentTrick[0].card / 10) : null),
          end: end
        });

        // Handle game state changes after any card play (human or bot)

        // First handle the current play result
        handleGameState(end);

        // If the game continues and it's a bot's turn
        if (end === 0 && room.players[room.currentPlayer].type === 'bot') {
          botPlayingCard();
        }
      }
      break;
      
    default:
      console.log('Unknown message type:', message.type);
  }
}

function broadcastToRoom(roomId, message, excludeUsernames = null) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.players.forEach(player => {
    if (player.username !== excludeUsernames && activeConnections.has(player.username)) {
      const ws = activeConnections.get(player.username);
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }
  });
}

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});