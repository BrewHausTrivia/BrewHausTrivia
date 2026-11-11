
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function HostWinners() {
  const router = useRouter();

  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [message, setMessage] = useState("");

  const loadGameData = useCallback(async () => {
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/host");
      return;
    }

    const { data: roleData, error: roleError } = await supabase
      .from("host_roles")
      .select("approved")
      .eq("user_id", user.id)
      .single();

    if (roleError || !roleData?.approved) {
      router.replace("/host");
      return;
    }

    const { data: gameData, error: gameError } =
      await supabase.rpc("host_get_latest_game");

    if (gameError) {
      setMessage(gameError.message);
      setLoading(false);
      return;
    }

    if (!gameData) {
      setGame(null);
      setPlayers([]);
      setMessage("No game has been created yet.");
      setLoading(false);
      return;
    }

    const { data: leaderboardData, error: leaderboardError } =
      await supabase.rpc("host_get_game_leaderboard", {
        p_game_id: gameData.id
      });

    if (leaderboardError) {
      setMessage(leaderboardError.message);
    } else {
      setGame(gameData);
      setPlayers(leaderboardData || []);
      setMessage("");
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadGameData();

    const interval = setInterval(loadGameData, 3000);

    return () => clearInterval(interval);
  }, [loadGameData]);

  async function finishGame() {
    if (!game || finishing) return;

    const confirmed = window.confirm(
      "Are you sure you want to finish this game?"
    );

    if (!confirmed) return;

    setFinishing(true);

    const { error } = await supabase.rpc("host_control_game", {
      p_game_id: game.id,
      p_action: "finish_game"
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Game successfully finished!");
      await loadGameData();
    }

    setFinishing(false);
  }

  if (loading) {
    return <main style={styles.page}>Loading winners...</main>;
  }

  return (
    <main style={styles.page}>
      <h1 style={styles.title}>BREWHAUSTRIVIA</h1>
      <h2 style={styles.heading}>FINAL LEADERBOARD</h2>

      {message && <p>{message}</p>}

      {game && (
        <>
          <p style={styles.info}>
            Game Code: {game.game_code}
          </p>

          <p style={styles.info}>
            Status: {game.status}
          </p>

          <div style={styles.list}>
            {players.length === 0 ? (
              <p>No players have joined this game yet.</p>
            ) : (
              players.map((player) => (
                <div
                  key={player.rank}
                  style={{
                    ...styles.player,
                    ...(player.rank === 1 ? styles.firstPlace : {})
                  }}
                >
                  <span style={styles.rank}>
                    {player.rank === 1
                      ? "🥇"
                      : player.rank === 2
                      ? "🥈"
                      : player.rank === 3
                      ? "🥉"
                      : `#${player.rank}`}
                  </span>

                  <span style={styles.name}>
                    {player.nickname}
                  </span>

                  <span style={styles.score}>
                    {player.total_score} POINTS
                  </span>
                </div>
              ))
            )}
          </div>

          {game.status !== "finished" && (
            <button
              onClick={finishGame}
              disabled={finishing}
              style={styles.button}
            >
              {finishing ? "Finishing..." : "FINISH GAME"}
            </button>
          )}

          {game.status === "finished" && (
            <h2 style={styles.finished}>
              GAME FINISHED!
            </h2>
          )}
        </>
      )}

      <button
        onClick={() => router.push("/host/dashboard")}
        style={styles.backButton}
      >
        BACK TO HOST DASHBOARD
      </button>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#101010",
    color: "white",
    padding: "40px 20px",
    textAlign: "center",
    fontFamily: "Arial, sans-serif"
  },
  title: {
    color: "#D6A84B",
    fontSize: "clamp(32px, 6vw, 64px)",
    fontWeight: "900"
  },
  heading: {
    fontSize: "clamp(25px, 4vw, 42px)",
    marginTop: "25px"
  },
  info: {
    color: "#D6A84B",
    fontSize: "18px",
    fontWeight: "bold"
  },
  list: {
    maxWidth: "900px",
    margin: "30px auto"
  },
  player: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    background: "#252525",
    borderRadius: "12px",
    padding: "18px 24px",
    marginBottom: "12px",
    fontSize: "clamp(18px, 3vw, 30px)"
  },
  firstPlace: {
    background: "#493918",
    border: "2px solid #D6A84B"
  },
  rank: {
    width: "55px",
    textAlign: "center"
  },
  name: {
    flex: 1,
    textAlign: "left",
    fontWeight: "bold"
  },
  score: {
    color: "#D6A84B",
    fontWeight: "bold"
  },
  button: {
    background: "#D6A84B",
    color: "#101010",
    padding: "16px 30px",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    fontSize: "18px",
    cursor: "pointer",
    marginTop: "20px"
  },
  finished: {
    color: "#D6A84B",
    marginTop: "25px"
  },
  backButton: {
    display: "block",
    margin: "35px auto 0",
    padding: "12px 20px",
    background: "#333333",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer"
  }
};
