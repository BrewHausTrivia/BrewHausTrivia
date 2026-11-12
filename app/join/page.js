
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function JoinGame() {
  const router = useRouter();
  const [gameCode, setGameCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      setGameCode(code.toUpperCase());
    }
  }, []);

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
    <main
      style={{
        minHeight: "100vh",
        background: "#17191B",
        color: "#F1EBDD",
        padding: "30px 18px",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial, Helvetica, sans-serif"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 430,
          background: "#242729",
          border: "1px solid #3A3D3F",
          borderRadius: 10,
          padding: "32px 25px",
          boxSizing: "border-box",
          textAlign: "center"
        }}
      >
        <h1
          style={{
            fontSize: 29,
            letterSpacing: 1.5,
            margin: "0 0 8px",
            color: "#F1EBDD"
          }}
        >
          BREWHAUS<span style={{ color: "#B79A62" }}>TRIVIA</span>
        </h1>

        <p
          style={{
            color: "#A7A7A2",
            fontSize: 12,
            letterSpacing: 2,
            margin: "0 0 30px"
          }}
        >
          PUB TRIVIA
        </p>

        <div
          style={{
            borderTop: "1px solid #3A3D3F",
            paddingTop: 25
          }}
        >
          <h2
            style={{
              fontSize: 22,
              margin: "0 0 8px",
              fontWeight: 600
            }}
          >
            Join a Trivia Game
          </h2>

          <p
            style={{
              color: "#A7A7A2",
              fontSize: 14,
              margin: "0 0 25px"
            }}
          >
            Enter your game details below.
          </p>

          <form onSubmit={joinGame}>
            <input
              value={gameCode}
              onChange={(event) =>
                setGameCode(event.target.value.toUpperCase())
              }
              placeholder="ENTER GAME CODE"
              maxLength={6}
              required
              style={{
                display: "block",
                width: "100%",
                padding: 16,
                marginBottom: 14,
                boxSizing: "border-box",
                background: "#191C1E",
                border: "1px solid #494B4C",
                borderRadius: 6,
                color: "#F1EBDD",
                fontSize: 17,
                textAlign: "center",
                letterSpacing: 3,
                outline: "none"
              }}
            />

            <input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="CHOOSE A NICKNAME"
              maxLength={24}
              required
              style={{
                display: "block",
                width: "100%",
                padding: 16,
                marginBottom: 18,
                boxSizing: "border-box",
                background: "#191C1E",
                border: "1px solid #494B4C",
                borderRadius: 6,
                color: "#F1EBDD",
                fontSize: 16,
                textAlign: "center",
                outline: "none"
              }}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: 16,
                background: loading ? "#77705F" : "#B79A62",
                color: "#191919",
                border: "none",
                borderRadius: 6,
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: 1,
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "JOINING..." : "JOIN GAME"}
            </button>
          </form>

          {message && (
            <p
              style={{
                color: "#E2A09A",
                fontSize: 14,
                marginTop: 18,
                lineHeight: 1.5
              }}
            >
              {message}
            </p>
          )}
        </div>

        <p
          style={{
            color: "#777A7B",
            fontSize: 11,
            letterSpacing: 1,
            margin: "28px 0 0"
          }}
        >
          BREWHAUSTRIVIA
        </p>
      </div>
    </main>
  );
}
