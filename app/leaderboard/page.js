
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
      maxWidth: 650,
      margin: "40px auto",
      padding: 24,
      fontFamily: "Arial, sans-serif",
      textAlign: "center"
    }}>
      <h1>BrewHausTrivia</h1>
      <h2>Live Leaderboard</h2>

      <p>Rankings update automatically every 3 seconds.</p>

      {loading && <p>Loading leaderboard...</p>}

      {players.length > 0 && (
        <div style={{ marginTop: 24 }}>
          {players.map((player) => (
            <div
              key={player.rank}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 16,
                marginBottom: 10,
                border: "1px solid #ddd",
                borderRadius: 10,
                background: player.rank === 1 ? "#fff3cd" : "#fff"
              }}
            >
              <strong>
                #{player.rank} {player.nickname}
              </strong>

              <strong>
                {player.total_score} points
              </strong>
            </div>
          ))}
        </div>
      )}

      {!loading && players.length === 0 && !message && (
        <p>No players have joined yet.</p>
      )}

      {message && <p>{message}</p>}
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
