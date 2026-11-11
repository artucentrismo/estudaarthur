# Ciclo — versão pessoal

Aplicativo pessoal de estudos com login e sincronização privada entre dispositivos.

- Site: https://artucentrismo.github.io/estudaarthur/
- O aplicativo exige autenticação por e-mail e senha; não oferece cadastro público.
- A conta pessoal deve ser criada pelo administrador no painel Supabase.
- O código do GitHub Pages permanece público; os dados são protegidos por Supabase Auth e RLS.

## Dados
O estado do Ciclo e do Anki é salvo como snapshot JSON na tabela `public.user_app_state`, em uma linha associada ao ID do usuário autenticado. O Realtime propaga alterações para sessões abertas. O navegador mantém um cache local temporário.

As chaves locais são exclusivas desta versão (`ciclo-estudaarthur-v1` e `ciclo-estudaarthur-anki-v1`) para não misturar os dados com o repositório `sistemaestudos`. Na primeira abertura, os dados antigos deste navegador podem ser copiados para as chaves novas e enviados à nuvem após o primeiro login.

## Segurança
- O front-end usa somente a chave publishable do Supabase; nunca incluir service_role ou secret keys.
- As políticas RLS limitam cada linha ao usuário autenticado proprietário.
- Desative novos cadastros públicos no painel Supabase e mantenha apenas sua conta.

## Desenvolvimento
HTML/CSS/JavaScript sem etapa de build. Execute `npm run check` para validar os módulos.
