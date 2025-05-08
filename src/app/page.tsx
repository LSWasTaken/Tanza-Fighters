'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { FiZap, FiAward, FiPlay, FiSend, FiRefreshCw, FiEye, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';
import debounce from 'lodash/debounce';

const GAME_DURATION = 15;

export default function Home() {
  const [score, setScore] = useState(0);
  const [name, setName] = useState('');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameActive, setGameActive] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [progress, setProgress] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingLeaderboard, setIsFetchingLeaderboard] = useState(false);

  // Load name from localStorage
  useEffect(() => {
    const savedName = localStorage.getItem('fighterName');
    if (savedName) setName(savedName);
  }, []);

  // Save name to localStorage
  useEffect(() => {
    if (name.trim()) {
      localStorage.setItem('fighterName', name.trim());
    } else {
      localStorage.removeItem('fighterName');
    }
  }, [name]);

  // Game Timer
  useEffect(() => {
    let timer;
    if (gameActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && gameActive) {
      setGameActive(false);
      setShowLeaderboard(true);
    }
    return () => clearInterval(timer);
  }, [gameActive, timeLeft]);

  // Fetch Leaderboard
  useEffect(() => {
    fetchLeaderboard();
  }, []);

  // Keyboard support for Strike button
  useEffect(() => {
    const handleKey  = (e) => {
      if (e.code === 'Space' && gameActive && timeLeft > 0) {
        handleClick();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameActive, timeLeft]);

  const sanitizeName = (input) => {
    return input.replace(/[<>{}]/g, '').trim().slice(0, 20);
  };

  const startGame = () => {
    if (!name.trim()) {
      toast.error('Please enter your fighter name!');
      return;
    }
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setGameActive(true);
    setProgress(0);
    setShowLeaderboard(false);
  };

  const updateProgress = useCallback(
    debounce(() => {
      setProgress(100);
      setTimeout(() => setProgress(0), 150);
    }, 100),
    []
  );

  const handleClick = () => {
    if (gameActive) {
      setScore(prevScore => prevScore + 1);
      updateProgress();
    }
  };

  const handleNameChange = (e) => {
    const newName = sanitizeName(e.target.value);
    setName(newName);
  };

  const handleNameBlur = () => {
    setName(name.trim());
  };

  const submitScoreToLeaderboard = async () => {
    if (!name.trim()) {
      toast.error('Please enter your fighter name.');
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'leaderboard'), {
        name: name.trim(),
        score,
        timestamp: serverTimestamp(),
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${name.trim()}`,
        timePlayed: GAME_DURATION,
      });
      toast.success('Score submitted successfully!');
      setName('');
      fetchLeaderboard();
    } catch (error) {
      console.error('Error submitting score:', error);
      toast.error('Failed to submit score.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchLeaderboard = async () => {
    if (isFetchingLeaderboard) return;
    setIsFetchingLeaderboard(true);
    try {
      const q = query(
        collection(db, 'leaderboard'),
        orderBy('score', 'desc'),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const scores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLeaderboard(scores);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast.error('Could not fetch leaderboard.');
    } finally {
      setIsFetchingLeaderboard(false);
    }
  };

  const canStartGame = name.trim() !== '';
  const gameHasEnded = timeLeft === 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-6 sm:pt-10 bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white p-4 font-sans selection:bg-yellow-400 selection:text-slate-900">
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-4 sm:mb-6 ...">
        Tanza Fighters ⚔️
      </h1>

      {/* Instructions */}
      {!gameActive && !gameHasEnded && (
        <div className="text-center mb-5 w-full max-w-xs sm:max-w-sm text-gray-300">
          <p className="text-sm">
            Enter your fighter name and click <strong>Start Epic Battle!</strong> Click or press spacebar on the <strong>STRIKE!</strong> button as many times as possible in 15 seconds to score points. Submit your score to join the leaderboard!
          </p>
        </div>
      )}

      {/* Name Input */}
      {(!gameActive || gameHasEnded) && (
        <div className="mb-5 w-full max-w-xs sm:max-w-sm">
          <label htmlFor="fighterName" className="block text-sm font-medium text-yellow-300 mb-1 ml-1">
            Fighter Name:
          </label>
          <input
            id="fighterName"
            type="text"
            placeholder="Enter Your Name (Max 20)"
            className="w-full p-3 border-2 border-purple-600 ..."
            value={name}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            maxLength={20}
            disabled={gameActive && !gameHasEnded}
            aria-describedby="fighterNameHint"
          />
          <span id="fighterNameHint" className="sr-only">Enter your fighter name, maximum 20 characters</span>
        </div>
      )}

      {/* Game Active */}
      {gameActive && !gameHasEnded && (
        <div className="w-full max-w-xs sm:max-w-sm flex flex-col items-center mb-6 space-y-3">
          <div className="text-5xl font-bold text-yellow-400 drop-shadow-lg">Score: {score} 🔥</div>
          <div className="text-2xl text-orange-400">Time: {timeLeft}s</div>
          <button
            className="w-full bg-gradient-to-br from-red-500 ..."
            onClick={handleClick}
            disabled={!gameActive}
            aria-label="Click or press space to score points"
            onKeyDown={(e) => e.code === 'Space' && handleClick()}
          >
            <span className="text-3xl sm:text-4xl drop-shadow-lg">STRIKE! 🗡️</span>
          </button>
          <div className="w-full bg-slate-700 h-5 rounded-full mt-2 overflow-hidden shadow-inner">
            <div
              className="bg-gradient-to-r from-yellow-400 to-orange-500 ..."
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Controls */}
      {!gameActive && (
        <div className="w-full max-w-xs sm:max-w-sm flex flex-col items-center space-y-3">
          {gameHasEnded && (
            <div className="text-center mb-3 p-3 bg-slate-800 rounded-lg shadow-md">
              <p className="text-lg text-gray-300">Battle Over!</p>
              <p className="text-3xl font-bold text-yellow-400">Final Score: {score} 💥</p>
            </div>
          )}
          <button
            className={`w-full font-semibold py-3 px-5 ... ${
              canStartGame
                ? 'bg-green-500 hover:bg-green-600 ...'
                : 'bg-gray-600 text-gray-400 ...'
            }`}
            onClick={startGame}
            disabled={!canStartGame}
            aria-label={gameHasEnded ? 'Play again' : 'Start game'}
          >
            <FiPlay className="mr-2" /> {gameHasEnded ? 'Play Again!' : 'Start Epic Battle!'}
          </button>
          {gameHasEnded && score > 0 && (
            <button
              className="w-full bg-blue-600 hover:bg-blue-700 ..."
              onClick={submitScoreToLeaderboard}
              disabled={isSubmitting}
              aria-label="Submit score to leaderboard"
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <FiRefreshCw className="animate-spin mr-2" /> Submitting...
                </span>
              ) : (
                <span className="flex items-center">
                  <FiSend className="mr-2" /> Submit Score 🏅
                </span>
              )}
            </button>
          )}
        </div>
      )}

      {/* Leaderboard */}
      <div className={`mt-6 sm:mt-8 w-full max-w-md lg:max-w-lg ... ${showLeaderboard ? 'opacity-100 max-h-[1000px]' : 'opacity-0 max-h-0 overflow-hidden'}`}>
        <div className="bg-slate-800 bg-opacity-80 backdrop-blur-sm p-4 sm:p-6 rounded-xl shadow-2xl">
          <h2 className="text-2xl sm:text-3xl font-semibold ...">
            <FiAward className="mr-2 text-yellow-400 text-3xl" /> Top Fighters <FiAward className="ml-2 text-yellow-400 text-3xl" />
          </h2>
          {isFetchingLeaderboard && leaderboard.length === 0 ? (
            <p className="text-center text-gray-400 py-4">Loading Champions...</p>
          ) : leaderboard.length > 0 ? (
            <ul className="space-y-2 sm:space-y-3">
              {leaderboard.map((entry, index) => (
                <li
                  key={entry.id}
                  className={`flex justify-between items-center ... ${
                    index === 0 ? 'bg-gradient-to-r from-yellow-600 ...' :
                    index === 1 ? 'bg-gradient-to-r from-slate-500 ...' :
                    index === 2 ? 'bg-gradient-to-r from-orange-800 ...' :
                    'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  <div className="flex items-center">
                    <span className={`font-bold text-md sm:text-lg ... ${
                      index === 0 ? 'text-slate-800' :
                      index === 1 ? 'text-gray-100' :
                      index === 2 ? 'text-amber-100' :
                      'text-yellow-400'
                    }`}>
                      #{index + 1}
                    </span>
                    <span className={`font-medium text-md sm:text-lg ... ${index === 0 ? 'text-slate-800 font-semibold' : ''}`}>
                      {entry.name}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className={`font-bold text-lg sm:text-xl ${index === 0 ? 'text-slate-800' : 'text-yellow-400'}`}>
                      {entry.score}
                    </span>
                    <span className="ml-1 text-sm sm:text-md">🔥</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-gray-400 py-4">No scores yet. Be the first legend!</p>
          )}
          <button
            onClick={fetchLeaderboard}
            disabled={isFetchingLeaderboard}
            className="mt-4 sm:mt-5 w-full text-sm bg-purple-600 ..."
            aria-label="Refresh leaderboard"
          >
            <FiRefreshCw className={`mr-2 ${isFetchingLeaderboard ? 'animate-spin' : ''}`} /> {isFetchingLeaderboard ? 'Refreshing...' : 'Refresh Leaderboard'}
          </button>
        </div>
      </div>

      {/* Toggle Leaderboard */}
      <button
        onClick={() => setShowLeaderboard(!showLeaderboard)}
        className="mt-5 bg-transparent border-2 border-purple-500 ..."
        aria-label={showLeaderboard ? 'Hide leaderboard' : 'Show leaderboard'}
      >
        {showLeaderboard ? <FiEyeOff className="mr-2" /> : <FiEye className="mr-2" />}
        {showLeaderboard ? 'Hide' : 'Show'} Leaderboard
      </button>

      <footer className="text-center text-xs text-slate-400 mt-8 sm:mt-12 pb-6">
        Tanza Fighters © {new Date().getFullYear()} - Click Fast, Be Legendary!
      </footer>
    </div>
  );
}
