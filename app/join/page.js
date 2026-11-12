
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
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      setGameCode(code.toUpperCase());
    }

    setIsOnline(navigator.onLine);

    function handleOnline() {
      setIsOnline(true);
      setMessage("");
    }

    function handleOffline() {
      setIsOnline(false);
      setMessage("You are offline. Please reconnect to join the game.");
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  async function joinGame(event) {
    event.preventDefault();

    if (loading) return;

    setMessage("");

    if (!navigator.onLine) {
      setIsOnline(false);
      setMessage("You are offline. Please reconnect and try again.");
      return;
    }

    if (gameCode.trim().length !== 6) {
      setMessage("Please enter the 6-character game code.");
      return;
    }

    if (!nickname.trim()) {
      setMessage("Please enter a nickname.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc(
        "join_trivia_game",
        {
          p_game_code: gameCode.trim().toUpperCase(),
          p_nickname: nickname.trim()
        }
      );

      if (error) {
        const errorText = (error.message || "").toLowerCase();

        if (
          errorText.includes("invalid") ||
          errorText.includes("not found") ||
          errorText.includes("does not exist")
        ) {
          setMessage("That game code is not valid. Please check it and try again.");
        } else if (
          errorText.includes("registration") ||
          errorText.includes("closed")
        ) {
          setMessage("Registration for this game is closed.");
        } else if (
          errorText.includes("full") ||
          errorText.includes("maximum")
        ) {
          setMessage("This game has reached its player limit.");
        } else {
          setMessage("We couldn't join you to the game. Please try again.");
        }

        return;
      }

      if (!data?.player_id || !data?.session_token) {
        setMessage("We couldn't complete your registration. Please try again.");
        return;
      }

      sessionStorage.setItem(
        "trivia_session_token",
        data.session_token
      );

      router.push(`/play?player=${data.player_id}`);
    } catch (error) {
      if (!navigator.onLine) {
        setIsOnline(false);
        setMessage("Your connection was lost. Please reconnect and try again.");
      } else {
        setMessage("Something went wrong while joining. Please try again.");
      }
    } finally {
      setLoading(false);
    }
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
              role="alert"
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

          {!isOnline && !message && (
            <p
              style={{
                color: "#E2A09A",
                fontSize: 14,
                marginTop: 18
              }}
            >
              Waiting for your internet connection...
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
