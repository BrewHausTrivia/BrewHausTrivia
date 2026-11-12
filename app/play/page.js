
"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

function PlayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const playerId = searchParams.get("player");

  const [player, setPlayer] = useState(null);
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("Loading game...");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("checking");

  const currentQuestionId = useRef(null);

  const colors = {
    background: "#17191B",
    panel: "#242729",
    border: "#3A3D3F",
    gold: "#B79A62",
    cream: "#F1EBDD",
    muted: "#A7A7A2",
    green: "#6F9B78"
  };

  useEffect(() => {
    if (!playerId) {
      setMessage("Please join a game first.");
      return;
    }

    let channel;
    let pollTimer;
    let stopped = false;
    let refreshInProgress = false;
    let sessionToken = null;

    function updateGame(data) {
      if (data.game_status === "finished") {
        router.replace(`/leaderboard?player=${playerId}`);
        return;
      }

      const incomingQuestion = data.question || null;

      const isNewQuestion =
        currentQuestionId.current !== (incomingQuestion?.id || null);

      setPlayer(data.player);
      setQuestion(incomingQuestion);

      if (isNewQuestion) {
        currentQuestionId.current = incomingQuestion?.id || null;
        setSubmitted(Boolean(incomingQuestion?.has_submitted));
        setAnswer(incomingQuestion?.submitted_answer || "");
        setSubmitting(false);
      } else if (incomingQuestion?.has_submitted) {
        setSubmitted(true);
        setAnswer(incomingQuestion.submitted_answer || "");
        setSubmitting(false);
      }

      const alreadySubmitted = Boolean(incomingQuestion?.has_submitted);

      if (alreadySubmitted) {
        setMessage("Answer submitted!");
      } else {
        setMessage(
          incomingQuestion
            ? ""
            : "Waiting for the host to release the next question..."
        );
      }
    }

    async function refreshGame(token) {
      if (stopped || refreshInProgress) return;

      refreshInProgress = true;

      try {
        const { data, error } = await supabase.rpc(
          "get_player_game",
          {
            p_player_id: playerId,
            p_session_token: token
          }
        );

        if (stopped) return;

        if (error || !data) {
          setConnectionStatus(
            navigator.onLine ? "reconnecting" : "offline"
          );
          return;
        }

        setConnectionStatus("connected");
        updateGame(data);

        if (!channel) {
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
      } catch (error) {
        if (!stopped) {
          setConnectionStatus(
            navigator.onLine ? "reconnecting" : "offline"
          );
        }
      } finally {
        refreshInProgress = false;
      }
    }

    async function loadGame() {
      sessionToken = sessionStorage.getItem("trivia_session_token");

      if (!sessionToken) {
        setMessage("Your player session was not found. Please join again.");
        return;
      }

      setConnectionStatus(
        navigator.onLine ? "checking" : "offline"
      );

      pollTimer = setInterval(() => {
        refreshGame(sessionToken);
      }, 2000);

      await refreshGame(sessionToken);
    }

    function handleOnline() {
      setConnectionStatus("reconnecting");

      if (sessionToken) {
        refreshGame(sessionToken);
      }
    }

    function handleOffline() {
      setConnectionStatus("offline");
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    loadGame();

    return () => {
      stopped = true;

      clearInterval(pollTimer);

      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);

      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [playerId, router]);

  async function submitAnswer(event) {
    event.preventDefault();

    if (
      !question ||
      !player ||
      submitted ||
      submitting ||
      !answer.trim()
    ) {
      return;
    }

    const token = sessionStorage.getItem("trivia_session_token");

    if (!token) {
      setMessage("Your session expired. Please join again.");
      return;
    }

    const submittedAnswer = answer.trim();

    setSubmitting(true);
    setMessage("Submitting answer...");

    try {
      const { data, error } = await supabase.rpc(
        "submit_trivia_answer",
        {
          p_player_id: player.id,
          p_question_id: question.id,
          p_answer: submittedAnswer,
          p_session_token: token
        }
      );

      if (error) {
        setMessage(
          "We couldn't confirm your answer. Check your connection and try again."
        );

        setConnectionStatus(
          navigator.onLine ? "reconnecting" : "offline"
        );

        setSubmitting(false);
        return;
      }

      if (!data) {
        setMessage(
          "We couldn't confirm your answer. Please try again."
        );

        setSubmitting(false);
        return;
      }

      setSubmitted(true);

      setQuestion((current) => ({
        ...current,
        has_submitted: true,
        submitted_answer: submittedAnswer
      }));

      // Every player receives the same confirmation.
      // Correctness is not shown until the host reveals the answer.
      setMessage("Answer submitted!");

    } catch (error) {
      setMessage(
        "Something went wrong while submitting. Your answer is still here. Please try again."
      );

      setConnectionStatus(
        navigator.onLine ? "reconnecting" : "offline"
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Hide the score while a submitted answer is awaiting the host's reveal.
  const hideScore =
    Boolean(question?.has_submitted) &&
    !question?.answer_revealed;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: colors.background,
        color: colors.cream,
        padding: "28px 18px",
        boxSizing: "border-box",
        fontFamily: "Arial, Helvetica, sans-serif"
      }}
    >
      <div
        style={{
          maxWidth: 650,
          margin: "0 auto"
        }}
      >
        <header
          style={{
            textAlign: "center",
            padding: "12px 0 26px",
            borderBottom: `1px solid ${colors.border}`,
            marginBottom: 28
          }}
        >
          <h1
            style={{
              fontSize: 30,
              letterSpacing: 2,
              fontWeight: 700,
              margin: 0,
              color: colors.cream
            }}
          >
            BREWHAUS<span style={{ color: colors.gold }}>TRIVIA</span>
          </h1>

          <p
            style={{
              color: colors.muted,
              fontSize: 13,
              letterSpacing: 2,
              marginTop: 9
            }}
          >
            PUB TRIVIA
          </p>
        </header>

        {connectionStatus !== "connected" && (
          <div
            style={{
              background: "#303633",
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              padding: "12px 15px",
              marginBottom: 18,
              textAlign: "center",
              color: colors.gold,
              fontSize: 14
            }}
          >
            {connectionStatus === "offline"
              ? "No internet connection. We'll reconnect automatically."
              : connectionStatus === "reconnecting"
                ? "Connection interrupted. Reconnecting..."
                : "Connecting to your game..."}
          </div>
        )}

        {player && (
          <>
            <section
              style={{
                background: colors.panel,
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                padding: "17px 20px",
                marginBottom: 22,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12
              }}
            >
              <div>
                <p
                  style={{
                    color: colors.muted,
                    fontSize: 13,
                    margin: "0 0 5px"
                  }}
                >
                  PLAYER
                </p>

                <h2
                  style={{
                    fontSize: 19,
                    margin: 0,
                    fontWeight: 600
                  }}
                >
                  {player.nickname}
                </h2>
              </div>

              <div style={{ textAlign: "right" }}>
                <p
                  style={{
                    color: colors.muted,
                    fontSize: 13,
                    margin: "0 0 5px"
                  }}
                >
                  YOUR SCORE
                </p>

                <h2
                  style={{
                    color: colors.gold,
                    fontSize: 25,
                    margin: 0
                  }}
                >
                  {hideScore ? "—" : player.total_score}
                </h2>
              </div>
            </section>

            {question ? (
              <section
                style={{
                  background: colors.panel,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 10,
                  padding: "26px 22px",
                  textAlign: "center"
                }}
              >
                <p
                  style={{
                    color: colors.gold,
                    fontSize: 14,
                    fontWeight: 600,
                    letterSpacing: 1,
                    margin: "0 0 22px"
                  }}
                >
                  ROUND {question.round_number}
                  {"  ·  "}
                  QUESTION {question.question_number}
                </p>

                <h2
                  style={{
                    fontSize: 25,
                    lineHeight: 1.45,
                    fontWeight: 600,
                    margin: "0 0 28px",
                    color: colors.cream
                  }}
                >
                  {question.prompt}
                </h2>

                <form onSubmit={submitAnswer}>
                  <input
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    placeholder="Type your answer here"
                    disabled={submitted || submitting}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "16px",
                      background: "#191C1E",
                      border: `1px solid ${colors.border}`,
                      borderRadius: 6,
                      color: colors.cream,
                      fontSize: 18,
                      outline: "none",
                      marginBottom: 14
                    }}
                  />

                  <button
                    type="submit"
                    disabled={submitted || submitting || !answer.trim()}
                    style={{
                      width: "100%",
                      padding: "16px",
                      background:
                        submitted || submitting || !answer.trim()
                          ? "#55534D"
                          : colors.gold,
                      color:
                        submitted || submitting || !answer.trim()
                          ? "#D0CCC3"
                          : "#191919",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 17,
                      fontWeight: 700,
                      cursor:
                        submitted || submitting || !answer.trim()
                          ? "not-allowed"
                          : "pointer"
                    }}
                  >
                    {submitted
                      ? "ANSWER SUBMITTED"
                      : submitting
                        ? "SUBMITTING..."
                        : "SUBMIT ANSWER"}
                  </button>
                </form>

                {submitted && (
                  <div
                    style={{
                      marginTop: 20,
                      padding: 15,
                      background: "#303633",
                      border: `1px solid ${colors.border}`,
                      borderRadius: 6
                    }}
                  >
                    <p
                      style={{
                        color: colors.green,
                        fontWeight: 600,
                        margin: 0
                      }}
                    >
                      Answer submitted!
                    </p>
                  </div>
                )}

                {!submitted && message && (
                  <p
                    style={{
                      color: colors.muted,
                      fontSize: 14,
                      marginTop: 15
                    }}
                  >
                    {message}
                  </p>
                )}

                {question.answer_revealed === true &&
                  question.correct_answer && (
                    <div
                      style={{
                        marginTop: 22,
                        padding: 18,
                        background: "#303633",
                        border: `1px solid ${colors.border}`,
                        borderRadius: 6
                      }}
                    >
                      <p
                        style={{
                          color: colors.gold,
                          fontSize: 13,
                          fontWeight: 700,
                          letterSpacing: 1,
                          margin: "0 0 8px"
                        }}
                      >
                        CORRECT ANSWER
                      </p>

                      <p
                        style={{
                          fontSize: 20,
                          fontWeight: 600,
                          margin: 0
                        }}
                      >
                        {question.correct_answer}
                      </p>
                    </div>
                  )}
              </section>
            ) : (
              <section
                style={{
                  background: colors.panel,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 10,
                  padding: "45px 22px",
                  textAlign: "center"
                }}
              >
                <h2
                  style={{
                    color: colors.gold,
                    fontSize: 22,
                    marginTop: 0
                  }}
                >
                  You're in the game
                </h2>

                <p
                  style={{
                    color: colors.muted,
                    fontSize: 16,
                    lineHeight: 1.6,
                    marginBottom: 0
                  }}
                >
                  {message}
                </p>
              </section>
            )}
          </>
        )}

        {!player && (
          <section
            style={{
              background: colors.panel,
              border: `1px solid ${colors.border}`,
              borderRadius: 10,
              padding: 30,
              textAlign: "center"
            }}
          >
            <p style={{ color: colors.muted }}>{message}</p>
          </section>
        )}

        <footer
          style={{
            textAlign: "center",
            padding: "28px 0 10px",
            color: "#777A7B",
            fontSize: 12,
            letterSpacing: 1
          }}
        >
          BREWHAUSTRIVIA
        </footer>
      </div>
    </main>
  );
}

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: "100vh",
            background: "#17191B",
            color: "#F1EBDD",
            display: "grid",
            placeItems: "center",
            fontFamily: "Arial, sans-serif"
          }}
        >
          Loading game...
        </main>
      }
    >
      <PlayContent />
    </Suspense>
  );
}
