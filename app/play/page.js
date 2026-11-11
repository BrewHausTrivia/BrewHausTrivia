
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function PlayPage() {
  const searchParams = useSearchParams();
  const playerId = searchParams.get("player");

  const [player, setPlayer] = useState(null);
  const [game, setGame] = useState(null);
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("Loading game...");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!playerId) {
      setMessage("No player found. Please join a game first.");
      return;
    }

    let channel;

    async function loadGame() {
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select("id, nickname, total_score, game_id")
        .eq("id", playerId)
        .single();

      if (playerError || !playerData) {
        setMessage("Could not find your player. Please join again.");
        return;
      }

      setPlayer(playerData);

      const { data: gameData, error: gameError } = await supabase
        .from("games")
        .select("id, status, current_question")
        .eq("id", playerData.game_id)
        .single();

      if (gameError || !gameData) {
        setMessage("Could not load the game.");
        return;
      }

      setGame(gameData);
      await loadQuestion(gameData);

      channel = supabase
        .channel(`player-${playerId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "games", filter: `id=eq.${playerData.game_id}` },
          async () => {
            const { data: updatedGame } = await supabase
              .from("games")
              .select("id, status, current_question")
              .eq("id", playerData.game_id)
              .single();

            if (updatedGame) {
              setGame(updatedGame);
              await loadQuestion(updatedGame);
            }
          }
        )
        .subscribe();
    }

    async function loadQuestion(gameData) {
      if (gameData.status === "finished") {
        setQuestion(null);
        setMessage("This trivia game has ended. Thanks for playing!");
        return;
      }

      const { data } = await supabase
        .from("questions")
        .select("id, question_number, round_number, prompt, is_released")
        .eq("game_id", gameData.id)
        .eq("question_number", gameData.current_question)
        .eq("is_released", true)
        .maybeSingle();

      setQuestion(data || null);
      setSubmitted(false);
      setAnswer("");
      setMessage(data ? "" : "Waiting for the host to release the next question...");
    }

    loadGame();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [playerId]);

  async function submitAnswer(event) {
    event.preventDefault();

    if (!question || !player || submitted || !answer.trim()) return;

    setMessage("Submitting answer...");

    const { error } = await supabase.rpc("submit_trivia_answer", {
      p_player_id: player.id,
      p_question_id: question.id,
      p_answer: answer.trim()
    });

    if (error) {
      setMessage(error.message);
    } else {
      setSubmitted(true);
      setMessage("Answer submitted! Waiting for the host...");
    }
  }

  if (!player) {
    return <main style={{ padding: 30 }}>{message}</main>;
  }

  return (
    <main style={{
      maxWidth: 650,
      margin: "40px auto",
      padding: 24,
      fontFamily: "Arial, sans-serif",
      textAlign: "center"
    }}>
      <h1>BrewHausTrivia</h1>
      <h2>Welcome, {player.nickname}!</h2>
      <p>Your score: {player.total_score}</p>

      {question ? (
        <section>
          <p>Round {question.round_number} · Question {question.question_number}</p>
          <h2>{question.prompt}</h2>

          <form onSubmit={submitAnswer}>
            <input
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Type your answer"
              disabled={submitted}
              style={{
                width: "100%",
                padding: 14,
                boxSizing: "border-box",
                marginBottom: 12
              }}
            />

            <button type="submit" disabled={submitted || !answer.trim()}>
              {submitted ? "Answer Submitted" : "Submit Answer"}
            </button>
          </form>
        </section>
      ) : (
        <p>{message}</p>
      )}

      {message && question && <p>{message}</p>}
    </main>
  );
}
