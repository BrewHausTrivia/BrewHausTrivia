
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function Dashboard() {
  const router = useRouter();

  const [role, setRole] = useState("");
  const [game, setGame] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [savedQuestions, setSavedQuestions] = useState([]);
  const [savedQuestionError, setSavedQuestionError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [creatingGame, setCreatingGame] = useState(false);
  const [actionInProgress, setActionInProgress] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("checking");

  const loadingDashboard = useRef(false);
  const mounted = useRef(false);

  const colors = {
    background: "#17191B",
    panel: "#242729",
    border: "#3A3D3F",
    gold: "#B79A62",
    cream: "#F1EBDD",
    muted: "#A7A7A2",
    green: "#75977A",
    red: "#B97870"
  };

  async function loadDashboard() {
    if (loadingDashboard.current) return;

    loadingDashboard.current = true;

    try {
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();

      if (!mounted.current) return;

      if (authError) {
        setConnectionStatus("reconnecting");
        setMessage("Unable to verify your host session. Reconnecting...");
        setLoading(false);
        return;
      }

      if (!user) {
        router.replace("/host");
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from("host_roles")
        .select("role, approved")
        .eq("user_id", user.id)
        .single();

      if (!mounted.current) return;

      if (roleError) {
        if (roleError.code === "PGRST116") {
          await supabase.auth.signOut();
          router.replace("/host");
          return;
        }

        setConnectionStatus("reconnecting");
        setMessage("Unable to verify host permissions. Retrying...");
        setLoading(false);
        return;
      }

      if (!roleData?.approved) {
        await supabase.auth.signOut();
        router.replace("/host");
        return;
      }

      setRole(roleData.role);

      // Load the current game.
      const { data: gameData, error: gameError } = await supabase.rpc(
        "host_get_latest_game"
      );

      if (!mounted.current) return;

      if (gameError) {
        setConnectionStatus("reconnecting");
        setMessage("Unable to load the game. Retrying automatically...");
        setLoading(false);
        return;
      }

      let questionData = [];

      // Load questions already added to the current game.
      if (gameData) {
        const { data, error: questionError } = await supabase.rpc(
          "host_get_questions",
          {
            p_game_id: gameData.id
          }
        );

        if (!mounted.current) return;

        if (questionError) {
          setConnectionStatus("reconnecting");
          setMessage("Unable to load game questions. Retrying automatically...");
          setLoading(false);
          return;
        }

        questionData = data || [];
      }

      // NEW: Load reusable questions from the Question Bank.
      const { data: bankData, error: bankError } = await supabase
        .from("question_bank")
        .select("id, round_number, prompt, correct_answer, accepted_variants")
        .order("round_number")
        .order("created_at");

      if (!mounted.current) return;

      if (bankError) {
        setSavedQuestionError(bankError.message);
        setSavedQuestions([]);
      } else {
        setSavedQuestionError("");
        setSavedQuestions(bankData || []);
      }

      setGame(gameData);
      setQuestions(questionData);
      setConnectionStatus("connected");

      if (
        message.startsWith("Unable to") ||
        message.startsWith("Connection interrupted")
      ) {
        setMessage("");
      }

      setLoading(false);
    } catch (error) {
      if (mounted.current) {
        setConnectionStatus(
          navigator.onLine ? "reconnecting" : "offline"
        );

        setMessage(
          "Something went wrong while loading the dashboard. Retrying..."
        );

        setLoading(false);
      }
    } finally {
      loadingDashboard.current = false;
    }
  }

  useEffect(() => {
    mounted.current = true;

    function handleOnline() {
      setConnectionStatus("reconnecting");
      setMessage("Internet connection restored. Refreshing dashboard...");
      loadDashboard();
    }

    function handleOffline() {
      setConnectionStatus("offline");
      setMessage("Internet connection lost. Waiting to reconnect...");
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    loadDashboard();

    const pollTimer = setInterval(() => {
      if (navigator.onLine) {
        loadDashboard();
      } else {
        setConnectionStatus("offline");
      }
    }, 5000);

    return () => {
      mounted.current = false;
      clearInterval(pollTimer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  async function createGame() {
    if (creatingGame || actionInProgress) return;

    setCreatingGame(true);
    setMessage("");

    try {
      const { error } = await supabase.rpc("create_trivia_game");

      if (error) {
        setMessage(
          "Could not confirm game creation: " + error.message +
          ". Check the dashboard before trying again."
        );

        await loadDashboard();
        return;
      }

      setMessage("New game created!");
      await loadDashboard();
    } catch (error) {
      setMessage(
        "Something went wrong while creating the game. Refresh the dashboard to check its status before trying again."
      );

      await loadDashboard();
    } finally {
      setCreatingGame(false);
    }
  }

  async function controlGame(action, questionNumber = null) {
    if (!game || actionInProgress || creatingGame) return;

    setActionInProgress(action);
    setMessage("");

    try {
      const { error } = await supabase.rpc("host_control_game", {
        p_game_id: game.id,
        p_action: action,
        p_question_number: questionNumber
      });

      if (error) {
        setMessage(
          "Could not confirm that action: " + error.message +
          ". Refreshing game information..."
        );

        await loadDashboard();
        return;
      }

      if (action === "release_question") {
        setMessage(`Question ${questionNumber} released!`);
      } else if (action === "reveal_answer") {
        setMessage("Correct answer revealed to players!");
      } else if (action === "finish_game") {
        setMessage("Game ended!");
      } else {
        setMessage("Game updated!");
      }

      await loadDashboard();
    } catch (error) {
      setMessage(
        "Something went wrong while controlling the game. Refreshing game information..."
      );

      await loadDashboard();
    } finally {
      setActionInProgress("");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/host");
  }

  const buttonStyle = {
    padding: "12px 17px",
    background: colors.gold,
    color: "#191919",
    border: "none",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    margin: "5px 5px 5px 0"
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    background: "#383C3E",
    color: colors.cream,
    border: `1px solid ${colors.border}`
  };

  const panelStyle = {
    background: colors.panel,
    border: `1px solid ${colors.border}`,
    borderRadius: 9,
    padding: 22,
    marginBottom: 20
  };

  const busy = Boolean(actionInProgress) || creatingGame;

  const savedRoundOne = savedQuestions.filter(
    (question) => question.round_number === 1
  );

  const savedRoundTwo = savedQuestions.filter(
    (question) => question.round_number === 2
  );

  const savedRoundThree = savedQuestions.filter(
    (question) => question.round_number === 3
  );

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <h1 style={styles.title}>
            BREWHAUS<span style={styles.gold}>TRIVIA</span>
          </h1>

          <p style={styles.muted}>Loading dashboard...</p>

          {connectionStatus !== "connected" && (
            <p style={{ color: colors.gold }}>
              {connectionStatus === "offline"
                ? "No internet connection. Waiting to reconnect..."
                : "Connecting to your game..."}
            </p>
          )}
        </div>
      </main>
    );
  }

  const currentQuestion = questions.find(
    (question) =>
      question.question_number === game?.current_question &&
      question.is_released
  );

  function renderSavedRound(title, items) {
    return (
      <div style={styles.savedRound}>
        <div style={styles.savedRoundHeader}>
          <h3 style={styles.savedRoundTitle}>{title}</h3>
          <span style={styles.questionCount}>
            {items.length} SAVED
          </span>
        </div>

        {items.length === 0 ? (
          <p style={styles.muted}>No saved questions in this round.</p>
        ) : (
          items.map((question) => (
            <div key={question.id} style={styles.savedQuestion}>
              <p style={styles.prompt}>{question.prompt}</p>

              <p style={styles.savedAnswer}>
                Answer: {question.correct_answer}
              </p>

              {question.accepted_variants?.length > 0 && (
                <p style={styles.savedAnswer}>
                  Accepted variations: {question.accepted_variants.join(", ")}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>
              BREWHAUS<span style={styles.gold}>TRIVIA</span>
            </h1>

            <p style={styles.subtitle}>HOST DASHBOARD</p>
          </div>

          <div style={styles.role}>
            HOST ROLE: {role.toUpperCase()}
          </div>
        </header>

        {connectionStatus !== "connected" && (
          <div style={styles.connectionWarning}>
            {connectionStatus === "offline"
              ? "No internet connection. The dashboard will reconnect automatically."
              : "Connection interrupted. Trying to reconnect..."}
          </div>
        )}

        {message && (
          <div style={styles.message}>{message}</div>
        )}

        {!game ? (
          <section style={panelStyle}>
            <h2 style={styles.sectionTitle}>No Game Found</h2>

            <p style={styles.muted}>
              Create a new game to get started.
            </p>

            <button
              style={{
                ...buttonStyle,
                opacity: busy ? 0.5 : 1
              }}
              onClick={createGame}
              disabled={busy}
            >
              {creatingGame ? "CREATING..." : "START NEW GAME"}
            </button>
          </section>
        ) : (
          <>
            <section style={panelStyle}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Current Game</h2>

                <span
                  style={{
                    ...styles.status,
                    color:
                      game.status === "finished"
                        ? colors.red
                        : game.status === "active"
                          ? colors.green
                          : colors.gold
                  }}
                >
                  {game.status.toUpperCase()}
                </span>
              </div>

              <p style={styles.muted}>GAME CODE</p>

              <h1 style={styles.gameCode}>{game.game_code}</h1>

              <div style={styles.details}>
                <div>
                  <span style={styles.detailLabel}>STATUS</span>
                  <strong>{game.status}</strong>
                </div>

                <div>
                  <span style={styles.detailLabel}>REGISTRATION</span>
                  <strong>
                    {game.registration_open ? "OPEN" : "CLOSED"}
                  </strong>
                </div>

                <div>
                  <span style={styles.detailLabel}>CURRENT QUESTION</span>
                  <strong>{game.current_question}</strong>
                </div>
              </div>

              {game.status !== "finished" && (
                <div style={styles.controls}>
                  <button
                    style={{
                      ...buttonStyle,
                      opacity: busy ? 0.5 : 1
                    }}
                    onClick={() => controlGame("open_registration")}
                    disabled={busy}
                  >
                    OPEN REGISTRATION
                  </button>

                  <button
                    style={{
                      ...secondaryButtonStyle,
                      opacity: busy ? 0.5 : 1
                    }}
                    onClick={() => controlGame("close_registration")}
                    disabled={busy}
                  >
                    CLOSE REGISTRATION
                  </button>

                  <button
                    style={{
                      ...buttonStyle,
                      background: "#704B47",
                      color: "#F1EBDD",
                      opacity: busy ? 0.5 : 1
                    }}
                    onClick={() => controlGame("finish_game")}
                    disabled={busy}
                  >
                    END GAME
                  </button>
                </div>
              )}

              {game.status === "finished" && (
                <div style={styles.finished}>
                  <h3 style={{ color: colors.green, marginTop: 0 }}>
                    GAME FINISHED
                  </h3>

                  <p style={styles.muted}>
                    You can now create a fresh game.
                  </p>

                  <button
                    style={{
                      ...buttonStyle,
                      opacity: busy ? 0.5 : 1
                    }}
                    onClick={createGame}
                    disabled={busy}
                  >
                    {creatingGame ? "CREATING..." : "START NEW GAME"}
                  </button>
                </div>
              )}
            </section>

            {currentQuestion && game.status === "active" && (
              <section style={panelStyle}>
                <h2 style={styles.sectionTitle}>
                  Current Question Controls
                </h2>

                <p style={styles.muted}>
                  Question {currentQuestion.question_number} is currently live.
                </p>

                {game.answer_revealed ? (
                  <p style={{ color: colors.green, fontWeight: 600 }}>
                    The answer has been revealed to players.
                  </p>
                ) : (
                  <button
                    style={{
                      ...buttonStyle,
                      opacity: busy ? 0.5 : 1
                    }}
                    onClick={() => controlGame("reveal_answer")}
                    disabled={busy}
                  >
                    REVEAL ANSWER
                  </button>
                )}
              </section>
            )}

            <section>
              <div style={styles.questionsHeader}>
                <h2 style={styles.sectionTitle}>Current Game Questions</h2>

                <span style={styles.questionCount}>
                  {questions.length} QUESTIONS
                </span>
              </div>

              {questions.length === 0 && (
                <div style={panelStyle}>
                  <p style={styles.muted}>
                    No questions have been added to this game yet.
                  </p>
                </div>
              )}

              {questions.map((question) => (
                <div
                  key={question.question_number}
                  style={styles.questionCard}
                >
                  <div style={styles.questionTop}>
                    <h3 style={styles.questionNumber}>
                      ROUND {question.round_number} · QUESTION {question.question_number}
                    </h3>

                    {question.is_released && (
                      <span style={styles.released}>RELEASED</span>
                    )}
                  </div>

                  <p style={styles.prompt}>{question.prompt}</p>

                  {question.is_released ? (
                    <p style={{ color: colors.green, fontSize: 13 }}>
                      This question has been released.
                    </p>
                  ) : (
                    <button
                      style={{
                        ...secondaryButtonStyle,
                        opacity: busy || game.status === "finished" ? 0.5 : 1
                      }}
                      onClick={() =>
                        controlGame("release_question", question.question_number)
                      }
                      disabled={busy || game.status === "finished"}
                    >
                      RELEASE THIS QUESTION
                    </button>
                  )}
                </div>
              ))}
            </section>
          </>
        )}

        {/* NEW: Saved Question Bank */}
        <section style={{ marginTop: 35 }}>
          <div style={styles.questionsHeader}>
            <h2 style={styles.sectionTitle}>Saved Question Bank</h2>

            <span style={styles.questionCount}>
              {savedQuestions.length} SAVED QUESTIONS
            </span>
          </div>

          {savedQuestionError ? (
            <div style={panelStyle}>
              <p style={{ color: colors.red }}>
                Unable to load saved questions: {savedQuestionError}
              </p>
            </div>
          ) : savedQuestions.length === 0 ? (
            <div style={panelStyle}>
              <p style={styles.muted}>
                No saved questions found in your Question Bank.
              </p>
            </div>
          ) : (
            <div style={panelStyle}>
              <p style={styles.muted}>
                These are your reusable questions saved in the Question Bank.
                They are separate from the questions loaded into your current game.
              </p>

              {renderSavedRound("ROUND 1", savedRoundOne)}
              {renderSavedRound("ROUND 2", savedRoundTwo)}
              {renderSavedRound("ROUND 3", savedRoundThree)}
            </div>
          )}
        </section>

        <footer style={styles.footer}>
          <button
            style={secondaryButtonStyle}
            onClick={() => router.push("/host/questions")}
          >
            MANAGE QUESTIONS
          </button>

          <button
            style={secondaryButtonStyle}
            onClick={() => router.push("/host/winners")}
          >
            VIEW WINNERS
          </button>

          <button
            style={{
              ...secondaryButtonStyle,
              color: "#D69B93"
            }}
            onClick={signOut}
          >
            SIGN OUT
          </button>
        </footer>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#17191B",
    color: "#F1EBDD",
    padding: "30px 18px",
    boxSizing: "border-box",
    fontFamily: "Arial, Helvetica, sans-serif"
  },
  container: {
    maxWidth: 900,
    margin: "0 auto"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 15,
    paddingBottom: 22,
    borderBottom: "1px solid #3A3D3F",
    marginBottom: 25
  },
  title: {
    fontSize: "clamp(27px, 4vw, 38px)",
    letterSpacing: 1.5,
    margin: 0
  },
  gold: {
    color: "#B79A62"
  },
  subtitle: {
    color: "#A7A7A2",
    fontSize: 12,
    letterSpacing: 3,
    margin: "8px 0 0"
  },
  role: {
    color: "#B79A62",
    border: "1px solid #665638",
    borderRadius: 5,
    padding: "9px 12px",
    fontSize: 11,
    letterSpacing: 1
  },
  muted: {
    color: "#A7A7A2",
    lineHeight: 1.6
  },
  message: {
    background: "#302C23",
    border: "1px solid #665638",
    color: "#DCC99F",
    padding: 14,
    borderRadius: 6,
    marginBottom: 20
  },
  connectionWarning: {
    background: "#302C23",
    border: "1px solid #665638",
    color: "#DCC99F",
    padding: 14,
    borderRadius: 6,
    marginBottom: 20
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  sectionTitle: {
    fontSize: 21,
    marginTop: 0,
    marginBottom: 18
  },
  status: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1
  },
  gameCode: {
    fontSize: "clamp(36px, 6vw, 50px)",
    color: "#B79A62",
    letterSpacing: 7,
    margin: "5px 0 24px"
  },
  details: {
    display: "flex",
    flexWrap: "wrap",
    gap: 30,
    padding: "18px 0",
    borderTop: "1px solid #3A3D3F",
    borderBottom: "1px solid #3A3D3F"
  },
  detailLabel: {
    display: "block",
    color: "#A7A7A2",
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 7
  },
  controls: {
    marginTop: 18,
    display: "flex",
    flexWrap: "wrap",
    gap: 5
  },
  finished: {
    marginTop: 20,
    padding: 18,
    background: "#202A23",
    border: "1px solid #46634B",
    borderRadius: 7
  },
  questionsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 30
  },
  questionCount: {
    color: "#B79A62",
    fontSize: 12,
    letterSpacing: 1
  },
  questionCard: {
    background: "#242729",
    border: "1px solid #3A3D3F",
    borderRadius: 8,
    padding: 18,
    marginBottom: 12
  },
  questionTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10
  },
  questionNumber: {
    color: "#B79A62",
    fontSize: 13,
    letterSpacing: 1,
    margin: 0
  },
  released: {
    color: "#75977A",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1
  },
  prompt: {
    fontSize: 17,
    lineHeight: 1.5,
    margin: "15px 0"
  },
  savedRound: {
    marginTop: 24,
    paddingTop: 15,
    borderTop: "1px solid #3A3D3F"
  },
  savedRoundHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10
  },
  savedRoundTitle: {
    color: "#B79A62",
    fontSize: 15,
    letterSpacing: 1
  },
  savedQuestion: {
    padding: "12px 15px",
    marginBottom: 10,
    background: "#1D2022",
    border: "1px solid #3A3D3F",
    borderRadius: 6
  },
  savedAnswer: {
    color: "#A7A7A2",
    fontSize: 13,
    lineHeight: 1.5
  },
  footer: {
    borderTop: "1px solid #3A3D3F",
    marginTop: 30,
    paddingTop: 20,
    display: "flex",
    flexWrap: "wrap",
    gap: 8
  }
};
