import { useEffect, useState } from 'react';
import IMAGES from '../CardImages.js';
//se IMAGES da problemi, usare CardImages_v2
//import IMAGES from '../CardImages_v2.js';
import Card from '../Card.js';

function RoomScreen({ username, socket, roomId, roomName, onLeaveRoom }) {
  const [userId, setUserId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [cards, setCards] = useState([]);
  const [calls, setCalls] = useState([]);
  const [gameState, setGameState] = useState(null);
  const [cardsPlayed, setCardsPlayed] = useState([]);
  const [currentCall, setCurrentCall] = useState(0);
  const [maxCall, setMaxCall] = useState(0);
  const [currentPhase, setPhase] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [FirstSuit, setSuit] = useState(null);
  const [bots, setBots] = useState([]);

  useEffect(() => {
    if (!socket) return;

    const handleBeforeUnload = () => {
      if (socket) {
        socket.send(JSON.stringify({
          type: 'leave_room',
          roomId: roomId,
          username: username
        }));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    console.log('Socket in RoomScreen:', socket);
    socket.send(JSON.stringify({
      type: 'initialize_room',
      roomId: roomId,
      username: username
    }));

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('WebSocket message:', message);

      switch (message.type) {
        case 'room_state':
          const roomPlayers = message.room.players.map(p => p.username);
          setPlayers(roomPlayers);
          setCalls(roomPlayers.map((username, i) => ({
            playerId: i,
            username,
            call: null,
            taken: 0,
            points: 0
          })));
          setGameState('waiting');
          break;

        case 'player_join':
          setPlayers(prev => [...prev, message.player.username]);
          setCalls(prev => [...prev, {
            playerId: prev.length,
            username: message.player.username,
            call: null,
            taken: 0,
            points: 0
          }]);
          //setUserId(players.indexOf(username));
          break;
        
        case 'player_left':
          if (message.player.type === 'user') {
          setPlayers(prev => {
            const updatedPlayers = prev.filter(p => p !== message.player.username);
            setCalls(prevCalls =>
              updatedPlayers.map((player, idx) => {
                const callObj = prevCalls.find(c => c.username === player);
                return {
                  ...callObj,
                  playerId: idx
                };
              })
            );
            return updatedPlayers;
          });
          } else {
            setBots(prev => [...prev, message.player.username]);
          }
          //setUserId(players.indexOf(username));
          break;

        case 'give_cards':
          setCards(message.cards);
          setPhase('bidding');
          break;

        case 'game_started':

          setPlayers(prevPlayers => {
            const myId = prevPlayers.indexOf(username);
            setUserId(myId);
            setCurrentPlayer(message.startingPlayer);
            return prevPlayers; // Non modificare players, solo leggerlo
          });
          setMaxCall(message.round);
          setGameState('playing');
          break;

        case 'bid_made':
          setCalls(prev => prev.map(c => 
            c.username === message.user ? { ...c, call: message.bid } : c
          ));
          setCurrentPlayer(message.nextPlayer);
          if (message.end)
            setPhase('playing')
          break;

        case 'card_played':
          //setta il seme obbligatorio,
          setSuit(message.firstSuit);
          // Update cards played in the center
          setTimeout(() => {
            setCardsPlayed(prev => [...prev, {
              playerId: message.playerId,
              card: message.card
            }]);
          }, 50);

          if (message.end !== 0) { // fine trick
            setCalls(prev => prev.map(c => {
                if (c.playerId === message.nextPlayer) {
                  return {
                    ...c,
                    taken: c.taken + 1
                  };
                }
                return c;
              }
            ));
            setTimeout(() => setCardsPlayed([]), 1000);
          }
          setCurrentPlayer(message.nextPlayer);
          break;

        case 'round_ended':
          //assegna punti
          setSuit(null);
          setCalls(prev => prev.map(c => {
            const playerData = message.players.find(p => p.username === c.username);
            return playerData ? {
                ...c,
                taken: 0,
                call: null,
                points: playerData.score
            } : c;
          }));
          setMaxCall(prev => prev + 1);
          setPhase('bidding');

          break;

        case 'game_ended':
          //mostra vincitore
          //per ora solo messaggio così, si può personalizzare di più
          alert(message.result);
          setGameState('finished');

          break;
        
        default:
          console.log('Unknown message type:', message.type);
      }
    };

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      socket.close();
    };
  }, [socket, roomId, username]);

  const renderPlayerPositions = () => {
    const playerCount = players.length;
    const centerX = 50;
    const centerY = 50;
    const radius = 40;

    return players.map((player, index) => {
      const relativeIndex = (index - userId + playerCount) % playerCount;
      const angle = (relativeIndex * (360 / playerCount) + 80) * (Math.PI / 180);

      const posX = centerX + radius * Math.cos(angle);
      const posY = centerY + radius * Math.sin(angle);

      const isActive = currentPlayer === index;
      const playerData = calls.find(c => c.playerId === index);

      if (relativeIndex === 0) {
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              right: '20px',
              bottom: '1px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '10px',
              zIndex: 5,
            }}
          >
            {/* Player info circle */}
            <div style={{
              backgroundColor: isActive ? 'gold' : 'rgba(0, 0, 0, 0.75)',
              borderRadius: '50%',
              width: '90px',
              height: '90px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '12px',
              boxShadow: isActive ? '0 0 10px 4px gold' : 'none',
            }}>
              <div>{player === username ? ' (You)' : player} {bots.includes(player)&& 'bot'} </div>
              <div>Pts: {playerData.points ?? 0}</div>
            </div>

            {/* Card back with taken info */}
            <div style={{ position: 'relative', marginTop: '5px' }}>
              <img
                src={IMAGES['back']}
                alt="card-back"
                style={{
                  width: '50px',
                  height: 'auto',
                  transform: 'rotate(0deg)',
                  borderRadius: '6px'
                }} 
              />
              <div style={{
                position: 'absolute',
                top: '30px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'white',
                padding: '2px 5px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#000',
                boxShadow: '0 0 2px rgba(0,0,0,0.5)'
              }}>
                {playerData.call !== null ? `${playerData.taken}/${playerData.call}` : null}
              </div>
            </div>
          </div>
        );
      }

      return (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: `${posX}%`,
            top: `${posY}%`,
            transform: 'translate(-80%, -60%)',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            zIndex: 5,
          }}
        >
          {/* Player info circle */}
          <div style={{
            backgroundColor: isActive ? 'gold' : 'rgba(0, 0, 0, 0.75)',
            borderRadius: '50%',
            width: '90px',
            height: '90px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '12px',
            boxShadow: isActive ? '0 0 10px 4px gold' : 'none',
          }}>
            <div>{player}</div>
            <div>Pts: {playerData.points ?? 0}</div>
          </div>

          {/* Card back with taken info */}
          <div style={{ position: 'relative', marginTop: '5px' }}>
            <img
              src={IMAGES['back']}
              alt="card-back"
              style={{
                width: '50px',
                height: 'auto',
                transform: 'rotate(0deg)',
                borderRadius: '6px'
              }} 
            />
            <div style={{
              position: 'absolute',
              top: '30px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'white',
              padding: '2px 5px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#000',
              boxShadow: '0 0 2px rgba(0,0,0,0.5)'
            }}>
              {playerData.call !== null ? `${playerData.taken}/${playerData.call}` : null}
            </div>
          </div>
        </div>
      );
    });
  };
  
  const renderPlayedCards = () => {
    // Se non ci sono carte giocate, non renderizzare nulla
    if (!cardsPlayed || cardsPlayed.length === 0) {
      return null;
    }

    const playerCount = players.length;
    if (playerCount === 0 || userId === null) {
      return null;
    }

    return (
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-60%, -60%)',
        width: '200px',
        height: '200px',
        borderRadius: '50%',
        border: '2px dashed rgba(255, 255, 255, 0.3)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 3
      }}>
        {cardsPlayed.map((playedCard, index) => {
          // Calcola la posizione relativa del giocatore rispetto all'utente corrente
          const relativeIndex = (playedCard.playerId - userId + playerCount) % playerCount;
          
          // Calcola l'angolo per posizionare la carta
          const angleDeg = (relativeIndex * (360 / playerCount)) + 80;
          const angleRad = angleDeg * (Math.PI / 180);
          
          // Distanza dal centro (raggio del cerchio delle carte)
          const radius = 60; // Ridotto per avere le carte più vicine al centro
          
          // Calcola la posizione x,y della carta
          const cardX = radius * Math.cos(angleRad);
          const cardY = radius * Math.sin(angleRad);
          
          // L'angolo di rotazione dovrebbe puntare verso il centro
          // Aggiungiamo 180° all'angolo di posizione per far puntare verso il centro
          const rotationAngle = angleDeg - 90;

          return (
            <div
              key={`played-card-${playedCard.playerId}-${index}`}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) translate(${cardX}px, ${cardY}px) rotate(${rotationAngle}deg)`,
                transformOrigin: 'center',
                zIndex: 4
              }}
            >
              <Card 
                id={playedCard.card} 
                image={IMAGES[`img_${Math.floor(playedCard.card / 10)}_${playedCard.card % 10}`]}
                style={{
                  width: '60px',
                  height: 'auto',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              />
            </div>
          );
        })}
      </div>
    );
  };

  const handleStartGame = () => {
    if (socket && players.length >= 3) {
      socket.send(JSON.stringify({
        type: 'start_game'
      }));
    }
  };

  const handleCallChange = (delta) => {
    const newCall = currentCall + delta;
    if (newCall >= 0 && newCall <= maxCall) {
      setCurrentCall(newCall);
    }
  };

  const handleCardClick = (cardId) => {
    if (currentPlayer === userId && currentPhase === 'playing') {
      // Controllo del seme
      const cardSuit = Math.floor(cardId / 10);
      const hasCardsWithFirstSuit = cards.some(c => Math.floor(c / 10) === FirstSuit);
      
      // Se la carta non è dello stesso seme e ci sono ancora carte del seme iniziale
      if (FirstSuit !== null && cardSuit !== FirstSuit && hasCardsWithFirstSuit) {
        alert("Devi giocare una carta dello stesso seme di apertura!");
        return;
      }

      // Disabilita temporaneamente i click sulle carte
      const cardElements = document.querySelectorAll('.player-card');
      cardElements.forEach(card => {
        card.style.pointerEvents = 'none';
      });

      // Remove the card from hand
      setCards(prev => prev.filter(c => c !== cardId));
      
      // Send to server
      if (socket) {
        socket.send(JSON.stringify({
          type: 'play_card',
          card: cardId
        }));
      }

      // Riabilita i click dopo 1500ms (1 secondo e mezzo)
      setTimeout(() => {
        cardElements.forEach(card => {
          card.style.pointerEvents = 'auto';
        });
      }, 1500);
    }
  };


  const handleLeaveRoom = () => {
    if (socket) {
      socket.send(JSON.stringify({
        type: 'leave_room',
        roomId: roomId,
        username: username
      }));
    }
    onLeaveRoom();
  };

  const checkBidSum = (newBid) => {
    // Ottieni tutte le chiamate esistenti
    const existingBids = calls.map(c => c.call);
    
    // Sostituisci la chiamata corrente (se esiste) con la nuova offerta
    if (userId !== null && userId >= 0 && userId < existingBids.length) {
      existingBids[userId] = newBid;
    }
    
    // Conta quante chiamate mancano
    const missingBids = existingBids.filter(bid => bid === null).length;
    
    // Se manca solo una chiamata
    if (missingBids === 0) {
      const currentSum = existingBids.reduce((sum, bid) => sum + (bid || 0), 0);
      return currentSum !== maxCall;
    }
    
    return true;
  };

  const handleSubmitCall = () => {
    if (currentPlayer === userId && currentPhase === 'bidding') {
      if (!checkBidSum(currentCall)) {
        alert("La somma totale delle chiamate non può essere uguale al numero di carte!");
        return;
      }
      else{
        if (socket) {
          socket.send(JSON.stringify({
            type: 'make_bid',
            bid: currentCall
          }));
          setCalls(prev => prev.map(c => 
            c.username === username ? { ...c, call: currentCall } : c
          ));
        }
      }
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#4CAF50',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px',
      color: 'white'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h1>Room: {roomName}</h1>
        <button 
          onClick={handleLeaveRoom}
          style={{
            padding: '10px 20px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Leave Room
        </button>
      </div>

      <div style={{
        display: 'flex',
        flex: 1,
        gap: '20px'
      }}>
        {/* Players list */}
        <div style={{
          flex: '0 0 200px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '10px',
          padding: '15px'
        }}>
          <h3>Players ({players.length})</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {players.map((player, index) => {
              const playerCall = calls.find(c => c.playerId === index);
              return (
                <li key={index} style={{ marginBottom: '10px' }}>
                  <div>
                    {player} {player === username && '(You)'} {bots.includes(player) && '(Bot)'}
                  </div>
                  {playerCall && playerCall.call !== undefined && (
                    <div style={{ fontSize: '0.8em', color: '#ddd' }}>
                      Call: {playerCall.call} - Taken: {playerCall.taken}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {username === players[0] &&  gameState=== 'waiting' && (
            <button
              onClick={handleStartGame}
              disabled={players.length < 3}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                backgroundColor: players.length < 3 ? '#cccccc' : '#FF9800',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: players.length < 3 ? 'not-allowed' : 'pointer',
                width: '100%'
              }}
            >
              {players.length < 3 ? 'Waiting for players (min 3)' : 'Start Game'}
            </button>
          )}
        </div>

        {/* Game area */}
        <div style={{
          flex: 1,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '10px',
          padding: '15px',
          display: 'flex',
          flexDirection: 'column'
        }}>
        
          {gameState === 'playing' ? (
            <div style={{
              position: 'relative',
              flex: 1,
              borderRadius: '10px',
              padding: '15px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              height: '100%',
              width: '100%'
            }}>
              
              {/* Players around the table */}
              {renderPlayerPositions()}

              {/* Played cards in the center */}
              {renderPlayedCards()}

              {/* Player's cards at the bottom */}
              <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '10px'
              }}>
                {cards.map((cardId, index) => (
                  <div 
                    key={index}
                    className="player-card"
                    onClick={() => handleCardClick(cardId)}
                    style={{
                      cursor: (currentPlayer === userId && currentPhase === 'playing') ? 'pointer' : 'default',
                      transition: 'transform 0.2s',
                      ':hover': {
                        transform: (currentPlayer === userId && currentPhase === 'playing') ? 'translateY(-10px)' : 'none'
                      }
                    }}
                  >
                    <Card 
                      id={cardId} 
                      image={IMAGES[`img_${Math.floor(cardId / 10)}_${cardId % 10}`]} 
                    />
                  </div>
                ))}
              </div>

              {/* Bidding phase UI */}
              {currentPhase === 'bidding' && userId === currentPlayer && (
                <div style={{ 
                  position: 'absolute',
                  bottom: '130px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  padding: '15px',
                  borderRadius: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'white'
                }}>
                  <div>Quante prese pensi di fare?</div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button 
                      onClick={() => handleCallChange(-1)}
                      disabled={currentCall <= 0}
                      style={{
                        padding: '5px 15px',
                        backgroundColor: currentCall > 0 ? '#2196F3' : '#cccccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: currentCall > 0 ? 'pointer' : 'default',
                        fontSize: '18px'
                      }}
                    >
                      &lt;
                    </button>
                    
                    <div style={{
                      minWidth: '50px',
                      textAlign: 'center',
                      fontSize: '24px',
                      fontWeight: 'bold'
                    }}>
                      {currentCall}
                    </div>
                    
                    <button 
                      onClick={() => handleCallChange(1)}
                      disabled={currentCall >= maxCall}
                      style={{
                        padding: '5px 15px',
                        backgroundColor: currentCall < maxCall ? '#2196F3' : '#cccccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: currentCall < maxCall ? 'pointer' : 'default',
                        fontSize: '18px'
                      }}
                    >
                      &gt;
                    </button>
                  </div>
                  
                  <button
                    onClick={handleSubmitCall}
                    style={{
                      padding: '8px 20px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Conferma
                  </button>
                  
                  <div style={{ color: '#ff9800', fontStyle: 'italic' }}>
                    {calls.filter(c => c.call === null).length === 1 && (
                      `Attenzione: la somma totale non può essere ${maxCall}`
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flex: 1
            }}>
              <h2>Waiting for game to start...</h2>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RoomScreen;
