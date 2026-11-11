
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function HostDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hostRole, setHostRole] = useState("");

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
          <button style={styles.button}>Start New Game</button>
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
