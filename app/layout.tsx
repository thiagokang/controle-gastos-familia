import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

// Roda de forma síncrona antes da primeira pintura, para o <html> já nascer
// com a classe "dark" certa (ou sem ela) — sem isso, a tela pisca no tema
// errado por uma fração de segundo antes do React assumir. Precisa ser uma
// tag <script> "crua" (não next/script): o next/script, mesmo com
// strategy="beforeInteractive", adia a execução para depois do parse do
// HTML nesta versão do Next — tarde demais para evitar o flash. O aviso que
// o React mostra no console sobre "script tag" é inofensivo (é o preço de
// depender desse truque em vez de uma lib como next-themes).
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = window.localStorage.getItem('theme');
    var isDark = stored === 'dark' || (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  } catch (e) {}
})();
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Controle de Gastos da Família",
  description: "Controle dos gastos familiares por categoria e mês",
};

// Layout raiz: envolve toda a aplicação. O menu lateral (Sidebar) é
// renderizado aqui uma única vez, então ele aparece em toda tela sem
// precisar ser repetido em cada página.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex h-full min-h-screen">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <ThemeProvider>
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-8">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
