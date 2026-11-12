
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

  const colors = {
    background: "#17191B",
    panel: "#242729",
    border: "#3A3D3F",
    gold: "#B79A62",
    cream: "#F1EBDD",
    muted: "#A7A7A2"
  };

  if (loading) {
    return (
      <main style={styles.page}>
        <h1 style={styles.title}>
          BREWHAUS<span style={styles.gold}>TRIVIA</span>
        </h1>
        <p style={styles.subtitle}>LOADING LEADERBOARD...</p>
      </main>
    );
  }

  const joinUrl = game && siteUrl
    ? `${siteUrl}/join?code=${game.game_code}`
    : "";

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>
            BREWHAUS<span style={styles.gold}>TRIVIA</span>
          </h1>

          <p style={styles.subtitle}>PUB TRIVIA</p>
        </header>

        {message && (
          <p style={styles.message}>{message}</p>
        )}

        {game && (
          <>
            <section style={styles.joinSection}>
              <div style={styles.joinInfo}>
                <p style={styles.label}>CURRENT GAME</p>

                <h2 style={styles.gameCode}>
                  {game.game_code}
                </h2>

                <p style={styles.scanText}>
                  Scan the QR code to join the game.
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
            </section>

            <section style={styles.leaderboardSection}>
              <div style={styles.headingRow}>
                <h2 style={styles.heading}>LIVE LEADERBOARD</h2>
                <span style={styles.liveLabel}>LIVE SCORES</span>
              </div>

              <div style={styles.list}>
                {players.length === 0 ? (
                  <div style={styles.empty}>
                    Waiting for players...
                  </div>
                ) : (
                  players.map((player) => (
                    <div
                      key={player.rank}
                      style={{
                        ...styles.player,
                        ...(player.rank === 1
                          ? styles.firstPlace
                          : {})
                      }}
                    >
                      <span style={styles.rank}>
                        {player.rank === 1
                          ? "1ST"
                          : player.rank === 2
                          ? "2ND"
                          : player.rank === 3
                          ? "3RD"
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
            </section>
          </>
        )}

        <footer style={styles.footer}>
          SCORES UPDATE AUTOMATICALLY
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
    padding: "30px 22px",
    boxSizing: "border-box",
    fontFamily: "Arial, Helvetica, sans-serif"
  },
  container: {
    maxWidth: 1100,
    margin: "0 auto"
  },
  header: {
    textAlign: "center",
    paddingBottom: 22,
    borderBottom: "1px solid #3A3D3F"
  },
  title: {
    color: "#F1EBDD",
    fontSize: "clamp(30px, 5vw, 54px)",
    fontWeight: 700,
    letterSpacing: 2,
    margin: 0
  },
  gold: {
    color: "#B79A62"
  },
  subtitle: {
    color: "#A7A7A2",
    letterSpacing: 4,
    fontSize: 13,
    marginTop: 10
  },
  message: {
    textAlign: "center",
    color: "#E2A09A",
    marginTop: 25
  },
  joinSection: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 55,
    flexWrap: "wrap",
    background: "#242729",
    border: "1px solid #3A3D3F",
    borderRadius: 10,
    padding: "28px",
    marginTop: 28
  },
  joinInfo: {
    textAlign: "center"
  },
  label: {
    color: "#A7A7A2",
    fontSize: 13,
    letterSpacing: 2
  },
  gameCode: {
    color: "#B79A62",
    fontSize: "clamp(35px, 5vw, 50px)",
    letterSpacing: 5,
    margin: "12px 0"
  },
  scanText: {
    color: "#F1EBDD",
    fontSize: 17
  },
  qrCard: {
    background: "#FFFFFF",
    padding: 14,
    borderRadius: 6,
    display: "inline-block"
  },
  qrCaption: {
    color: "#191919",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1,
    marginBottom: 0
  },
  leaderboardSection: {
    marginTop: 35
  },
  headingRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20
  },
  heading: {
    fontSize: "clamp(22px, 4vw, 32px)",
    letterSpacing: 1,
    margin: 0
  },
  liveLabel: {
    color: "#B79A62",
    fontSize: 12,
    letterSpacing: 2,
    border: "1px solid #665638",
    borderRadius: 4,
    padding: "7px 11px"
  },
  list: {
    maxWidth: 950,
    margin: "0 auto"
  },
  empty: {
    background: "#242729",
    border: "1px solid #3A3D3F",
    borderRadius: 8,
    padding: 30,
    color: "#A7A7A2",
    textAlign: "center",
    fontSize: 18
  },
  player: {
    display: "flex",
    alignItems: "center",
    gap: 18,
    background: "#242729",
    border: "1px solid #3A3D3F",
    borderRadius: 7,
    padding: "18px 22px",
    marginBottom: 10,
    fontSize: "clamp(16px, 2.5vw, 25px)"
  },
  firstPlace: {
    background: "#302C23",
    border: "1px solid #B79A62"
  },
  rank: {
    width: 55,
    color: "#B79A62",
    textAlign: "center",
    fontWeight: 700,
    fontSize: 16
  },
  name: {
    flex: 1,
    textAlign: "left",
    fontWeight: 600,
    overflowWrap: "anywhere"
  },
  score: {
    color: "#B79A62",
    fontWeight: 700,
    fontSize: "clamp(13px, 2vw, 19px)",
    whiteSpace: "nowrap"
  },
  footer: {
    marginTop: 45,
    color: "#777A7B",
    textAlign: "center",
    letterSpacing: 2,
    fontSize: 12
  }
};
