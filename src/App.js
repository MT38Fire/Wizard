import './App.css';
import React, { useEffect, useState } from 'react';
import HomeScreen from './Schermate/HomeScreen.js';
import Login from './Schermate/Login.js';
import AccessRoomScreen from './Schermate/AccessRoomScreen.js';
import RoomScreen from './Schermate/RoomScreen.js';
import apiService from './api.js';
import GuestRoomScreen from './Schermate/GuestRoomScreen.js';

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [currentView, setCurrentView] = useState('home');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentRoomList, setCurrentRoomList] = useState([]);
  const [roomName, setRoomName] = useState('');

  const joinWebSocketRoom = (roomId, loggedInUser) => {
    const ws = new WebSocket(`ws://localhost:8080/ws?roomId=${roomId}&user=${loggedInUser}`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setSocket(ws);
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setSocket(null);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  const handleAccess = async (data) => {
    try {
      if (data.action === 'createRoom') {
        const response = await apiService.createRoom({
          name: data.roomName,
          maxPlayers: parseInt(data.maxPlayers),
          creator: loggedInUser
        });
        setRoomName(response.data.name);
        setCurrentRoom(response.data.roomId);
        console.log('Room created:');
        joinWebSocketRoom(response.data.roomId, loggedInUser);
        setCurrentView('room');
      } 
      else if (data.action === 'roomList') {
        const response = await apiService.getRooms();
        setCurrentRoomList(response.data);
      } 
      else if (data.action === 'joinRoom') {
        const response = await apiService.joinRoom(data.roomId,
          loggedInUser
        );
        setCurrentRoom(data.roomId);
        setRoomName(response.data.roomName);
        joinWebSocketRoom(data.roomId, loggedInUser);
        setCurrentView('room');
      }
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.error || 'An error occurred');
    }
  };

  const handleLogin = async (data) => {
    try {
      switch (data.action) {
        case 'guestLogin':
          setLoggedInUser(`guest_${Math.random().toString(36).substr(2, 9)}`);
          setShowLogin(false);
          setCurrentView('guest');
          break;
        case 'login':
          if (data.name.toLowerCase().startsWith('guest')) {
            throw new Error('Il nome utente non può iniziare con "guest"');
          }
          const loginResponse = await apiService.login(data.name, data.password);
          setLoggedInUser(loginResponse.data.username);
          setShowLogin(false);
          setCurrentView('access');
          break;
        case 'register':
          if (data.name.toLowerCase().startsWith('guest')) {
            throw new Error('Il nome utente non può iniziare con "guest"');
          }
          await apiService.register(data.name, data.password);
          alert('Registration successful! Please login.');
          break;
      }
    } catch (error) {
      console.error('Login error:', error);
      alert(error.response?.data?.message || 'Login failed');
    }
  };

  const handleLogout = () => {
    if (socket) {
      socket.close();
      setSocket(null);
    }
    setLoggedInUser(null);
    setCurrentRoom(null);
    setCurrentView('home');
  };

  const handleLeaveRoom = () => {
    if (socket) {
      socket.close();
      setSocket(null);
    }
    setCurrentRoom(null);
    setCurrentView(loggedInUser.startsWith('guest_') ? 'guest' : 'access');
  };

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return (
          <>
            {!showLogin && <HomeScreen onStartClick={() => setShowLogin(true)} />}
            {showLogin && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000
              }}>
                <Login 
                  onClose={() => setShowLogin(false)} 
                  emittit={handleLogin}
                />
              </div>
            )}
          </>
        );
      case 'access':
        return (
          <AccessRoomScreen
            username={loggedInUser}
            onLogout={handleLogout}
            onAccess={handleAccess}
            onRoom={currentRoomList}
          />
        );
      case 'guest':
              return (
                <GuestRoomScreen
                  username={loggedInUser}
                  onLogout={handleLogout}
                  onAccess={handleAccess}
                  onRoom={currentRoomList}
                />
              );
      case 'room':
        return (
          <RoomScreen
            username={loggedInUser}
            socket={socket}
            roomId={currentRoom}
            roomName={roomName}
            onLeaveRoom={handleLeaveRoom}
          />
        );
      default:
        return <HomeScreen onStartClick={() => setShowLogin(true)} />;
    }
  };

  return <div className="App">{renderView()}</div>;
}

export default App;