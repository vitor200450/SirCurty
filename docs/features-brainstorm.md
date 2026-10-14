# Brainstorm de funcionalidades exclusivas — Sir Curty

Base: seção 3 do `docs/planejamento-inicial.md` + pesquisa em encurtadores modernos
(Bitly, Rebrandly, Short.io, Linkly, Dub, Linkora, Cutt.ly, Sniply/UpContent, Shlink/Kutt/Polr).

## 1) Funcionalidades já listadas (detalhadas)

1. **Mostrar/editar links com cookie anônimo ou login Google**
   - Cookie `sircurty_anon_id` (httpOnly) cria um "reino anônimo"; login Google adiciona dono.
   - Permite listar, editar e excluir links do dono; sem login, apenas no próprio navegador.
   - Segurança: autorização por `owner_anon_id` ou `owner_user_id`.

2. **Gerar QR Code**
   - Geração local (`qrcode`) + endpoint API para download PNG.
   - Possível QR com cores do tema e logo Sir Curty; analytics separado (scans vs cliques).

3. **Links de uso único**
   - Flag `singleUse`; consumo marca `used_at` em transação; depois exibe página "link já usado".

4. **Tabela de estatísticas gerais**
   - Cards: total de links, total de cliques, domínios mais encurtados, cliques por dia.

5. **Links com nomes personalizados (vanity)**
   - Slug `/s/:custom`, único, validado por regex, bloqueio de palavras reservadas.

6. **Ranking dos links mais acessados**
   - Top N + medalhas/badges; atualização em tempo real (polling/WebSocket opcional).

7. **Opção de senha nos links**
   - Interstitial solicita senha; valida API e emite token curto; rate limit.

8. **Aviso para qual site o link encurtado está levando**
   - Tela " você está indo para X " com prosseguir/cancelar; click registrado.

9. **Filtro de palavras suspeitas**
   - Blocklist/heurística para evitar phishing/malware; bloqueio com copy do Sir Curty.

10. **Funcionalidade de destaque para o pitch**
    - Painel com ranking + gráfico de acessos + QR Code + traces reagindo.

## 2) Novas ideias por categoria (pesquisa extensa)

### A. Inteligência de redirect (core valioso, demonstrável)

| # | Ideia | Efeito "Sir Curty" | Esforço | Valor pitch |
|---|---|---|---|---|
| 11 | **Geo-targeting** — mesmo link leva a destinos diferentes por país/região | Sir Curty "teleporta" conforme reino do visitante | Médio | Alto |
| 12 | **Device/OS targeting** — iOS/Android/Desktop/web diferentes | "Espada" certa para cada besta | Médio | Alto |
| 13 | **Language targeting** — redireciona por `Accept-Language` | Encantamento local | Baixo | Médio |
| 14 | **Link por horário/dia** — destino muda conforme hora (já sugerido no PDF) | Sir Curty muda de guardião ao longo do dia | Baixo | Alto |
| 15 | **A/B/n-way testing** — split de tráfego entre variantes + vencedor automático | "Torneio de espadas" entre rotas | Médio/Alto | Muito alto |
| 16 | **Link rotator / weighted** — rotação com pesos | Besta combate aleatória | Baixo | Médio |
| 17 | **Click caps (limite de cliques)** — desativa após N cliques | "Link se esgota" (campanhas exclusivas) | Baixo | Alto |
| 18 | **Expiração por data/hora** | Feitiço com prazo de validade | Baixo | Alto |
| 19 | **Fallback URL** se destino principal cair (health check) | Escudo protetor | Médio | Médio |
| 20 | **Abertura em app (deep link)** — iOS/Android scheme universal | Teleporte para app nativo | Alto | Médio |
| 21 | **Smart bot filtering** — excluir prefetchers/bots das métricas | Sir Curty ignora imitações | Médio | Médio |
| 22 | **Redirect com TTL/cache por código** | Atalho mais ágil | Baixo | Baixo |

### B. Analytics & observabilidade (combina com Grafana)

