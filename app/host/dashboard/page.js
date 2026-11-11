
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function HostDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [hostRole, setHostRole] = useState("");
  const [game, setGame] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function checkHost() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/host");
        return;
      }

      const { data, error } = await supabase
        .from("host_roles")
        .select("role, approved")
        .eq("user_id", user.id)
        .single();

      if (error || !data?.approved) {
        await supabase.auth.signOut();
        router.replace("/host");
        return;
      }

      setHostRole(data.role);
      setLoading(false);
    }

    checkHost();
  }, [router]);

  async function startNewGame() {
    setCreating(true);
    setMessage("");
    setGame(null);

    const { data, error } = await supabase.rpc("create_trivia_game");

    if (error) {
      setMessage("Could not create game: " + error.message);
      setCreating(false);
      return;
    }

    setGame(data);
    setMessage("Your new trivia game is ready!");
    setCreating(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/host");
  }

  if (loading) {
    return (
      <main style={styles.main}>
        <h2>Checking host access...</h2>
      </main>
    );
  }

  return (
    <main style={styles.main}>
      <div style={styles.container}>
        <h1 style={styles.title}>🍺 BrewHausTrivia</h1>
        <h2>Host Dashboard</h2>

        <p>Welcome! You are signed in as an approved {hostRole}.</p>

        <div style={styles.panel}>
          <h3>Game Management</h3>

          <button
            onClick={startNewGame}
            disabled={creating}
            style={styles.button}
          >
            {creating ? "Creating Game..." : "START NEW GAME"}
          </button>

          {message && <p>{message}</p>}

          {game && (
            <div style={styles.gameBox}>
              <h3>Your Game Code</h3>
              <p style={styles.gameCode}>{game.game_code}</p>
              <p>Players can use this code to join your game.</p>
              <p>Status: {game.status}</p>
            </div>
          )}

          <button style={styles.button}>Manage Questions</button>
          <button style={styles.button}>Manage Players</button>
          <button style={styles.button}>View Leaderboard</button>
        </div>

        {hostRole === "owner" && (
          <div style={styles.panel}>
            <h3>Owner Controls</h3>
            <button style={styles.button}>Manage Hosts</button>
          </div>
        )}

        <button onClick={signOut} style={styles.signOut}>
          SIGN OUT
        </button>
      </div>
    </main>
  );
}

const styles = {
  main: {
    minHeight: "100vh",
    background: "#101820",
    color: "white",
    fontFamily: "Arial, sans-serif",
    padding: "40px 20px",
    textAlign: "center"
  },
  container: {
    maxWidth: "650px",
    margin: "auto"
  },
  title: {
    color: "#E6A23C",
    fontSize: "38px"
  },
  panel: {
    background: "#1d2b36",
    padding: "25px",
    borderRadius: "14px",
    marginTop: "25px"
  },
  button: {
    display: "block",
    width: "100%",
    padding: "15px",
    margin: "12px 0",
    background: "#E6A23C",
    color: "#101820",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer"
  },
  gameBox: {
    background: "#101820",
    padding: "20px",
    borderRadius: "12px",
    marginTop: "20px"
  },
  gameCode: {
    color: "#E6A23C",
    fontSize: "36px",
    fontWeight: "bold",
    letterSpacing: "6px"
  },
  signOut: {
    marginTop: "25px",
    padding: "12px 25px",
    background: "transparent",
    color: "white",
    border: "1px solid white",
    borderRadius: "8px",
    cursor: "pointer"
  }
};
