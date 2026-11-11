
"use client";

import { useState } from "react";

export default function Home() {
  const [nickname, setNickname] = useState("");
  const [gameCode, setGameCode] = useState("");

  return (
    <main style={{
      minHeight: "100vh",
      background: "#101820",
      color: "white",
      fontFamily: "Arial, sans-serif",
      padding: "40px 20px",
      textAlign: "center"
    }}>
      <div style={{ maxWidth: "650px", margin: "auto" }}>
        <h1 style={{
          fontSize: "42px",
          color: "#E6A23C",
          marginBottom: "8px"
        }}>
          🍺 BrewHausTrivia
        </h1>

        <p style={{ color: "#cccccc", fontSize: "18px" }}>
          Good drinks. Great questions. Friendly competition.
        </p>

        <div style={{
          background: "#1d2b36",
          padding: "30px",
          borderRadius: "16px",
          marginTop: "35px"
        }}>
          <h2>Join a Trivia Game</h2>

          <input
            placeholder="Enter your nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Enter game code"
            value={gameCode}
            onChange={(e) => setGameCode(e.target.value)}
            style={inputStyle}
          />

          <button
            onClick={() => alert("Player joining will be connected soon!")}
            style={buttonStyle}
          >
            JOIN GAME
          </button>
        </div>

        <div style={{
          background: "#1d2b36",
          padding: "30px",
          borderRadius: "16px",
          marginTop: "25px"
        }}>
          <h2>Host Dashboard</h2>
          <p style={{ color: "#cccccc" }}>
            Manage questions, rounds, players, and scores.
          </p>
          <button
            onClick={() => alert("Host dashboard coming soon!")}
            style={buttonStyle}
          >
            HOST A GAME
          </button>
        </div>

        <div style={{
          marginTop: "30px",
          padding: "20px",
          border: "1px solid #E6A23C",
          borderRadius: "16px"
        }}>
          <h2>🏆 Live Leaderboard</h2>
          <p style={{ color: "#cccccc" }}>
            Player rankings will appear here during the game.
          </p>
        </div>

        <p style={{
          color: "#888888",
          marginTop: "40px",
          fontSize: "13px"
        }}>
          BREWHAUSTRIVIA • LET THE BEST TEAM WIN
        </p>
      </div>
    </main>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  padding: "15px",
  margin: "15px 0",
  borderRadius: "8px",
  border: "1px solid #555",
  fontSize: "16px"
};

const buttonStyle = {
  background: "#E6A23C",
  color: "#101820",
  border: "none",
  padding: "15px 25px",
  borderRadius: "8px",
  fontWeight: "bold",
  fontSize: "16px",
  cursor: "pointer",
  width: "100%"
};
