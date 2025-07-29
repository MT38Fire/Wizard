import { useState } from 'react';
import { gameRules } from './gameRules.js';

function GuestRoomScreen({ username, onLogout, onAccess, onRoom }) {
  const [showRules, setShowRules] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showRooms, setShowRooms] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [joinDisabled, setJoinDisabled] = useState(false);

  const accessOptions = [
    { id: 1, label: 'Stanze Disponibili', color: '#4CAF50' },
    { id: 2, label: 'Regole', color: '#2196F3', isRules: true }
  ];

  const handleButtonClick = async (option) => {
    if (option.id === 1) {
      setLoading(true);
      setShowRooms(false);
      
      try {
        onAccess({ action: 'roomList' });
        setShowRooms(true);
        setLoading(false);
      } catch (error) {
        console.error('Errore caricamento stanze:', error);
        setLoading(false);
      }
    } else if (option.id === 2) {
      setShowRules(true);
    }
  };

  const handleJoinRoom = async () => {
    if (joinDisabled) return;
    setJoinDisabled(true);
    
    try {
      setLoading(true);
      
      onAccess({
        action: 'joinRoom',
        roomId: selectedRoom.id,
        playerName: username
      });
      
      setShowRooms(false);
      setSelectedRoom(null);
    } catch (error) {
      console.error('Errore durante il join:', error);
      alert(`Errore: ${error.message || 'Impossibile entrare nella stanza'}`);
    } finally {
      setLoading(false);
      setJoinDisabled(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#f5f5f5',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '10px',
        padding: '30px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '500px',
        textAlign: 'center',
        position: 'relative'
      }}>
        <h1 style={{ color: '#333', marginBottom: '10px' }}>Benvenuto Ospite!</h1>
        <p style={{ color: '#666', marginBottom: '30px' }}>Scegli un'opzione</p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '15px',
          marginBottom: '30px'
        }}>
          {accessOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => handleButtonClick(option)}
              style={{
                padding: '12px',
                backgroundColor: option.color,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button 
          onClick={onLogout}
          style={{
            padding: '12px 25px',
            fontSize: '16px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'background-color 0.3s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#d32f2f'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f44336'}
        >
          Esci
        </button>

        {/* Schermata di caricamento */}
        {loading && (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#fff',
            padding: '25px',
            borderRadius: '10px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            zIndex: 1001,
            textAlign: 'center'
          }}>
            <p>Caricamento in corso...</p>
          </div>
        )}

        {/* Popup delle stanze */}
        {showRooms && (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#fff',
            padding: '25px',
            borderRadius: '10px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            zIndex: 1001,
            width: '85%',
            maxWidth: '450px',
            maxHeight: '80vh',
            overflowY: 'auto',
            border: '3px solid #4CAF50'
          }}>
            <button
              onClick={() => setShowRooms(false)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#666',
                fontWeight: 'bold'
              }}
            >
              ×
            </button>
            <h3 style={{ color: '#4CAF50', marginBottom: '20px' }}>Stanze Disponibili</h3>
            {onRoom.length === 0 ? (
              <p>Nessuna stanza disponibile.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {onRoom.map((room) => (
                  <li key={room.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid #ddd'
                  }}>
                    <div>
                      <strong>{room.name}</strong>
                      <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                        Giocatori: {room.players}/{room.maxPlayers}
                      </p>
                    </div>
                    <input
                      type="radio"
                      name="selectedRoom"
                      value={room.id}
                      checked={selectedRoom && selectedRoom.id === room.id}
                      onChange={() => setSelectedRoom(room)}
                    />
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={handleJoinRoom}
              disabled={!selectedRoom||joinDisabled}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                backgroundColor: selectedRoom && !joinDisabled ? '#4CAF50' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: selectedRoom && !joinDisabled ? 'pointer' : 'not-allowed',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              Entra nella stanza selezionata
            </button>
          </div>
        )}

        {/* Popup delle regole */}
        {showRules && (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#fff',
            padding: '25px',
            borderRadius: '10px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            zIndex: 1001,
            width: '85%',
            maxWidth: '450px',
            maxHeight: '80vh',
            overflowY: 'auto',
            border: '3px solid #2196F3'
          }}>
            <button 
              onClick={() => setShowRules(false)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#666',
                fontWeight: 'bold'
              }}
            >
              ×
            </button>
            
            <h3 style={{ color: '#2196F3', marginTop: '5px', marginBottom: '20px' }}>
              {gameRules.title}
            </h3>
            
            <ul style={{ 
              textAlign: 'left', 
              paddingLeft: '20px',
              marginBottom: '20px'
            }}>
              {gameRules.rules.map((rule, index) => (
                <li key={index} style={{ marginBottom: '10px', lineHeight: '1.5' }}>
                  {rule}
                </li>
              ))}
            </ul>
            
            <button
              onClick={() => setShowRules(false)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                transition: 'background-color 0.3s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0b7dda'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2196F3'}
            >
              Ho capito!
            </button>
            
            <p style={{ 
              fontStyle: 'italic', 
              marginTop: '15px',
              color: '#666'
            }}>
              {gameRules.footer}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default GuestRoomScreen;