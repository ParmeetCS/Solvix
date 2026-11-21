export const metadata = {
  title: 'SOLVIX API Server',
  description: 'Backend REST API services for Solvix Solar Platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
