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
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #2E8B57 0%, #228B22 50%, #006400 100%)',
      color: 'white',
      fontFamily: "'Arial Black', Arial, sans-serif",
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Effet de terrain en arrière-plan */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 95px,
            rgba(255, 255, 255, 0.1) 95px,
            rgba(255, 255, 255, 0.1) 100px
          ),
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 95px,
            rgba(255, 255, 255, 0.1) 95px,
            rgba(255, 255, 255, 0.1) 100px
          )
        `,
        opacity: 0.3,
        zIndex: 0
      }}></div>

      <div style={{ 
        zIndex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        maxWidth: '900px',
        width: '100%'
      }}>
        {/* Titre principal avec style stade */}
        <div style={{
          textAlign: 'center',
          marginBottom: '30px',
          padding: '20px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '20px',
          border: '3px solid #FFD700',
          boxShadow: '0 0 30px rgba(255, 215, 0, 0.5)',
          backdropFilter: 'blur(10px)'
        }}>
          <h1 style={{
            fontSize: '3.5rem',
            margin: '0 0 10px 0',
            background: 'linear-gradient(45deg, #FFD700, #FFA500, #FF6347)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 20px rgba(255, 215, 0, 0.8)',
            letterSpacing: '2px',
            fontWeight: 'bold'
          }}>
            ⚽ FOOTBALL JUGGLING ⚽
          </h1>
          <div style={{
            fontSize: '1.2rem',
            color: '#FFD700',
            fontStyle: 'italic',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
          }}>
            🏆 Championship Edition 🏆
          </div>
        </div>

        {/* Panneau de score */}
        <div style={{
          fontSize: '1.8rem',
          marginBottom: '30px',
          padding: '15px 30px',
          background: 'linear-gradient(45deg, #1a1a2e, #16213e)',
          borderRadius: '15px',
          border: '3px solid #FFD700',
          boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
          minWidth: '200px',
          textAlign: 'center'
        }}>
          <div style={{ color: '#FFD700', fontSize: '1rem', marginBottom: '5px' }}>SCORE</div>
          <div style={{ fontWeight: 'bold', color: '#FFFFFF' }}>
            {score} point{score !== 1 ? 's' : ''}
          </div>
        </div>

        {gameState === 'waiting' && (
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '30px',
            padding: '30px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderRadius: '20px',
            border: '2px solid rgba(255, 215, 0, 0.8)',
            maxWidth: '600px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
          }}>
            <h2 style={{ 
              color: '#FFD700', 
              fontSize: '2rem', 
              marginBottom: '20px',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
            }}>
              🎮 PRÊT À JOUER ? 🎮
            </h2>
            
            <div style={{
              background: 'linear-gradient(45deg, rgba(255, 215, 0, 0.2), rgba(255, 165, 0, 0.2))',
              padding: '20px',
              borderRadius: '15px',
              marginBottom: '25px',
              border: '1px solid rgba(255, 215, 0, 0.5)'
            }}>
              <p style={{ 
                fontSize: '1.3rem', 
                marginBottom: '15px',
                lineHeight: '1.6'
              }}>
                🎯 <strong>OBJECTIF :</strong> Gardez le ballon en l'air !<br/>
                👆 <strong>CONTRÔLES :</strong> Cliquez sur le ballon pour le faire rebondir<br/>
                🏆 <strong>DÉFI :</strong> Évitez que le ballon touche le sol !
              </p>
            </div>
            
            {/* Ballon animé */}
            <div style={{
              fontSize: '4rem',
              marginBottom: '25px',
              animation: 'bounce 2s infinite'
            }}>
              ⚽
            </div>
            
            {/* Bouton maintenant placé APRÈS le ballon */}
            <button
              onClick={startGame}
              style={{
                fontSize: '1.8rem',
                padding: '20px 40px',
                background: 'linear-gradient(45deg, #4CAF50, #45a049)',
                color: 'white',
                border: '3px solid #2E7D32',
                borderRadius: '15px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 6px 20px rgba(76, 175, 80, 0.4)',
                fontWeight: 'bold',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginBottom: '20px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(76, 175, 80, 0.6)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.4)';
              }}
            >
              🚀 COUP D'ENVOI ! 🚀
            </button>
            
            <div style={{
              fontSize: '1rem',
              opacity: 0.8,
              fontStyle: 'italic'
            }}>
              ⭐ Montrez vos talents de jongleur ! ⭐
            </div>
          </div>
        )}

        {gameState === 'gameOver' && (
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '30px',
            padding: '30px',
            background: 'linear-gradient(45deg, #d32f2f, #f44336)',
            borderRadius: '20px',
            border: '3px solid #ff6b6b',
            maxWidth: '500px',
            boxShadow: '0 10px 25px rgba(211, 47, 47, 0.5)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🏁</div>
            <h2 style={{ marginBottom: '15px', fontSize: '2rem', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
              MATCH TERMINÉ !
            </h2>
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '15px',
              borderRadius: '10px',
              marginBottom: '20px'
            }}>
              <p style={{ fontSize: '1.5rem', marginBottom: '10px', fontWeight: 'bold' }}>
                🏆 Score final: {score} point{score !== 1 ? 's' : ''}
              </p>
              <p style={{ marginBottom: '0', fontSize: '1.1rem' }}>
                {score === 0 && "🔥 Échauffement terminé ! Essayez encore !"}
                {score > 0 && score < 5 && "👍 Bon début ! Continuez l'entraînement !"}
                {score >= 5 && score < 10 && "🎉 Bien joué ! Vous progressez !"}
                {score >= 10 && score < 20 && "⭐ Excellent contrôle du ballon !"}
                {score >= 20 && "🏆 LÉGENDE DU FOOTBALL ! Champion !"}
              </p>
            </div>
            <button
              onClick={restartGame}
              style={{
                fontSize: '1.5rem',
                padding: '15px 30px',
                background: 'linear-gradient(45deg, #4CAF50, #45a049)',
                color: 'white',
                border: '2px solid #2E7D32',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                fontWeight: 'bold'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.5)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
              }}
            >
              🔄 NOUVELLE PARTIE
            </button>
          </div>
        )}

        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={handleCanvasClick}
          style={{
            border: '4px solid #FFD700',
            borderRadius: '15px',
            cursor: gameState === 'playing' ? 'pointer' : 'default',
            boxShadow: '0 12px 24px rgba(0,0,0,0.6)',
            backgroundColor: '#87CEEB',
            maxWidth: '100%',
            height: 'auto'
          }}
        />

        {gameState === 'playing' && (
          <div style={{
            marginTop: '25px',
            textAlign: 'center',
            fontSize: '1.2rem',
            padding: '15px 25px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '12px',
            border: '2px solid rgba(255, 215, 0, 0.5)',
            maxWidth: '400px'
          }}>
            <div style={{ marginBottom: '8px', fontSize: '1.5rem' }}>⚡</div>
            <div style={{ color: '#FFD700', fontWeight: 'bold' }}>
              Cliquez sur le ballon pour le faire rebondir !
            </div>
          </div>
        )}
      </div>

      {/* Animations CSS */}
      <style>{`
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
          60% {
            transform: translateY(-5px);
          }
        }
      `}</style>
    </div>
  );
};

export default Block;