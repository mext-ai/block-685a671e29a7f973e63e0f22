import React, { useEffect, useState, useRef, useCallback } from 'react';

interface BlockProps {
  title?: string;
}

interface Ball {
  x: number;
  y: number;
  velocityY: number;
  radius: number;
}

const Block: React.FC<BlockProps> = ({ title = "Jeu de Jonglage" }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'gameOver'>('waiting');
  const [ball, setBall] = useState<Ball>({
    x: 400,
    y: 100,
    velocityY: 0,
    radius: 30
  });

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const GRAVITY = 0.5;
  const JUMP_FORCE = -12;
  const GROUND_Y = CANVAS_HEIGHT - 50;

  // Fonction pour démarrer le jeu
  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setBall({
      x: CANVAS_WIDTH / 2,
      y: 100,
      velocityY: 2,
      radius: 30
    });
    
    // Envoyer l'événement de début si nécessaire
    window.postMessage({ type: 'BLOCK_COMPLETION', blockId: 'football-juggling-game', completed: false }, '*');
    window.parent.postMessage({ type: 'BLOCK_COMPLETION', blockId: 'football-juggling-game', completed: false }, '*');
  }, []);

  // Fonction pour redémarrer le jeu
  const restartGame = useCallback(() => {
    setGameState('waiting');
    setBall({
      x: CANVAS_WIDTH / 2,
      y: 100,
      velocityY: 0,
      radius: 30
    });
  }, []);

  // Fonction pour gérer les clics sur le canvas
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Vérifier si le clic est sur le ballon
    const distance = Math.sqrt(
      Math.pow(clickX - ball.x, 2) + Math.pow(clickY - ball.y, 2)
    );

    if (distance <= ball.radius + 20) { // Zone de clic un peu plus large
      setBall(prevBall => ({
        ...prevBall,
        velocityY: JUMP_FORCE
      }));
      setScore(prevScore => prevScore + 1);
    }
  }, [gameState, ball.x, ball.y, ball.radius]);

  // Animation du jeu
  useEffect(() => {
    if (gameState !== 'playing') return;

    const animate = () => {
      setBall(prevBall => {
        let newBall = { ...prevBall };
        
        // Appliquer la gravité
        newBall.velocityY += GRAVITY;
        newBall.y += newBall.velocityY;

        // Vérifier si le ballon touche le sol
        if (newBall.y + newBall.radius >= GROUND_Y) {
          setGameState('gameOver');
          // Envoyer l'événement de completion du jeu
          window.postMessage({ 
            type: 'BLOCK_COMPLETION', 
            blockId: 'football-juggling-game', 
            completed: true,
            score: score,
            data: { finalScore: score, gameType: 'juggling' }
          }, '*');
          window.parent.postMessage({ 
            type: 'BLOCK_COMPLETION', 
            blockId: 'football-juggling-game', 
            completed: true,
            score: score,
            data: { finalScore: score, gameType: 'juggling' }
          }, '*');
          return newBall;
        }

        // Garder le ballon dans les limites horizontales
        if (newBall.x - newBall.radius < 0) {
          newBall.x = newBall.radius;
        } else if (newBall.x + newBall.radius > CANVAS_WIDTH) {
          newBall.x = CANVAS_WIDTH - newBall.radius;
        }

        return newBall;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, score]);

  // Fonction de dessin
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Effacer le canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Dessiner le fond (terrain de football)
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#87CEEB'); // Ciel bleu
    gradient.addColorStop(0.7, '#87CEEB');
    gradient.addColorStop(1, '#228B22'); // Herbe verte
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Dessiner le sol
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

    // Dessiner les lignes du terrain
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    // Ligne de but
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
    ctx.stroke();

    // Dessiner le ballon de football
    const ballGradient = ctx.createRadialGradient(
      ball.x - 10, ball.y - 10, 0,
      ball.x, ball.y, ball.radius
    );
    ballGradient.addColorStop(0, '#FFFFFF');
    ballGradient.addColorStop(1, '#000000');
    
    ctx.fillStyle = ballGradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Dessiner les motifs du ballon
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    // Pentagones
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const x1 = ball.x + Math.cos(angle) * (ball.radius * 0.3);
      const y1 = ball.y + Math.sin(angle) * (ball.radius * 0.3);
      const x2 = ball.x + Math.cos(angle + Math.PI * 2/5) * (ball.radius * 0.3);
      const y2 = ball.y + Math.sin(angle + Math.PI * 2/5) * (ball.radius * 0.3);
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

  }, [ball, gameState]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#1a1a2e',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      padding: '20px'
    }}>
      <h1 style={{
        fontSize: '2.5rem',
        marginBottom: '10px',
        textAlign: 'center',
        background: 'linear-gradient(45deg, #FFD700, #FFA500)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
      }}>
        ⚽ {title} ⚽
      </h1>

      <div style={{
        fontSize: '1.5rem',
        marginBottom: '20px',
        padding: '10px 20px',
        backgroundColor: '#16213e',
        borderRadius: '10px',
        border: '2px solid #FFD700'
      }}>
        Score: {score} point{score !== 1 ? 's' : ''}
      </div>

      {gameState === 'waiting' && (
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <p style={{ fontSize: '1.2rem', marginBottom: '15px' }}>
            🎯 Cliquez sur le ballon pour le faire rebondir !<br/>
            🎮 Évitez qu'il touche le sol pour continuer à marquer des points !
          </p>
          <button
            onClick={startGame}
            style={{
              fontSize: '1.5rem',
              padding: '15px 30px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#45a049'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4CAF50'}
          >
            🚀 Commencer à jouer
          </button>
        </div>
      )}

      {gameState === 'gameOver' && (
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '20px',
          padding: '20px',
          backgroundColor: '#d32f2f',
          borderRadius: '10px',
          border: '2px solid #ff6b6b'
        }}>
          <h2 style={{ marginBottom: '10px' }}>🏁 Partie Terminée !</h2>
          <p style={{ fontSize: '1.3rem', marginBottom: '15px' }}>
            Score final: {score} point{score !== 1 ? 's' : ''}
          </p>
          <p style={{ marginBottom: '15px' }}>
            {score === 0 && "Essayez encore ! 💪"}
            {score > 0 && score < 5 && "Pas mal pour un début ! 👍"}
            {score >= 5 && score < 10 && "Bon travail ! 🎉"}
            {score >= 10 && score < 20 && "Excellent jonglage ! ⭐"}
            {score >= 20 && "Vous êtes un champion ! 🏆"}
          </p>
          <button
            onClick={restartGame}
            style={{
              fontSize: '1.3rem',
              padding: '12px 25px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#45a049'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4CAF50'}
          >
            🔄 Rejouer
          </button>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onClick={handleCanvasClick}
        style={{
          border: '3px solid #FFD700',
          borderRadius: '10px',
          cursor: gameState === 'playing' ? 'pointer' : 'default',
          boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
          backgroundColor: '#87CEEB'
        }}
      />

      {gameState === 'playing' && (
        <div style={{
          marginTop: '20px',
          textAlign: 'center',
          fontSize: '1.1rem',
          opacity: 0.8
        }}>
          💡 Astuce: Cliquez sur le ballon pour le faire rebondir !
        </div>
      )}
    </div>
  );
};

export default Block;