| # | Ideia | Esforço | Valor |
|---|---|---|---|
| 23 | **UTM builder** (source/medium/campaign) ao criar link | Baixo | Alto |
| 24 | **Mapa de cliques** por país/cidade (Grafana/Map panel) | Médio | Alto |
| 25 | **Série temporal** cliques por hora/dia (dashboard) | Baixo | Alto |
| 26 | **Top referrers / devices / browsers** | Baixo | Alto |
| 27 | **Bot vs humano** no dashboard | Médio | Médio |
| 28 | **QR Code analytics separado** (scans vs cliques web) | Baixo | Médio |
| 29 | **Conversão** (clique → visita confirmada via pixel opcional) | Alto | Muito alto |
| 30 | **Export CSV/JSON** das métricas | Baixo | Médio |
| 31 | **Heatmap de engajamento** por link | Médio | Médio |
| 32 | **Alertas de anomalia** (pico de cliques/erros) no Grafana | Médio | Alto |

### C. Marca, identidade e UX (Sir Curty)

| # | Ideia | Esforço | Valor |
|---|---|---|---|
| 33 | **Domínio próprio/branded short link** (`curty.to/...` / custom) | Baixo (config) | Alto |
| 34 | **QR Code temático** (cores + logo Sir Curty, SVG) | Baixo | Alto |
| 35 | **OG preview (scraping)** — título/descrição/imagem do destino no interstitial | Médio | Alto |
| 36 | **Página 404/not found temática** ("a besta fugiu") | Baixo | Alto (demo) |
| 37 | **Loading animado** espada cortando / escudo | Baixo | Alto |
| 38 | **Mensagens de estado** (vazio/erro/sucesso) com personagem | Baixo | Alto |
| 39 | **Link "vivo" com contador regressivo** (expiração visível) | Baixo | Médio |
| 40 | **Bio link page** (mini landing "reino" com vários links) | Médio | Muito alto |
| 41 | **Temas/cores por campanha** | Baixo | Médio |

### D. Marketing e conversão

| # | Ideia | Esforço | Valor |
|---|---|---|---|
| 42 | **CTA overlay (Sniply-like)** — faixa Sir Curty no destino externo | Alto | Muito alto (wow) |
| 43 | **Retargeting pixels** (Meta/Google) no redirect | Médio | Alto |
| 44 | **Deep link para app** + fallback web | Alto | Médio |
| 45 | **Campaign folders/tags** e filtros | Baixo | Médio |
| 46 | **Bulk import/export CSV** | Baixo | Médio |
| 47 | **Clone/duplicate link** com ajustes | Baixo | Baixo |
| 48 | **Link scheduling (publicar link em data futura)** | Baixo | Médio |
| 49 | **API pública + webhooks** (evento clique) | Médio | Alto |
| 50 | **Integração Zapier/Make (opcional)** via webhook | Médio | Médio |

### E. Segurança e privacidade

| # | Ideia | Esforço | Valor |
|---|---|---|---|
| 51 | **Blocklist/allowlist de domínios** | Baixo | Alto |
| 52 | **Heurística de URL suspeita** (homógrafos, redirects múltiplos, IP-only, TLDs de risco) | Médio | Alto |
| 53 | **Rate limit por IP/anon** na criação e senha | Baixo | Alto |
| 54 | **Caps de cliques por segundo (anti-abuso)** | Baixo | Médio |
| 55 | **Hash de IP** para privacidade + geolocalização grossa | Baixo | Médio |
| 56 | **Logs de auditoria** (quem criou/editou/deletou) | Médio | Médio |
| 57 | **Encurtar apenas URLs HTTPS** (política) | Baixo | Médio |
| 58 | **Detecção de phishing via VirusTotal/GSB (opcional)** | Alto | Alto |

### F. Colaboração e operação

