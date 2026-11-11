
export const metadata = {
  title: "BrewHausTrivia",
  description: "Live trivia and friendly competition."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
