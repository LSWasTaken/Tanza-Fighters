'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { FiZap, FiAward, FiPlay, FiSend, FiRefreshCw, FiEye, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';
import debounce from 'lodash/debounce';

const GAME_DURATION = 15;
const LEADERBOARD_CACHE_KEY = 'tanza_leaderboard';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function ErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const errorHandler = (error) => {
      console.error(error);
      setHasError(true);
      toast.error('An error occurred. Please refresh the page.');
    };
    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  if (hasError) {
    return (
      <div className="text-center text-red-500 p-4">
        Something went wrong. Please refresh the page.
      </div>
    );
  }

  return children;
}

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

  // Game timer
  useEffect(() => {
    let timer;
    if (gameActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && gameActive) {
      setGameActive(false);
      setShowLeaderboard(true);
      toast('Game Over! Submit your score to the leaderboard!', {
        icon: '🎮',
      });
    }
    return () => clearInterval(timer);
  }, [gameActive, timeLeft]);

  // Fetch leaderboard with caching
  useEffect(() => {
    if (typeof window === 'undefined' || !db) return;

    const cached = localStorage.getItem(LEADERBOARD_CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        setLeaderboard(data);
        return;
      }
    }

    fetchLeaderboard();
  }, []);

  // Keyboard support
  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'Space' && gameActive && timeLeft > 0) {
        e.preventDefault();
        handleClick();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
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
    toast('Game Started! Strike fast!', { icon: '⚔️' });
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
      setScore((prevScore) => prevScore + 1);
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
    if (!db) {
      toast.error('Database not initialized. Please try again later.');
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
      localStorage.removeItem(LEADERBOARD_CACHE_KEY);
      fetchLeaderboard();
    } catch (error) {
      console.error('Error submitting score:', error);
      toast.error('Failed to submit score. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchLeaderboard = async () => {
    if (isFetchingLeaderboard || !db) return;
    setIsFetchingLeaderboard(true);
    try {
      const q = query(
        collection(db, 'leaderboard'),
        orderBy('score', 'desc'),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const scores = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setLeaderboard(scores);
      localStorage.setItem(
        LEADERBOARD_CACHE_KEY,
        JSON.stringify({ data: scores, timestamp: Date.now() })
      );
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
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col items-center justify-start pt-6 sm:pt-10 bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white p-4 font-sans selection:bg-yellow-400 selection:text-slate-900">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-4 sm:mb-6 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-500 to-red-600 animate-pulse drop-shadow-[0_3px_3px_rgba(0,0,0,0.7)]">
          Tanza Fighters ⚔️
        </h1>

        {!gameActive && !gameHasEnded && (
          <div className="text-center mb-5 w-full max-w-xs sm:max-w-sm text-gray-300">
            <p className="text-sm">
              Enter your fighter name and click <strong>Start Epic Battle!</strong> Click or press
              the spacebar on the <strong>STRIKE!</strong> button as many times as possible in 15
              seconds to score points. Submit your score to join the leaderboard!
            </p>
          </div>
        )}

        {(!gameActive || gameHasEnded) && (
          <div className="mb-5 w-full max-w-xs sm:max-w-sm">
            <label
              htmlFor="fighterName"
              className="block text-sm font-medium text-yellow-300 mb-1 ml-1"
            >
              Fighter Name:
            </label>
            <input
              id="fighterName"
              type="text"
              placeholder="Enter Your Name (Max 20)"
              className="w-full p-3 border-2 border-purple-600 rounded-lg bg-slate-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all shadow-md text-center"
              value={name}
              onChange={handleNameChange}
              onBlur={handleNameBlur}
              maxLength={20}
              disabled={gameActive && !gameHasEnded}
              aria-describedby="fighterNameHint"
            />
            <span id="fighterNameHint" className="sr-only">
              Enter your fighter name, maximum 20 characters
            </span>
          </div>
        )}

        {gameActive && !gameHasEnded && (
          <div className="w-full max-w-xs sm:max-w-sm flex flex-col items-center mb-6 space-y-3">
            <div className="text-5xl font-bold text-yellow-400 drop-shadow-lg">
              Score: {score} 🔥
            </div>
            <div className="text-2xl text-orange-400">Time: {timeLeft}s</div>
            <button
              className="w-full bg-gradient-to-br from-red-500 via-red-600 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white font-bold py-10 sm:py-12 px-6 rounded-3xl shadow-xl transform transition-all duration-150 ease-in-out active:scale-95 active:shadow-inner focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:ring-opacity-75 disabled:opacity-60 disabled:cursor-not-allowed text-shadow-lg"
              onClick={handleClick}
              disabled={!gameActive}
              aria-label="Click or press space to score points"
              onKeyDown={(e) => {
                if (e.code === 'Space') {
                  e.preventDefault();
                  handleClick();
                }
              }}
            >
              <span className="text-3xl sm:text-4xl drop-shadow-lg">STRIKE! 🗡️</span>
            </button>
            <div className="w-full bg-slate-700 h-5 rounded-full mt-2 overflow-hidden shadow-inner">
              <div
                className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full rounded-full transition-all duration-100 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {!gameActive && (
          <div className="w-full max-w-xs sm:max-w-sm flex flex-col items-center space-y-3">
            {gameHasEnded && (
              <div className="text-center mb-3 p-3 bg-slate-800 rounded-lg shadow-md">
                <p className="text-lg text-gray-300">Battle Over!</p>
                <p className="text-3xl font-bold text-yellow-400">Final Score: {score} 💥</p>
              </div>
            )}
            <button
              className={`w-full font-semibold py-3 px-5 rounded-lg shadow-md transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-75 flex items-center justify-center text-lg ${
                canStartGame
                  ? 'bg-green-500 hover:bg-green-600 focus:ring-green-400 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
              onClick={startGame}
              disabled={!canStartGame}
              aria-label={gameHasEnded ? 'Play again' : 'Start game'}
            >
              <FiPlay className="mr-2" /> {gameHasEnded ? 'Play Again!' : 'Start Epic Battle!'}
            </button>
            {gameHasEnded && score > 0 && (
              <button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-5 rounded-lg shadow-md transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 flex items-center justify-center text-lg disabled:bg-blue-800"
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

        <div
          className={`mt-6 sm:mt-8 w-full max-w-md lg:max-w-lg transition-all duration-500 ease-in-out ${
            showLeaderboard ? 'opacity-100 max-h-[1000px]' : 'opacity-0 max-h-0 overflow-hidden'
          }`}
        >
          <div className="bg-slate-800 bg-opacity-80 backdrop-blur-sm p-4 sm:p-6 rounded-xl shadow-2xl">
            <h2 className="text-2xl sm:text-3xl font-semibold mb-3 sm:mb-4 text-center text-yellow-400 flex items-center justify-center">
              <FiAward className="mr-2 text-yellow-400 text-3xl" /> Top Fighters{' '}
              <FiAward className="ml-2 text-yellow-400 text-3xl" />
            </h2>
            {isFetchingLeaderboard && leaderboard.length === 0 ? (
              <p className="text-center text-gray-400 py-4">Loading Champions...</p>
            ) : leaderboard.length > 0 ? (
              <ul className="space-y-2 sm:space-y-3">
                {leaderboard.map((entry, index) => (
                  <li
                    key={entry.id}
                    className={`flex justify-between items-center p-2.5 sm:p-3 rounded-lg shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${
                      index === 0
                        ? 'bg-gradient-to-r from-yellow-600 via-yellow-500 to-amber-500 text-slate-900 ring-2 ring-yellow-300'
                        : index === 1
                        ? 'bg-gradient-to-r from-slate-500 via-slate-400 to-gray-400 text-white ring-1 ring-slate-300'
                        : index === 2
                        ? 'bg-gradient-to-r from-orange-800 via-orange-700 to-amber-700 text-white ring-1 ring-orange-500'
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  >
                    <div className="flex items-center">
                      <span
                        className={`font-bold text-md sm:text-lg mr-2 sm:mr-3 w-7 sm:w-8 text-center ${
                          index === 0
                            ? 'text-slate-800'
                            : index === 1
                            ? 'text-gray-100'
                            : index === 2
                            ? 'text-amber-100'
                            : 'text-yellow-400'
                        }`}
                      >
                        #{index + 1}
                      </span>
                      <span
                        className={`font-medium text-md sm:text-lg truncate max-w-[120px] sm:max-w-[180px] md:max-w-[220px] ${
                          index === 0 ? 'text-slate-800 font-semibold' : ''
                        }`}
                      >
                        {entry.name}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span
                        className={`font-bold text-lg sm:text-xl ${
                          index === 0 ? 'text-slate-800' : 'text-yellow-400'
                        }`}
                      >
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
              className="mt-4 sm:mt-5 w-full text-sm bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 px-4 rounded-md shadow-sm transition-colors duration-150 ease-in-out flex items-center justify-center disabled:bg-purple-800"
              aria-label="Refresh leaderboard"
            >
              <FiRefreshCw className={`mr-2 ${isFetchingLeaderboard ? 'animate-spin' : ''}`} />{' '}
              {isFetchingLeaderboard ? 'Refreshing...' : 'Refresh Leaderboard'}
            </button>
          </div>
        </div>

        <button
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          className="mt-5 bg-transparent border-2 border-purple-500 hover:bg-purple-500 hover:text-white text-purple-300 font-medium py-2 px-5 rounded-lg transition-colors duration-200 text-sm flex items-center"
          aria-label={showLeaderboard ? 'Hide leaderboard' : 'Show leaderboard'}
        >
          {showLeaderboard ? <FiEyeOff className="mr-2" /> : <FiEye className="mr-2" />}
          {showLeaderboard ? 'Hide' : 'Show'} Leaderboard
        </button>

        <footer className="text-center text-xs text-slate-400 mt-8 sm:mt-12 pb-6">
          Tanza Fighters © {new Date().getFullYear()} - Click Fast, Be Legendary!
        </footer>
      </div>
    </ErrorBoundary>
  );
}
