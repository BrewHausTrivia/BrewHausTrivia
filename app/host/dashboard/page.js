
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
  const [creatingGame, setCreatingGame] = useState(false);

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
    if (creatingGame) return;

    setCreatingGame(true);
    setMessage("");

    const { error } = await supabase.rpc("create_trivia_game");

    if (error) {
      setMessage(error.message);
      setCreatingGame(false);
      return;
    }

    setMessage("New game created!");
    setLoading(true);
    await loadDashboard();
    setCreatingGame(false);
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

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <h1 style={styles.title}>
            BREWHAUS<span style={styles.gold}>TRIVIA</span>
          </h1>
          <p style={styles.muted}>Loading dashboard...</p>
        </div>
      </main>
    );
  }

  const currentQuestion = questions.find(
    (question) =>
      question.question_number === game?.current_question &&
      question.is_released
  );

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

        {message && (
          <div style={styles.message}>
            {message}
          </div>
        )}

        {!game ? (
          <section style={panelStyle}>
            <h2 style={styles.sectionTitle}>No Game Found</h2>
            <p style={styles.muted}>
              Create a new game to get started.
            </p>

            <button
              style={buttonStyle}
              onClick={createGame}
              disabled={creatingGame}
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

              <h1 style={styles.gameCode}>
                {game.game_code}
              </h1>

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
                    style={buttonStyle}
                    onClick={() => controlGame("open_registration")}
                  >
                    OPEN REGISTRATION
                  </button>

                  <button
                    style={secondaryButtonStyle}
                    onClick={() => controlGame("close_registration")}
                  >
                    CLOSE REGISTRATION
                  </button>

                  <button
                    style={{
                      ...buttonStyle,
                      background: "#704B47",
                      color: "#F1EBDD"
                    }}
                    onClick={() => controlGame("finish_game")}
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
                    style={buttonStyle}
                    onClick={createGame}
                    disabled={creatingGame}
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
                    style={buttonStyle}
                    onClick={() => controlGame("reveal_answer")}
                  >
                    REVEAL ANSWER
                  </button>
                )}
              </section>
            )}

            <section>
              <div style={styles.questionsHeader}>
                <h2 style={styles.sectionTitle}>Questions</h2>
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
                      <span style={styles.released}>
                        RELEASED
                      </span>
                    )}
                  </div>

                  <p style={styles.prompt}>
                    {question.prompt}
                  </p>

                  {question.is_released ? (
                    <p style={{ color: colors.green, fontSize: 13 }}>
                      This question has been released.
                    </p>
                  ) : (
                    <button
                      style={secondaryButtonStyle}
                      onClick={() =>
                        controlGame("release_question", question.question_number)
                      }
                      disabled={game.status === "finished"}
                    >
                      RELEASE THIS QUESTION
                    </button>
                  )}
                </div>
              ))}
            </section>
          </>
        )}

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
  footer: {
    borderTop: "1px solid #3A3D3F",
    marginTop: 30,
    paddingTop: 20,
    display: "flex",
    flexWrap: "wrap",
    gap: 8
  }
};

                            
