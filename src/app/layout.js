// src/app/layout.js
import './globals.css';

export const metadata = {
  title: 'UFAR Student Network',
  description: 'Social platform for UFAR students',
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