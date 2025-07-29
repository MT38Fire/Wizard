import React, { useState } from 'react';

function Login({ onClose, emittit }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || (mode !== 'guest' && !password.trim())) return;

    emittit({
      action: mode,
      name: username,
      password: password
    });
  };

  // 👇 Funzione per gestire accesso come ospite
  const handleGuestLogin = () => {
    emittit({
      action: 'guestLogin',
      name: 'guest',
      password: null
    });
  };

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 99
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="auth-modal"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '320px',
          padding: '25px',
          borderRadius: '10px',
          backgroundColor: 'rgba(0, 100, 200, 0.95)',
          boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
          color: 'white',
          textAlign: 'center',
          zIndex: 100
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: '20px' }}>
          {mode === 'login' && 'Accedi'}
          {mode === 'register' && 'Registrati'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px', textAlign: 'left' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Username:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '5px',
                border: 'none',
                boxSizing: 'border-box'
              }}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '15px', textAlign: 'left' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '5px',
                border: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            style={submitButtonStyle}
          >
            {mode === 'login' && 'Login'}
            {mode === 'register' && 'Registrati'}
          </button>
        </form>

        {/* Cambia modalità */}
        <div style={{ fontSize: '14px', marginBottom: '10px' }}>
          {mode !== 'login' && <button onClick={() => setMode('login')} style={linkStyle}>Login</button>}
          {mode !== 'register' && <button onClick={() => setMode('register')} style={linkStyle}>Registrati</button>}
          <button onClick={handleGuestLogin} style={linkStyle}>Accedi come Ospite</button>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: 'transparent',
            color: 'white',
            border: '1px solid white',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'all 0.3s ease'
          }}
        >
          Esci
        </button>
      </div>
    </>
  );
}

const submitButtonStyle = {
  width: '100%',
  padding: '12px',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  color: '#2CAF10',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '16px',
  fontWeight: 'bold',
  transition: 'all 0.3s ease',
  marginBottom: '10px'
};

const linkStyle = {
  background: 'none',
  border: 'none',
  color: 'white',
  textDecoration: 'underline',
  cursor: 'pointer',
  margin: '0 5px'
};

export default Login;

