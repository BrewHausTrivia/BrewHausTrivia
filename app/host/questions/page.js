
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function ManageQuestions() {
  const router = useRouter();

  const [game, setGame] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [variants, setVariants] = useState("");
  const [message, setMessage] = useState("Loading...");
  const [saving, setSaving] = useState(false);

  async function loadQuestions() {
    const { data: gameData, error: gameError } =
      await supabase.rpc("host_get_latest_game");

    if (gameError || !gameData) {
      setMessage(gameError?.message || "No game found.");
      return;
    }

    setGame(gameData);

    const { data, error } = await supabase.rpc(
      "host_get_questions",
      { p_game_id: gameData.id }
    );

    if (error) {
      setMessage(error.message);
      return;
    }

    setQuestions(data || []);
    setMessage("");
  }

  useEffect(() => {
    async function checkHost() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/host");
        return;
      }

      await loadQuestions();
    }

    checkHost();
  }, []);

  async function addQuestion(event) {
    event.preventDefault();

    if (!game || questions.length >= 50) return;

    setSaving(true);
    setMessage("");

    const number = questions.length + 1;
    const round = Math.ceil(number / 10);

    const acceptedVariants = variants
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const { error } = await supabase.rpc("host_add_question", {
      p_game_id: game.id,
      p_question_number: number,
      p_round_number: round,
      p_prompt: prompt,
      p_correct_answer: answer,
      p_accepted_variants: acceptedVariants
    });

    if (error) {
      setMessage(error.message);
    } else {
      setPrompt("");
      setAnswer("");
      setVariants("");
      setMessage("Question saved successfully!");
      await loadQuestions();
    }

    setSaving(false);
  }

  return (
    <main style={{
      maxWidth: 800,
      margin: "40px auto",
      padding: 24,
      fontFamily: "Arial, sans-serif"
    }}>
      <h1>Manage Questions</h1>

      <button onClick={() => router.push("/host/dashboard")}>
        Back to Dashboard
      </button>

      <p>Game code: {game?.game_code}</p>
      <p>Questions added: {questions.length} / 50</p>

      <hr />

      <h2>Add a Question</h2>

      {questions.length < 50 ? (
        <form onSubmit={addQuestion}>
          <p>Question {questions.length + 1}</p>
          <p>Round {Math.ceil((questions.length + 1) / 10)}</p>

          <label>Question</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
            rows={3}
            style={{ display: "block", width: "100%", marginBottom: 16 }}
          />

          <label>Correct Answer</label>
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            required
            style={{ display: "block", width: "100%", marginBottom: 16 }}
          />

          <label>Accepted Answer Variations (comma separated)</label>
          <input
            value={variants}
            onChange={(e) => setVariants(e.target.value)}
            placeholder="Example: NYC, New York City"
            style={{ display: "block", width: "100%", marginBottom: 16 }}
          />

          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Question"}
          </button>
        </form>
      ) : (
        <p>All 50 questions have been added!</p>
      )}

      {message && <p>{message}</p>}

      <hr />

      <h2>Saved Questions</h2>

      {questions.map((question) => (
        <section key={question.question_number}>
          <h3>
            Round {question.round_number} — Question {question.question_number}
          </h3>
          <p>{question.prompt}</p>
          <p>{question.is_released ? "Released" : "Not released"}</p>
          <hr />
        </section>
      ))}
    </main>
  );
}
