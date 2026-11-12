
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const CATEGORY_OPTIONS = {
  General: ["General"],
  Sports: [
    "Basketball",
    "Football",
    "Baseball",
    "Hockey",
    "Olympics",
    "Athletes & Sports History",
    "Other Sports"
  ],
  Geography: [
    "Countries & Capitals",
    "Oceans & Rivers",
    "Landmarks",
    "United States Geography",
    "World Geography"
  ],
  "2000s Pop Culture": [
    "Movies",
    "Television",
    "Music",
    "Celebrities",
    "2000s Events & Trends"
  ],
  History: [
    "American History",
    "World History",
    "Historical Figures",
    "Wars & Major Events",
    "Inventions & Discoveries"
  ],
  Country: [
    "Country Singers & Bands",
    "Country Songs & Albums",
    "Country Music History",
    "Country Living & Culture"
  ]
};

export default function QuestionBank() {
  const router = useRouter();

  const [questions, setQuestions] = useState([]);
  const [game, setGame] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const [round, setRound] = useState("1");
  const [category, setCategory] = useState("General");
  const [subcategory, setSubcategory] = useState("General");

  const [filterCategory, setFilterCategory] = useState("All");
  const [filterSubcategory, setFilterSubcategory] = useState("All");

  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [variants, setVariants] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingGame, setLoadingGame] = useState(false);

  async function loadQuestions() {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/host");
      return;
    }

    const { data: roleData, error: roleError } = await supabase
      .from("host_roles")
      .select("approved")
      .eq("user_id", user.id)
      .single();

    if (roleError || !roleData?.approved) {
      router.replace("/host");
      return;
    }

    const { data, error } = await supabase
      .from("question_bank")
      .select("*")
      .order("round_number")
      .order("created_at");

    if (error) {
      setMessage(error.message);
    } else {
      setQuestions(data || []);
    }

    const { data: gameData, error: gameError } =
      await supabase.rpc("host_get_latest_game");

    if (!gameError) {
      setGame(gameData);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadQuestions();
  }, []);

  function clearForm() {
    setRound("1");
    setCategory("General");
    setSubcategory("General");
    setPrompt("");
    setAnswer("");
    setVariants("");
    setEditingId(null);
  }

  async function saveQuestion() {
    if (!prompt.trim() || !answer.trim()) {
      setMessage("Enter both a question and a correct answer.");
      return;
    }

    setSaving(true);
    setMessage("");

    const questionData = {
      round_number: Number(round),
      category,
      subcategory,
      prompt: prompt.trim(),
      correct_answer: answer.trim(),
      accepted_variants: variants
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    };

    let result;

    if (editingId) {
      result = await supabase
        .from("question_bank")
        .update(questionData)
        .eq("id", editingId);
    } else {
      result = await supabase
        .from("question_bank")
        .insert(questionData);
    }

    if (result.error) {
      setMessage(result.error.message);
    } else {
      setMessage(editingId ? "Question updated!" : "Question saved!");
      clearForm();
      await loadQuestions();
    }

    setSaving(false);
  }

  function editQuestion(question) {
    const savedCategory = question.category || "General";
    const availableSubcategories =
      CATEGORY_OPTIONS[savedCategory] || ["General"];

    setEditingId(question.id);
    setRound(String(question.round_number));
    setCategory(savedCategory);
    setSubcategory(
      availableSubcategories.includes(question.subcategory)
        ? question.subcategory
        : availableSubcategories[0]
    );
    setPrompt(question.prompt);
    setAnswer(question.correct_answer);
    setVariants((question.accepted_variants || []).join(", "));
    setMessage("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteQuestion(id) {
    if (!window.confirm("Delete this saved question?")) return;

    const { error } = await supabase
      .from("question_bank")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage(error.message);
    } else {
      setSelectedIds((previous) =>
        previous.filter((item) => item !== id)
      );
      setMessage("Question deleted.");
      await loadQuestions();
    }
  }

  function toggleQuestion(id, roundNumber) {
    setSelectedIds((previous) => {
      if (previous.includes(id)) {
        return previous.filter((item) => item !== id);
      }

      const roundCount = previous.filter((selectedId) =>
        questions.some(
          (q) => q.id === selectedId &&
            q.round_number === roundNumber
        )
      ).length;

      if (roundCount >= 10) {
        return previous;
      }

      return [...previous, id];
    });
  }

  const roundOne = questions.filter(
    (q) => q.round_number === 1
  );

  const roundTwo = questions.filter(
    (q) => q.round_number === 2
  );

  const roundThree = questions.filter(
    (q) => q.round_number === 3
  );

  const selectedOne = selectedIds.filter((id) =>
    roundOne.some((q) => q.id === id)
  ).length;

  const selectedTwo = selectedIds.filter((id) =>
    roundTwo.some((q) => q.id === id)
  ).length;

  const selectedThree = selectedIds.filter((id) =>
    roundThree.some((q) => q.id === id)
  ).length;

  const filteredQuestions = questions.filter((question) => {
    const matchesCategory =
      filterCategory === "All" ||
      (question.category || "General") === filterCategory;

    const matchesSubcategory =
      filterSubcategory === "All" ||
      (question.subcategory || "General") === filterSubcategory;

    return matchesCategory && matchesSubcategory;
  });

  const filteredRoundOne = filteredQuestions.filter(
    (q) => q.round_number === 1
  );

  const filteredRoundTwo = filteredQuestions.filter(
    (q) => q.round_number === 2
  );

  const filteredRoundThree = filteredQuestions.filter(
    (q) => q.round_number === 3
  );

  async function loadSelectedQuestions() {
    if (
      selectedOne !== 10 ||
      selectedTwo !== 10 ||
      selectedThree !== 10
    ) {
      setMessage("Select exactly 10 questions from each round.");
      return;
    }

    if (!game || game.status !== "waiting") {
      setMessage(
        "You need a new waiting game before loading questions."
      );
      return;
    }

    if (!window.confirm("Load these 30 questions into this game?")) {
      return;
    }

    setLoadingGame(true);
    setMessage("");

    const { error } = await supabase.rpc(
      "host_load_question_bank",
      {
        p_game_id: game.id,
        p_question_ids: selectedIds
      }
    );

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Success! 30 questions loaded into your game.");
      setSelectedIds([]);
    }

    setLoadingGame(false);
  }

  if (loading) {
    return (
      <main style={{ padding: 30 }}>
        Loading Question Bank...
      </main>
    );
  }

  function renderRound(title, items, roundNumber, selectedCount) {
    return (
      <section style={{ marginTop: 30 }}>
        <h2>{title} ({items.length})</h2>

        <p>Selected: {selectedCount} / 10</p>

        {items.length === 0 && (
          <p>No questions match this filter.</p>
        )}

        {items.map((question) => {
          const isSelected = selectedIds.includes(question.id);
          const limitReached = selectedCount >= 10;

          return (
            <div
              key={question.id}
              style={{
                background: "#242729",
                color: "#F1EBDD",
                border: "1px solid #3A3D3F",
                borderRadius: 8,
                padding: 15,
                marginBottom: 12
              }}
            >
              <label
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start"
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={!isSelected && limitReached}
                  onChange={() =>
                    toggleQuestion(question.id, roundNumber)
                  }
                />

                <strong>{question.prompt}</strong>
              </label>

              <p>
                <strong>Category:</strong>{" "}
                {question.category || "General"}
              </p>

              <p>
                <strong>Subcategory:</strong>{" "}
                {question.subcategory || "General"}
              </p>

              <p>
                <strong>Correct answer:</strong>{" "}
                {question.correct_answer}
              </p>

              <p>
                <strong>Accepted variations:</strong>{" "}
                {(question.accepted_variants || []).join(", ") || "None"}
              </p>

              <button onClick={() => editQuestion(question)}>
                Edit
              </button>

              <button
                onClick={() => deleteQuestion(question.id)}
                style={{ marginLeft: 10 }}
              >
                Delete
              </button>
            </div>
          );
        })}
      </section>
    );
  }

  return (
    <main
      style={{
        maxWidth: 850,
        margin: "40px auto",
        padding: 24,
        fontFamily: "Arial, sans-serif",
        background: "#17191B",
        color: "#F1EBDD",
        minHeight: "100vh"
      }}
    >
      <h1 style={{ color: "#B79A62" }}>
        BrewHausTrivia Question Bank
      </h1>

      <p>Total saved questions: {questions.length}</p>

      {message && (
        <p style={{ fontWeight: "bold", color: "#B79A62" }}>
          {message}
        </p>
      )}

      <section
        style={{
          background: "#242729",
          border: "1px solid #3A3D3F",
          borderRadius: 10,
          padding: 20
        }}
      >
        <h2>{editingId ? "Edit Question" : "Add a Question"}</h2>

        <label>Round</label>
        <br />

        <select
          value={round}
          onChange={(e) => setRound(e.target.value)}
        >
          <option value="1">Round 1</option>
          <option value="2">Round 2</option>
          <option value="3">Round 3</option>
        </select>

        <br /><br />

        <label>Category</label>
        <br />

        <select
          value={category}
          onChange={(e) => {
            const nextCategory = e.target.value;
            setCategory(nextCategory);
            setSubcategory(CATEGORY_OPTIONS[nextCategory][0]);
          }}
        >
          {Object.keys(CATEGORY_OPTIONS).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <br /><br />

        <label>Subcategory</label>
        <br />

        <select
          value={subcategory}
          onChange={(e) => setSubcategory(e.target.value)}
        >
          {(CATEGORY_OPTIONS[category] || ["General"]).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <br /><br />

        <label>Question</label>
        <br />

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your trivia question"
          rows={3}
          style={{ width: "100%", padding: 10 }}
        />

        <br /><br />

        <label>Correct Answer</label>
        <br />

        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Enter the correct answer"
          style={{ width: "100%", padding: 10 }}
        />

        <br /><br />

        <label>Accepted Answer Variations</label>
        <br />

        <input
          value={variants}
          onChange={(e) => setVariants(e.target.value)}
          placeholder="Example: USA, United States, America"
          style={{ width: "100%", padding: 10 }}
        />

        <p>
          Separate accepted variations with commas.
          Capitalization and punctuation are handled automatically.
        </p>

        <button onClick={saveQuestion} disabled={saving}>
          {saving
            ? "Saving..."
            : editingId
              ? "Update Question"
              : "Save Question"}
        </button>

        {editingId && (
          <button
            onClick={clearForm}
            style={{ marginLeft: 10 }}
          >
            Cancel Edit
          </button>
        )}
      </section>

      <hr style={{ marginTop: 35 }} />

      <h2>Find Questions</h2>

      <p>Filter your saved questions by category.</p>

      <label>Category Filter</label>
      <br />

      <select
        value={filterCategory}
        onChange={(e) => {
          setFilterCategory(e.target.value);
          setFilterSubcategory("All");
        }}
      >
        <option value="All">All Categories</option>

        {Object.keys(CATEGORY_OPTIONS).map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <br /><br />

      <label>Subcategory Filter</label>
      <br />

      <select
        value={filterSubcategory}
        onChange={(e) => setFilterSubcategory(e.target.value)}
      >
        <option value="All">All Subcategories</option>

        {(filterCategory === "All"
          ? [...new Set(
              questions.map((q) => q.subcategory || "General")
            )]
          : CATEGORY_OPTIONS[filterCategory] || ["General"]
        ).map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <p>
        Showing {filteredQuestions.length} of {questions.length} questions.
      </p>

      <hr style={{ marginTop: 30 }} />

      <h2>Select Questions for Your Game</h2>

      <p>
        Choose 10 questions from each round. You must select 30 total.
      </p>

      <p>
        <strong>Total selected: {selectedIds.length} / 30</strong>
      </p>

      {renderRound(
        "ROUND 1",
        filteredRoundOne,
        1,
        selectedOne
      )}

      {renderRound(
        "ROUND 2",
        filteredRoundTwo,
        2,
        selectedTwo
      )}

      {renderRound(
        "ROUND 3",
        filteredRoundThree,
        3,
        selectedThree
      )}

      <section
        style={{
          border: "2px solid #B79A62",
          borderRadius: 10,
          padding: 20,
          marginTop: 30,
          background: "#242729"
        }}
      >
        <h2>Load Questions Into Game</h2>

        {game?.status === "waiting" ? (
          <p>Waiting game: {game.game_code}</p>
        ) : (
          <p>
            Your current game is not waiting for questions.
            Create a new game after the current game is finished.
          </p>
        )}

        <button
          onClick={loadSelectedQuestions}
          disabled={
            loadingGame ||
            selectedOne !== 10 ||
            selectedTwo !== 10 ||
            selectedThree !== 10 ||
            game?.status !== "waiting"
          }
        >
          {loadingGame
            ? "Loading Questions..."
            : "Load 30 Selected Questions"}
        </button>
      </section>

      <hr style={{ marginTop: 35 }} />

      <button onClick={() => router.push("/host/dashboard")}>
        Back to Host Dashboard
      </button>
    </main>
  );
}
