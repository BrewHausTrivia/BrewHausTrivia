
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function HostLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage("Login failed. Check your email and password.");
      setLoading(false);
      return;
    }

    const { data: roleData, error: roleError } = await supabase
      .from("host_roles")
      .select("role, approved")
      .eq("user_id", data.user.id)
      .single();

    if (roleError || !roleData?.approved) {
      await supabase.auth.signOut();
      setMessage("Your account has not been approved as a host.");
      setLoading(false);
      return;
    }

    router.push("/host/dashboard");
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#101820",
      color: "white",
      fontFamily: "Arial",
      display: "grid",
      placeItems: "center",
      padding: "20px"
    }}>
      <form onSubmit={handleLogin} style={{
        background: "#1d2b36",
        padding: "35px",
        borderRadius: "16px",
        width: "100%",
        maxWidth: "420px"
      }}>
        <h1 style={{ color: "#E6A23C", textAlign: "center" }}>
          BrewHausTrivia
        </h1>
        <h2 style={{ textAlign: "center" }}>Host Login</h2>

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={inputStyle}
        />

        <button disabled={loading} style={buttonStyle}>
          {loading ? "Signing in..." : "SIGN IN"}
        </button>

        {message && <p style={{ color: "#ffb4a2" }}>{message}</p>}
      </form>
    </main>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "14px",
  marginBottom: "15px",
  borderRadius: "8px",
  fontSize: "16px"
};

const buttonStyle = {
  width: "100%",
  padding: "15px",
  background: "#E6A23C",
  color: "#101820",
  border: "none",
  borderRadius: "8px",
  fontWeight: "bold",
  cursor: "pointer"
};
