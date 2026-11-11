
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function Dashboard() {
  const router = useRouter();
  const [role, setRole] = useState("");
  const [game, setGame] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/host");
      return;
    }

    const { data: roleData, error: roleError } = await supabase
      .from("host_roles")
      .select("role, approved")
      .eq("user_id", user.id)
      .single();

    if (roleError || !roleData?.approved) {
      await supabase.auth.signOut();
      router.replace("/host");
      return;
    }

    setRole(roleData.role);

    const { data: gameData, error } = await supabase.rpc(
      "host_get_latest_game"
    );

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setGame(gameData);

    if (gameData) {
      const { data: questionData, error: questionError } =
        await supabase.rpc("host_get_questions", {
          p_game_id: gameData.id
        });

      if (questionError) {
        setMessage(questionError.message);
      } else {
        setQuestions(questionData || []);
      }
    } else {
      setQuestions([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function createGame() {
    setMessage("");

    const { error } = await supabase.rpc("create_trivia_game");

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("New game created!");
    setLoading(true);
    await loadDashboard();
  }

  async function controlGame(action, questionNumber = null) {
    if (!game) return;

    setMessage("");

    const { error } = await supabase.rpc("host_control_game", {
      p_game_id: game.id,
      p_action: action,
      p_question_number: questionNumber
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      action === "release_question"
        ? `Question ${questionNumber} released!`
        : "Game updated!"
    );

    await loadDashboard();
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
      maxWidth: 850,
      margin: "40px auto",
      padding: 24,
      fontFamily: "Arial, sans-serif"
    }}>
      <h1>BrewHausTrivia Host Dashboard</h1>
      <p>Welcome! Your role: {role}</p>

      {message && <p>{message}</p>}

      {!game ? (
        <>
          <h2>No game found</h2>
          <button onClick={createGame}>Start New Game</button>
        </>
      ) : (
        <>
          <section style={{
            border: "2px solid #333",
            borderRadius: 10,
            padding: 20,
            marginBottom: 25
          }}>
            <h2>Current Game</h2>
            <p>Game code:</p>
            <h1 style={{ fontSize: 42, letterSpacing: 6 }}>
              {game.game_code}
            </h1>
            <p>Status: {game.status}</p>
            <p>
              Registration: {game.registration_open ? "Open" : "Closed"}
            </p>
            <p>Current question: {game.current_question}</p>

            <button onClick={() => controlGame("open_registration")}>
              Open Registration
            </button>

            <button
              onClick={() => controlGame("close_registration")}
              style={{ marginLeft: 8 }}
            >
              Close Registration
            </button>

            <button
              onClick={() => controlGame("finish_game")}
              style={{ marginLeft: 8 }}
            >
              End Game
            </button>
          </section>

          <h2>Questions</h2>

          {questions.length === 0 && (
            <p>No questions have been added to this game yet.</p>
          )}

          {questions.map((question) => (
            <section
              key={question.question_number}
              style={{
                border: "1px solid #ccc",
                borderRadius: 8,
                padding: 15,
                marginBottom: 12
              }}
            >
              <h3>
                Round {question.round_number} · Question {question.question_number}
              </h3>

              <p>{question.prompt}</p>

              {question.is_released ? (
                <p><strong>Currently released</strong></p>
              ) : (
                <button
                  onClick={() =>
                    controlGame("release_question", question.question_number)
                  }
                  disabled={game.status === "finished"}
                >
                  Release This Question
                </button>
              )}
            </section>
          ))}
        </>
      )}

      <hr />

      <button onClick={() => router.push("/host/questions")}>
        Manage Questions
      </button>

      <button onClick={signOut} style={{ marginLeft: 10 }}>
        Sign Out
      </button>
    </main>
  );
}
