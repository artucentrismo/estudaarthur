# Ciclo — versão pessoal

Aplicativo pessoal de estudos com login e sincronização privada entre dispositivos.

- Site: https://artucentrismo.github.io/estudaarthur/
- O aplicativo exige autenticação por e-mail e senha; não oferece cadastro público.
- A conta pessoal deve ser criada pelo administrador no painel Supabase.
- O código do GitHub Pages permanece público; os dados são protegidos por Supabase Auth e RLS.

## Configuração inicial (uma única vez)
1. No Supabase Dashboard, abra o projeto `ciclo-estudos` → **Authentication → Users** e use **Add user** para criar sua conta pessoal.
2. Em **Authentication → Sign In / Providers → Email**, desative a opção que permite novos cadastros públicos. A tela do Ciclo não possui botão de cadastro.
3. Em **Authentication → URL Configuration**, configure **Site URL** e adicione às **Redirect URLs** `https://artucentrismo.github.io/estudaarthur/`.
4. Acesse o site e entre com o e-mail e a senha criados no painel.

O GitHub Pages continua publicando o código em um endereço público. O login protege o uso do aplicativo e as políticas RLS protegem os dados; isso não torna o código-fonte privado.

## Dados
O estado do Ciclo e do Anki é salvo como snapshot JSON na tabela `public.user_app_state`, em uma linha associada ao ID do usuário autenticado. O Realtime propaga alterações para sessões abertas. O navegador mantém um cache local temporário.

As chaves locais são exclusivas desta versão (`ciclo-estudaarthur-v1` e `ciclo-estudaarthur-anki-v1`) para não misturar os dados com o repositório `sistemaestudos`. Na primeira abertura, os dados antigos deste navegador podem ser copiados para as chaves novas e enviados à nuvem após o primeiro login.

## Segurança
- O front-end usa somente a chave publishable do Supabase; nunca incluir service_role ou secret keys.
- As políticas RLS limitam cada linha ao usuário autenticado proprietário.
- Desative novos cadastros públicos no painel Supabase e mantenha apenas sua conta.

## Desenvolvimento
HTML/CSS/JavaScript sem etapa de build. Execute `npm run check` para validar os módulos.
