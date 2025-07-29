
import { useState } from 'react';
import logo from '../assets/logo.png';
import logoz from '../assets/palla.png';

function HomeScreen({ onStartClick }) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleButtonClick = () => {
    setIsAnimating(true);
    // Aspetta che l'animazione sia completata prima di chiamare onStartClick
    setTimeout(() => {
      onStartClick();
    }, 1000); // l'animazione dura 2 secondi in più perché si blocca dopo e così viene più pulito e scorrevole
  };

  return (
    <div className="home-screen">
      <header className="App-header">
      <div className="graphics-container">
        <img src={logo} className="App-logo" alt="logo" />
        <img src={logoz} className="App-logo-ball" alt="ball" />
        </div>
        <div className="content"></div>
        <p>Wizardd</p>
        <button 
          onClick={handleButtonClick}
          className="start-button"
          style={{
            padding: '10px 20px',
            fontSize: '15px',
            backgroundColor: '#2CAF10',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          Start
        </button>
      </header>
      

      {/* Effetto Puff */}
      {isAnimating && (
        <div 
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: 'white',
            boxShadow: '0 0 10px rgba(255, 255, 255, 0)',
            opacity: 0,
            pointerEvents: 'none',
            animation: 'puffAnimation 1.2s forwards',   /// l'animazione dura 1.2 secondi
            zIndex: 5,
          }}
        />
      )}

      {/* Stili CSS-in-JS */}
      <style>{`
        @keyframes puffAnimation {
          0% {
            width: 10px;
            height: 10px;
            opacity: 0.2;
            box-shadow: 0 0 10px rgb(255, 255, 255);
          }
          50% {
            width: 300px;
            height: 300px;
            opacity: 0.6;
            box-shadow: 0 0 50px rgba(255, 255, 255, 0.6);
          }
          100% {
            width: 200vw;
            height: 200vh;
            opacity: 1;
            box-shadow: 0 0 100px rgb(15, 1, 1);
            background-color: rgba(255, 255, 255, 1);
          }
        }
      `}</style>
    </div>
  );
}

export default HomeScreen;