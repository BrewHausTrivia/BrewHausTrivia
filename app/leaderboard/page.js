"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

function LeaderboardContent() {
  const searchParams = useSearchParams();
  const playerId = searchParams.get("player");

  const [players, setPlayers] = useState([]);
  const [message, setMessage] = useState("Loading leaderboard...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerId) {
      setMessage("Please join a game first.");
      setLoading(false);
      return;
    }

    let stopped = false;

    async function loadLeaderboard() {
      const token = sessionStorage.getItem("trivia_session_token");

      if (!token) {
        setMessage("Player session not found. Please join again.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc(
        "get_game_leaderboard",
        {
          p_player_id: playerId,
          p_session_token: token
        }
      );

      if (stopped) return;

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setPlayers(data || []);
      setMessage("");
      setLoading(false);
    }

    loadLeaderboard();

    const interval = setInterval(loadLeaderboard, 3000);

    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [playerId]);

  return (
    <main style={{
      minHeight: "100vh",
      background: "#171717",
      color: "white",
      padding: "40px 20px",
      fontFamily: "Arial, sans-serif"
    }}>
      <div style={{
        maxWidth: 700,
        margin: "0 auto",
        textAlign: "center"
      }}>

        <h1 style={{
          fontSize: 38,
          color: "#D6A84F",
          marginBottom: 8
        }}>
          BrewHausTrivia
        </h1>

        <p style={{
          color: "#aaa",
          marginBottom: 35
        }}>
          THE ULTIMATE TRIVIA CHALLENGE
        </p>

        <h2 style={{
          fontSize: 30,
          marginBottom: 8
        }}>
          🏆 Live Leaderboard
        </h2>

        <p style={{
          color: "#aaa",
          fontSize: 14,
          marginBottom: 30
        }}>
          Rankings update automatically every 3 seconds.
        </p>

        {loading && <p>Loading leaderboard...</p>}

        {players.map((player) => (
          <div
            key={player.rank}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "20px",
              marginBottom: 12,
              borderRadius: 12,
              background: player.rank === 1
                ? "#D6A84F"
                : "#292929",
              color: player.rank === 1 ? "#171717" : "white",
              border: player.rank === 1
                ? "2px solid #F5D58A"
                : "1px solid #444",
              fontSize: 18
            }}
          >
            <strong>
              {player.rank === 1 ? "🥇" :
               player.rank === 2 ? "🥈" :
               player.rank === 3 ? "🥉" :
               `#${player.rank}`}
              {" "}{player.nickname}
            </strong>

            <strong>
              {player.total_score} points
            </strong>
          </div>
        ))}

        {!loading && players.length === 0 && !message && (
          <p>No players have joined yet.</p>
        )}

        {message && (
          <p style={{ color: "#D6A84F" }}>
            {message}
          </p>
        )}

      </div>
    </main>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<main>Loading leaderboard...</main>}>
      <LeaderboardContent />
    </Suspense>
  );
}
