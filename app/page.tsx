import { redirect } from 'next/navigation';

// A rota raiz "/" não tem conteúdo próprio — ela só encaminha para a tela
// de Transações, que é a visão principal do app.
export default function Home() {
  redirect('/transacoes');
}
