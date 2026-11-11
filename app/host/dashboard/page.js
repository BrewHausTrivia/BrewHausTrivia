
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function Dashboard() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
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

      setRole(data.role);
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
      setMessage(error.message);
    } else {
      setGame(data);
    }

    setCreating(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/host");
  }

  if (loading) {
    return <main style={{ padding: 30 }}>Loading dashboard...</main>;
  }

  return (
    <main style={{
      maxWidth: 800,
      margin: "40px auto",
      padding: 24,
      fontFamily: "Arial, sans-serif"
    }}>
      <h1>BrewHausTrivia Host Dashboard</h1>
      <p>Welcome! Your role: {role}</p>

      <hr />

      <h2>Game Management</h2>

      <button onClick={startNewGame} disabled={creating}>
        {creating ? "Creating Game..." : "Start New Game"}
      </button>

      {message && (
        <p style={{ color: "red" }}>{message}</p>
      )}

      {game && (
        <section style={{
          marginTop: 25,
          padding: 20,
          border: "2px solid #333",
          borderRadius: 10
        }}>
          <h2>Your Game Is Ready!</h2>
          <p>Give players this code to join:</p>
          <h1 style={{ fontSize: 42, letterSpacing: 6 }}>
            {game.game_code}
          </h1>
          <p>Status: {game.status}</p>
        </section>
      )}

      <hr />

      <h2>Coming Next</h2>
      <p>Manage Questions</p>
      <p>Manage Players</p>
      <p>View Leaderboard</p>

      {role === "owner" && <p>Manage Hosts</p>}

      <button onClick={signOut}>Sign Out</button>
    </main>
  );
}
