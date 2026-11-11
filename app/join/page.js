
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function JoinGame() {
  const router = useRouter();
  const [gameCode, setGameCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function joinGame(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    const { data, error } = await supabase.rpc(
      "join_trivia_game",
      {
        p_game_code: gameCode.trim().toUpperCase(),
        p_nickname: nickname.trim()
      }
    );

    if (error) {
      setMessage(error.message);
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
    <main style={{
      maxWidth: 420,
      margin: "60px auto",
      padding: 24,
      fontFamily: "Arial, sans-serif",
      textAlign: "center"
    }}>
      <h1>BrewHausTrivia</h1>
      <h2>Join a Trivia Game</h2>

      <form onSubmit={joinGame}>
        <input
          value={gameCode}
          onChange={(event) => setGameCode(event.target.value)}
          placeholder="Enter game code"
          maxLength={6}
          required
          style={{
            display: "block",
            width: "100%",
            padding: 14,
            marginBottom: 14,
            boxSizing: "border-box"
          }}
        />

        <input
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          placeholder="Choose a nickname"
          maxLength={24}
          required
          style={{
            display: "block",
            width: "100%",
            padding: 14,
            marginBottom: 14,
            boxSizing: "border-box"
          }}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Joining..." : "Join Game"}
        </button>
      </form>

      {message && <p style={{ color: "red" }}>{message}</p>}
    </main>
  );
}
