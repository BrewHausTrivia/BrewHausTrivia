
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

function PlayContent() {
  const searchParams = useSearchParams();
  const playerId = searchParams.get("player");

  const [player, setPlayer] = useState(null);
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("Loading game...");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!playerId) {
      setMessage("Please join a game first.");
      return;
    }

    let channel;
    let stopped = false;

    async function loadGame() {
      const token = sessionStorage.getItem("trivia_session_token");

      if (!token) {
        setMessage("Your player session was not found. Please join again.");
        return;
      }

      const { data, error } = await supabase.rpc(
        "get_player_game",
        {
          p_player_id: playerId,
          p_session_token: token
        }
      );

      if (error || !data) {
        setMessage("Could not load your game. Please join again.");
        return;
      }

      if (stopped) return;

      setPlayer(data.player);
      setQuestion(data.question || null);
      setMessage(
        data.question
          ? ""
          : data.game_status === "finished"
            ? "This game has ended. Thanks for playing!"
            : "Waiting for the host to release the next question..."
      );

      channel = supabase
        .channel(`game-${data.game_id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "games",
            filter: `id=eq.${data.game_id}`
          },
          () => refreshGame(token)
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "questions",
            filter: `game_id=eq.${data.game_id}`
          },
          () => refreshGame(token)
        )
        .subscribe();
    }

    async function refreshGame(token) {
      const { data, error } = await supabase.rpc(
        "get_player_game",
        {
          p_player_id: playerId,
          p_session_token: token
        }
      );

      if (error || !data || stopped) return;

      setPlayer(data.player);
      setQuestion(data.question || null);
      setSubmitted(false);
      setAnswer("");

      setMessage(
        data.question
          ? ""
          : data.game_status === "finished"
            ? "This game has ended. Thanks for playing!"
            : "Waiting for the host to release the next question..."
      );
    }

    loadGame();

    return () => {
      stopped = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [playerId]);

  async function submitAnswer(event) {
    event.preventDefault();

    if (!question || !player || submitted || !answer.trim()) return;

    const token = sessionStorage.getItem("trivia_session_token");

    if (!token) {
      setMessage("Your session expired. Please join again.");
      return;
    }

    setMessage("Submitting answer...");

    const { data, error } = await supabase.rpc(
      "submit_trivia_answer",
      {
        p_player_id: player.id,
        p_question_id: question.id,
        p_answer: answer.trim(),
        p_session_token: token
      }
    );

    if (error) {
      setMessage(error.message);
      return;
    }

    setSubmitted(true);
    setMessage(
      data.points_awarded === 1
        ? "Correct! You earned 1 point."
        : "Answer submitted! Keep going."
    );

    setPlayer((current) => ({
      ...current,
      total_score: current.total_score + data.points_awarded
    }));
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

      {player ? (
        <>
          <h2>Welcome, {player.nickname}!</h2>
          <h3>Your score: {player.total_score}</h3>

          {question ? (
            <section>
              <p>
                Round {question.round_number} · Question {question.question_number}
              </p>

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

                <button
                  type="submit"
                  disabled={submitted || !answer.trim()}
                >
                  {submitted ? "Answer Submitted" : "Submit Answer"}
                </button>
              </form>
            </section>
          ) : null}
        </>
      ) : null}

      {message && <p>{message}</p>}
    </main>
  );
}
export default function PlayPage() {
  return (
    <Suspense fallback={<main>Loading game...</main>}>
      <PlayContent />
    </Suspense>
  );
}
