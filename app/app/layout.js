
export const metadata = {
  title: "BrewHausTrivia",
  description: "Live trivia, great questions, and friendly competition."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
