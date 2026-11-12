
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

// Reads the bulk text box and separates it into individual questions.
function parseBulkQuestions(text) {
  const blocks = text
    .trim()
    .split(/\n\s*\n/)
    .filter((block) => block.trim());

  const questions = [];
  const errors = [];

  blocks.forEach((block, index) => {
    const question = {
      prompt: "",
      answer: "",
      variants: []
    };

    let currentField = null;
    const lines = block.split("\n");

    lines.forEach((line) => {
      const trimmedLine = line.trim();

      if (!trimmedLine) return;

      const match = trimmedLine.match(
        /^(Question|Answer|Also accepted)\s*:\s*(.*)$/i
      );

      if (match) {
        const field = match[1].toLowerCase();
        const value = match[2].trim();

        if (field === "question") {
          question.prompt = value;
          currentField = "question";
        } else if (field === "answer") {
          question.answer = value;
          currentField = "answer";
        } else {
          question.variants = value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
          currentField = "variants";
        }
      } else if (currentField === "question") {
        question.prompt +=
          (question.prompt ? " " : "") + trimmedLine;
      } else if (currentField === "answer") {
        question.answer +=
          (question.answer ? " " : "") + trimmedLine;
      } else if (currentField === "variants") {
        question.variants.push(trimmedLine);
      } else {
        errors.push(
          `Question ${index + 1}: Unexpected line "${trimmedLine}".`
        );
      }
    });

    if (!question.prompt) {
      errors.push(`Question ${index + 1}: Missing question text.`);
    }

    if (!question.answer) {
      errors.push(`Question ${index + 1}: Missing correct answer.`);
    }

    const variantsText = question.variants.join(", ").trim();

    if (
      variantsText.toLowerCase() === "none" ||
      variantsText.toLowerCase() === "n/a" ||
      variantsText === "-"
    ) {
      question.variants = [];
    }

    if (
      question.prompt.length > 0 &&
      question.answer.length > 0
    ) {
      questions.push(question);
    }
  });

  return {
    questions,
    errors,
    totalBlocks: blocks.length
  };
}

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

  const [bulkText, setBulkText] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingGame, setLoadingGame] = useState(false);

  const bulkResult = parseBulkQuestions(bulkText);

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

  async function saveBulkQuestions() {
    if (bulkResult.totalBlocks === 0) {
      setMessage("Paste some questions into the bulk text box first.");
      return;
    }

    if (bulkResult.errors.length > 0) {
      setMessage(
        "Fix the formatting issues before importing your questions."
      );
      return;
    }

    if (bulkResult.questions.length === 0) {
      setMessage("No valid questions were found.");
      return;
    }

    const confirmed = window.confirm(
      `Import ${bulkResult.questions.length} questions into Round ${round}, ${category} → ${subcategory}?`
    );

    if (!confirmed) return;

    setBulkSaving(true);
    setMessage("");

    const questionsToInsert = bulkResult.questions.map((item) => ({
      round_number: Number(round),
      category,
      subcategory,
      prompt: item.prompt.trim(),
      correct_answer: item.answer.trim(),
      accepted_variants: item.variants
    }));

    const { error } = await supabase
      .from("question_bank")
      .insert(questionsToInsert);

    if (error) {
      setMessage(`Bulk import failed: ${error.message}`);
    } else {
      setMessage(
        `Success! ${questionsToInsert.length} questions were added to your Question Bank.`
      );
      setBulkText("");
      await loadQuestions();
    }

    setBulkSaving(false);
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
          (q) =>
            q.id === selectedId &&
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
          padding: 20,
          marginBottom: 25
        }}
      >
        <h2>Bulk Add Questions</h2>

        <p>
          Choose the round and category below, then paste your
          questions into the box. Separate each question with a
          blank line.
        </p>

        <label>Round for this batch</label>
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

        <label>
          **Paste your questions below**
        </label>

        <textarea
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder={`Question: What is the capital of France?
Answer: Paris
Also accepted: None

Question: Who sang Thriller?
Answer: Michael Jackson
Also accepted: MJ

Question: What year did the first iPhone release?
Answer: 2007
Also accepted: None`}
          rows={16}
          style={{
            width: "100%",
            padding: 12,
            marginTop: 8,
            background: "#17191B",
            color: "#F1EBDD",
            border: "1px solid #3A3D3F",
            borderRadius: 6,
            fontFamily: "monospace",
            fontSize: 14,
            boxSizing: "border-box"
          }}
        />

        <p>
          Use <strong>Question:</strong>, <strong>Answer:</strong>,
          and <strong>Also accepted:</strong> for each entry.
          Put a blank line between questions. Use "None" if there
          are no additional accepted answers.
        </p>

        {bulkText.trim() && (
          <div
            style={{
              background: "#17191B",
              border: "1px solid #3A3D3F",
              borderRadius: 8,
              padding: 14,
              marginTop: 15
            }}
          >
            <h3>Import Preview</h3>

            <p>
              <strong>
                {bulkResult.questions.length} valid questions found
              </strong>
            </p>

            {bulkResult.errors.length > 0 && (
              <div style={{ color: "#E6A09A" }}>
                <strong>
                  Please fix these issues before importing:
                </strong>

                <ul>
                  {bulkResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {bulkResult.questions.length > 0 && (
              <p>
                These questions will be saved to Round {round},
                {" "}{category} → {subcategory}.
              </p>
            )}
          </div>
        )}

        <button
          onClick={saveBulkQuestions}
          disabled={
            bulkSaving ||
            !bulkText.trim() ||
            bulkResult.questions.length === 0 ||
            bulkResult.errors.length > 0
          }
          style={{
            marginTop: 15,
            padding: "12px 20px",
            background: "#B79A62",
            color: "#17191B",
            border: "none",
            borderRadius: 6,
            fontWeight: "bold",
            cursor: "pointer"
          }}
        >
          {bulkSaving
            ? "Importing Questions..."
            : `Import ${bulkResult.questions.length} Questions`}
        </button>
      </section>

      <section
        style={{
          background: "#242729",
          border: "1px solid #3A3D3F",
          borderRadius: 10,
          padding: 20
        }}
      >
        <h2>{editingId ? "Edit Question" : "Add a Single Question"}</h2>

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

      {renderRound("ROUND 1", filteredRoundOne, 1, selectedOne)}
      {renderRound("ROUND 2", filteredRoundTwo, 2, selectedTwo)}
      {renderRound("ROUND 3", filteredRoundThree, 3, selectedThree)}

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
