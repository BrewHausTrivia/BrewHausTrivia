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

cc

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
Use Control + Shift + m to toggle the tab key moving