| # | Ideia | Esforço | Valor |
|---|---|---|---|
| 59 | **Workspaces/folders por campanha** | Baixo | Médio |
| 60 | **Papéis (owner/editor/viewer)** | Médio | Médio |
| 61 | **Notas/comentários por link** | Baixo | Baixo |
| 62 | **Link expirado → auto redirect para fallback** (campanha encerrada) | Baixo | Médio |
| 63 | **Health check do destino** (status up/down) | Médio | Médio |
| 64 | **Versionamento de destino** (histórico de alterações) | Médio | Alto (demo) |
| 65 | **Archiving (soft delete + restaurar)** | Baixo | Baixo |

### G. Gamificação Sir Curty (personagem, memorable)

| # | Ideia | Esforço | Valor |
|---|---|---|---|
| 66 | **Conquistas/badges** por uso (ex.: "Primeiro monstro cortado", "100 cliques") | Baixo | Alto |
| 67 | **Streak diário** de criação de links | Baixo | Médio |
| 68 | **"Chefe final" do dia** (link mais clicado destacado) | Baixo | Alto |
| 69 | **Leaderboard público** (opt-in) de links/campanhas | Baixo | Médio |
| 70 | **Skin/tema do mascote** desbloqueável por milestones | Médio | Alto (visual) |
| 71 | **Missão diária** (ex.: crie 3 links hoje) | Baixo | Médio |
| 72 | **Animação de "derrota"** do monstro ao consumir uso único | Baixo | Alto (demo) |

## 3) Recomendação de shortlist para o hackathon (prioridade)

### MVP obrigatório (núcleo + demo estável)
- Criar/listar/editar links por cookie anônimo/Google
- Redirect com interstitial
- Senha, expiração, uso único
- Vanity URLs
- Filtro de URLs suspeitas
- Ranking + tabela de estatísticas
- QR Code
- Traces FE→API→DB + dashboard core

### Quick wins (alto impacto, baixo esforço) — priorizar após MVP
- UTM builder
- Click caps (limite de cliques)
- Expiração por data/hora
- Language targeting
- Geo/device targeting básico
- Link por horário/dia
- Conquistas/badges simples
- 404 temática + animações
- OG preview (título/img) no interstitial
- Bot filtering nas métricas
- A/B testing simples (2 variantes)

### Stretch (se houver tempo/cluster folgado)
- CTA overlay (Sniply)
- Bio link (mini landing)
- Deep linking mobile
- Campaign folders/workspaces
- Versionamento de destino
- Retargeting pixels

### A evitar (fora de escopo inicial)
- Billing/planos, multi-tenant complexo, compliance enterprise (HIPAA/SOC2), self-hosted marketplace.

## 4) Como Sir Curty pode "contar história" com features

Sugestão de framing:
- **Geo/device targeting** → "Sir Curty escolhe a rota conforme o reino do viajante".
- **A/B testing** → "Torneio de espadas: duas rotas, uma vencedora".
- **Expiração/click cap** → "Feitiço temporário: o portal fecha após X incursões".
- **Uso único** → "Pergaminho consumido após a leitura".
- **Senha** → "Portão trancado; apenas quem conhece a combinação passa".
- **Filtro de URL suspeita** → "Sir Curty recusa a besta, pois cheira a feitiço negro".
- **CTA overlay** → "Sir Curty monta acampamento no território inimigo (seu banner no destino)".
- **Conquistas** → "Cavaleiro-leveling" por uso.

## 5) Perguntas para o squad (decisão)

1. Quais 3 features do "Quick wins" entram no pitch além do MVP?
2. Vamos implementar A/B testing ou priorizar geo-targeting? (escolher 1 como destaque)
3. QR Code analytics separado entra no MVP ou stretch?
4. OG preview (metadata) é viável no prazo (fetch + cache)?
5. Bio link "reino" entra como funcionalidade de destaque ou fica stretch?

## 6) Próxima atualização no planejamento

- Atualizar seção 3 com a lista curta de diferenciais (MVP + 3 quick wins).
- Adicionar à seção 6/8 os endpoints necessários (preview, metadata, geo/device, A/B).
- Refletir escolhas no `docs/pitch.md`.
