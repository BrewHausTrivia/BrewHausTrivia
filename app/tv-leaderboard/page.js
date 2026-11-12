
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../../lib/supabase";

export default function TVLeaderboard() {
  const router = useRouter();

  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [siteUrl, setSiteUrl] = useState("");

  useEffect(() => {
    setSiteUrl("https://brewhaustrivia.vercel.app");

    let active = true;

    async function loadLeaderboard() {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
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

      const { data: gameData, error: gameError } =
        await supabase.rpc("host_get_latest_game");

      if (gameError) {
        if (active) {
          setMessage(gameError.message);
          setLoading(false);
        }
        return;
      }

      if (!gameData) {
        if (active) {
          setGame(null);
          setPlayers([]);
          setMessage("No game has been created yet.");
          setLoading(false);
        }
        return;
      }

      const { data: leaderboardData, error: leaderboardError } =
        await supabase.rpc("host_get_game_leaderboard", {
          p_game_id: gameData.id
        });

      if (!active) return;

      if (leaderboardError) {
        setMessage(leaderboardError.message);
      } else {
        setGame(gameData);
        setPlayers(leaderboardData || []);
        setMessage("");
      }

      setLoading(false);
    }

    loadLeaderboard();

    const interval = setInterval(loadLeaderboard, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [router]);

  if (loading) {
    return (
      <main style={styles.page}>
        <h1>BREWHAUSTRIVIA</h1>
        <p>Loading leaderboard...</p>
      </main>
    );
  }

  const joinUrl = game && siteUrl
    ? `${siteUrl}/join?code=${game.game_code}`
    : "";

  return (
    <main style={styles.page}>
      <h1 style={styles.title}>BREWHAUSTRIVIA</h1>
      <p style={styles.subtitle}>THE ULTIMATE TRIVIA CHALLENGE</p>

      {message && <p>{message}</p>}

      {game && (
        <>
          <div style={styles.joinSection}>
            <div>
              <p style={styles.gameCode}>
                GAME CODE: {game.game_code}
              </p>
              <p style={styles.scanText}>
                SCAN TO JOIN THE GAME
              </p>
            </div>

            {joinUrl && (
              <div style={styles.qrCard}>
                <QRCodeSVG
                  value={joinUrl}
                  size={180}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#101010"
                />
                <p style={styles.qrCaption}>
                  SCAN WITH YOUR PHONE
                </p>
              </div>
            )}
          </div>

          <h2 style={styles.heading}>LIVE LEADERBOARD</h2>

          <div style={styles.list}>
            {players.length === 0 ? (
              <p>Waiting for players...</p>
            ) : (
              players.map((player) => (
                <div
                  key={player.rank}
                  style={{
                    ...styles.player,
                    ...(player.rank === 1 ? styles.firstPlace : {})
                  }}
                >
                  <span style={styles.rank}>
                    {player.rank === 1
                      ? "🥇"
                      : player.rank === 2
                      ? "🥈"
                      : player.rank === 3
                      ? "🥉"
                      : `#${player.rank}`}
                  </span>

                  <span style={styles.name}>
                    {player.nickname}
                  </span>

                  <span style={styles.score}>
                    {player.total_score} POINTS
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}

      <p style={styles.footer}>
        SCORES UPDATE AUTOMATICALLY
      </p>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#101010",
    color: "white",
    padding: "30px 20px",
    textAlign: "center",
    fontFamily: "Arial, sans-serif"
  },
  title: {
    color: "#D6A84B",
    fontSize: "clamp(32px, 6vw, 64px)",
    fontWeight: "900",
    marginBottom: "5px"
  },
  subtitle: {
    color: "#cccccc",
    letterSpacing: "5px",
    fontSize: "clamp(12px, 2vw, 18px)"
  },
  joinSection: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "40px",
    flexWrap: "wrap",
    marginTop: "25px"
  },
  gameCode: {
    color: "#D6A84B",
    fontSize: "24px",
    fontWeight: "bold"
  },
  scanText: {
    color: "white",
    fontSize: "20px",
    fontWeight: "bold"
  },
  qrCard: {
    background: "white",
    padding: "14px",
    borderRadius: "12px",
    display: "inline-block"
  },
  qrCaption: {
    color: "#101010",
    fontSize: "12px",
    fontWeight: "bold",
    marginBottom: "0"
  },
  heading: {
    fontSize: "clamp(28px, 4vw, 44px)",
    marginTop: "30px",
    marginBottom: "25px"
  },
  list: {
    maxWidth: "900px",
    margin: "0 auto"
  },
  player: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    background: "#252525",
    borderRadius: "12px",
    padding: "18px 24px",
    marginBottom: "12px",
    fontSize: "clamp(18px, 3vw, 30px)"
  },
  firstPlace: {
    background: "#493918",
    border: "2px solid #D6A84B"
  },
  rank: {
    width: "55px",
    textAlign: "center",
    fontWeight: "bold"
  },
  name: {
    flex: 1,
    textAlign: "left",
    fontWeight: "bold"
  },
  score: {
    color: "#D6A84B",
    fontWeight: "bold"
  },
  footer: {
    marginTop: "40px",
    color: "#888888",
    letterSpacing: "3px",
    fontSize: "13px"
  }
};
