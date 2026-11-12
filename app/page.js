
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Home() {
  const router = useRouter();

  const [nickname, setNickname] = useState("");
  const [gameCode, setGameCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function joinGame(event) {
    event.preventDefault();
    setMessage("");

    if (gameCode.trim().length !== 6) {
      setMessage("Please enter the 6-character game code.");
      return;
    }

    if (!nickname.trim()) {
      setMessage("Please enter a nickname.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.rpc(
      "join_trivia_game",
      {
        p_game_code: gameCode.trim().toUpperCase(),
        p_nickname: nickname.trim()
      }
    );

    if (error || !data?.player_id || !data?.session_token) {
      setMessage(
        error?.message || "Could not join the game. Please try again."
      );
      setLoading(false);
      return;
    }

    sessionStorage.setItem(
      "trivia_session_token",
      data.session_token
    );

    router.push(`/play?player=${data.player_id}`);
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>🍺 BrewHausTrivia</h1>

        <p style={styles.subtitle}>
          GOOD DRINKS. GREAT QUESTIONS. FRIENDLY COMPETITION.
        </p>

        <section style={styles.card}>
          <h2 style={styles.heading}>JOIN A TRIVIA GAME</h2>

          <p style={styles.description}>
            Enter your game code and choose your player name.
          </p>

          <form onSubmit={joinGame}>
            <input
              placeholder="Enter your nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={24}
              required
              style={styles.input}
            />

            <input
              placeholder="Enter 6-character game code"
              value={gameCode}
              onChange={(e) =>
                setGameCode(e.target.value.toUpperCase())
              }
              maxLength={6}
              required
              style={styles.input}
            />

            <button
              type="submit"
              disabled={loading}
              style={styles.button}
            >
              {loading ? "JOINING..." : "JOIN GAME"}
            </button>
          </form>

          {message && (
            <p style={styles.error}>{message}</p>
          )}
        </section>

        <section style={styles.card}>
          <h2 style={styles.heading}>HOST A GAME</h2>

          <p style={styles.description}>
            Manage questions, rounds, players, and scores.
          </p>

          <button
            onClick={() => router.push("/host")}
            style={styles.button}
          >
            HOST LOGIN
          </button>
        </section>

        <section style={styles.leaderboard}>
          <h2>🏆 LIVE LEADERBOARD</h2>
          <p style={styles.description}>
            Follow the competition and see who's on top!
          </p>
          <button
            onClick={() => router.push("/tv-leaderboard")}
            style={styles.outlineButton}
          >
            VIEW LEADERBOARD
          </button>
        </section>

        <p style={styles.footer}>
          BREWHAUSTRIVIA • LET THE BEST TEAM WIN
        </p>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#101820",
    color: "white",
    fontFamily: "Arial, sans-serif",
    padding: "40px 20px",
    textAlign: "center",
    boxSizing: "border-box"
  },
  container: {
    maxWidth: "650px",
    margin: "auto"
  },
  title: {
    fontSize: "clamp(36px, 7vw, 52px)",
    color: "#E6A23C",
    marginBottom: "8px",
    fontWeight: "900"
  },
  subtitle: {
    color: "#cccccc",
    fontSize: "13px",
    letterSpacing: "2px",
    lineHeight: 1.7
  },
  card: {
    background: "#1d2b36",
    padding: "30px",
    borderRadius: "16px",
    marginTop: "30px"
  },
  heading: {
    color: "#E6A23C",
    fontSize: "24px"
  },
  description: {
    color: "#cccccc",
    lineHeight: 1.6
  },
  input: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: "15px",
    margin: "15px 0",
    borderRadius: "8px",
    border: "1px solid #555",
    fontSize: "16px"
  },
  button: {
    background: "#E6A23C",
    color: "#101820",
    border: "none",
    padding: "15px 25px",
    borderRadius: "8px",
    fontWeight: "bold",
    fontSize: "16px",
    cursor: "pointer",
    width: "100%",
    marginTop: "8px"
  },
  error: {
    color: "#ff7777",
    marginTop: "15px"
  },
  leaderboard: {
    marginTop: "25px",
    padding: "25px",
    border: "1px solid #E6A23C",
    borderRadius: "16px"
  },
  outlineButton: {
    background: "transparent",
    color: "#E6A23C",
    border: "2px solid #E6A23C",
    padding: "13px 25px",
    borderRadius: "8px",
    fontWeight: "bold",
    fontSize: "15px",
    cursor: "pointer",
    width: "100%"
  },
  footer: {
    color: "#888888",
    marginTop: "40px",
    fontSize: "13px",
    letterSpacing: "2px"
  }
};
