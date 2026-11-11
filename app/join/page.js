
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

    const code = gameCode.trim().toUpperCase();
    const name = nickname.trim();

    if (!code || !name) {
      setMessage("Enter both a game code and nickname.");
      setLoading(false);
      return;
    }

    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("id, status, registration_open")
      .eq("game_code", code)
      .maybeSingle();

    if (gameError || !game) {
      setMessage("Game not found. Check the code and try again.");
      setLoading(false);
      return;
    }

    if (game.status !== "waiting" || !game.registration_open) {
      setMessage("Registration for this game is closed.");
      setLoading(false);
      return;
    }

    const { data: player, error: playerError } = await supabase
      .from("players")
      .insert({
        game_id: game.id,
        nickname: name
      })
      .select("id")
      .single();

    if (playerError) {
      setMessage(
        playerError.code === "23505"
          ? "That nickname is already being used in this game."
          : playerError.message
      );
      setLoading(false);
      return;
    }

    router.push(`/play?player=${player.id}`);
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
          placeholder="Enter 6-character game code"
          maxLength={6}
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
          style={{
            display: "block",
            width: "100%",
            padding: 14,
            marginBottom: 14,
            boxSizing: "border-box"
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{ padding: "12px 24px", cursor: "pointer" }}
        >
          {loading ? "Joining..." : "Join Game"}
        </button>
      </form>

      {message && <p style={{ color: "red" }}>{message}</p>}
    </main>
  );
}
