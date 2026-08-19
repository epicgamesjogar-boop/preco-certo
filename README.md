# Preço Certo — guia de instalação (grátis, sem programar)

Este projeto está pronto para testar **sem gastar nada**. Nenhum passo usa
terminal — tudo é feito clicando no navegador.

## O que ele faz de verdade
- Você tira a foto do produto pelo próprio app.
- A foto vai para o **Gemini (Google)**, que identifica produto/marca/categoria — camada gratuita, sem cartão de crédito.
- O app busca esse produto (e equivalentes) na API pública e gratuita do Mercado Livre.
- Compara o preço que você digitou com a média encontrada e mostra alternativas reais, com link.

## Passo 1 — Criar conta no GitHub (grátis)
1. Acesse https://github.com e crie uma conta.
2. Clique em **New repository**, dê um nome (ex: `preco-certo`) e crie (pode deixar público).
3. Dentro do repositório vazio, clique em **uploading an existing file**.
4. Arraste TODOS os arquivos e pastas deste projeto (mantendo a estrutura de pastas)
   para a área de upload e clique em **Commit changes**.

## Passo 2 — Criar sua chave gratuita do Gemini (a "IA" que identifica o produto)
1. Acesse https://aistudio.google.com e faça login com sua conta Google (a mesma do Gmail já serve).
2. No menu, clique em **Get API key** → **Create API key**.
3. Copie a chave gerada (começa com `AIza...`). **Não precisa cartão de crédito.**
4. A camada gratuita tem um limite diário de usos — mais que suficiente para testar à vontade.

## Passo 3 — Criar conta na Vercel (onde o app vai ficar hospedado, grátis)
1. Acesse https://vercel.com e crie uma conta usando o próprio GitHub (é mais rápido).
2. Clique em **Add New... → Project**.
3. Selecione o repositório `preco-certo` que você criou no Passo 1 e clique em **Import**.

## Passo 4 — Adicionar a chave antes de publicar
1. Ainda na tela de importação, procure **Environment Variables**.
2. Adicione:
   - Nome: `GEMINI_API_KEY`
   - Valor: cole a chave `AIza...` do Passo 2
3. Clique em **Deploy**. Aguarde ~1–2 minutos.

## Passo 5 — Instalar no celular
1. Ao terminar, a Vercel te dá um link tipo `https://preco-certo-seunome.vercel.app`.
2. Abra esse link no navegador do celular (Chrome no Android, Safari no iPhone).
3. Toque no menu do navegador → **Adicionar à tela inicial**.
4. Pronto — um ícone "Preço Certo" aparece na tela do seu celular, como um app normal.

## Custos: zero
- **Vercel**: grátis para esse tipo de uso pessoal.
- **Mercado Livre (busca de preço)**: grátis, sem chave necessária.
- **Gemini (identificar o produto pela foto)**: grátis na camada de testes, sem cartão.
  Se um dia você usar demais e passar do limite diário gratuito, o app simplesmente
  mostra um erro pedindo para tentar de novo mais tarde — não tem cobrança automática.

## Se algo der errado
- A tela de erro no app quase sempre mostra o motivo (ex: chave não configurada, ou limite diário atingido).
- Se o Mercado Livre não achar nada, é porque a busca gerada pela IA ficou
  específica demais — tente fotografar com o rótulo/nome mais visível.
