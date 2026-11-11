  1
  2
  3
  4
  5
  6
  7
  8
  9
 10
 11
 12
 13
 14
 15
 16
 17
 18
 19
 20
 21
 22
 23
 24
 25
 26
 27
 28
 29
 30
 31
 32
 33
 34
 35
 36
 37
 38
 39
 40
 41
 42
 43
 44
 45
 46
 47
 48
 49
 50
 51
 52
 53
 54
 55
 56
 57
 58
 59
 60
 61
 62
 63
 64
 65
 66
 67
 68
 69
 70
 71
d
c
c
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
Use Control + Shift + m to toggle the tab key moving focus. Alternatively, use esc then tab to move to the next interactive element o
