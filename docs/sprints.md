# Plano de Sprints — Kanban de Turmas

Baseado em `docs/backlog.md`. Sprints organizadas como **fatias verticais** (backend + frontend juntos), na ordem em que as entidades dependem umas das outras: Auth → Turma → Grupo → Estágio → Atividade → interações do card (checklist, anexos, comentários) → refinamentos de visualização. Notificações e relatórios (RF28–RF33) ficam fora do MVP, em uma fase posterior.

Duração de sprint assumida: **2 semanas** (ajustável). Cada sprint lista objetivo, RFs cobertos e ações de backend/frontend.

---

## Sprint 0 — Fundação técnica ✅ (concluída)
**Objetivo:** ambiente rodando localmente.
- Scaffold Next.js + FastAPI + PostgreSQL (docker-compose)
- Modelos SQLAlchemy de todas as entidades do backlog
- Migração inicial do Alembic aplicada

---

## Sprint 1 — Autenticação & Turmas ✅ (concluída)
**Objetivo:** professor consegue logar e gerenciar suas turmas.
**RFs:** RF01, RF02, RF03

**Backend**
- Endpoint de login (JWT) e hash de senha
- Dependency de autenticação/autorização por role (`professor` vs `aluno`) para uso nos próximos sprints
- Script de seed (criar professor inicial)
- CRUD de Turma (criar, editar, arquivar) restrito a `professor`
- Endpoint de duplicar estrutura de estágios de uma turma para outra (RF03) — pode ficar como stub até Sprint 3, quando Estágio existir de fato

**Frontend**
- Tela de login
- Listagem de turmas do professor
- Criar/editar/arquivar turma

---

## Sprint 2 — Grupos & Integrantes ✅ (concluída)
**Objetivo:** professor organiza a turma em grupos e define gestores.
**RFs:** RF04, RF05, RF06, RF07

**Backend**
- CRUD de Grupo dentro de uma Turma
- Adicionar/remover integrantes de um grupo
- Definir/trocar Gestor do grupo (`GrupoMembro.is_gestor`)
- Validação: integrante pertence a apenas 1 grupo por turma (RF07)

**Frontend**
- Tela de gestão de grupos dentro da turma (criar grupo, adicionar/remover membros, marcar gestor)

---

## Sprint 3 — Quadro Kanban & Estágios
**Objetivo:** o quadro existe e tem colunas customizáveis, incluindo o estágio de aprovação.
**RFs:** RF03 (completar), RF08, RF09, RF19a

**Backend**
- CRUD de Estágio (nome, ordem, cor) restrito a `professor`
- Reordenar estágios
- Flag `is_conclusao` para o estágio de "Aguardando aprovação" / regra de que só professor/gestor move para o estágio final "Concluído"
- Implementar de fato a duplicação de template de estágios entre turmas (RF03)
- Endpoint que retorna o board completo (estágios + cards) de uma turma/grupo

**Frontend**
- Tela de configuração de estágios (professor): criar, renomear, reordenar, remover
- Renderização do quadro Kanban (colunas), ainda sem cards reais

---

## Sprint 4 — Atividades (Cards): criação e atribuição
**Objetivo:** professor/gestor criam e atribuem atividades com todos os campos.
**RFs:** RF12, RF13, RF14, RF15

**Backend**
- CRUD de Atividade (nome, texto, data_inicio, data_fim), `criador_id` automático
- Atribuição de um ou mais responsáveis (`AtividadeResponsavel`)
- RBAC: só `professor`/`gestor do grupo` cria/edita/atribui; integrante não cria (RF14)

**Frontend**
- Modal/tela de criação de atividade (professor/gestor)
- Card no quadro exibindo nome, prazo, responsáveis
- Modal de detalhes do card (visualização)

---

## Sprint 5 — Movimentação de cards, histórico e RBAC de movimentação
**Objetivo:** cards se movem entre estágios com as regras corretas e ficam auditáveis.
**RFs:** RF10, RF11, RF18, RF19

**Backend**
- Endpoint de mover atividade de estágio, atualizando `data_inicio_estagio` automaticamente (RF10)
- Registro em `AtividadeHistorico` a cada movimentação (RF19)
- Cálculo de tempo em cada estágio a partir do histórico (RF11)
- RBAC: integrante só move card do qual é responsável; gestor só do próprio grupo

**Frontend**
- Drag-and-drop entre colunas (ex: `dnd-kit`)
- Indicador visual de atividade atrasada (RF18: `data_fim < hoje` e não concluída)

---

## Sprint 6 — Checklist do card
**Objetivo:** subtarefas dentro da atividade.
**RFs:** RF16a

**Backend**
- CRUD de `ChecklistItem` (criar, marcar concluído, reordenar, remover)
- Permissão: professor, gestor e responsáveis pela atividade

**Frontend**
- Lista de checklist dentro do modal de detalhes do card, com checkboxes

---

## Sprint 7 — Anexos com versionamento
**Objetivo:** upload de arquivos no card, com histórico de versões.
**RFs:** RF16, RF20, RF21, RF22, RF22a

**Backend**
- Upload de arquivo vinculado a uma Atividade (`Anexo` + `AnexoVersao`)
- Novo upload com mesma referência gera nova versão, mantendo as anteriores
- Definir estratégia de storage (disco local para MVP; abstrair para trocar por S3/Blob depois)
- Limite de tamanho/tipo configurável (RF22)

**Frontend**
- Upload de arquivo no card
- Listagem de anexos com histórico de versões (baixar versão antiga)

---

## Sprint 8 — Comentários / Chat do card
**Objetivo:** interação assíncrona no card.
**RFs:** RF17, RF23

**Backend**
- CRUD de Comentário (criar, listar em ordem cronológica)
- Permissão: qualquer envolvido no grupo/atividade

**Frontend**
- Mural de comentários dentro do modal do card, com autor e data/hora

---

## Sprint 9 — Visualização, navegação e filtros
**Objetivo:** experiência de uso completa por perfil.
**RFs:** RF25, RF26, RF27

**Backend**
- Endpoint "meus quadros" retornando todas as turmas para professor, e apenas a turma/grupo do usuário para gestor/integrante
- Filtros de atividades por responsável, prazo e status (atrasado/em dia)

**Frontend**
- Navegação entre turmas (professor) vs. quadro único (gestor/integrante)
- Barra de filtros no quadro

---

## Backlog pós-MVP (não planejado em sprint ainda)
Fora do escopo do MVP (seção 5 do backlog), para priorizar depois que o core estiver validado em sala de aula:
- **RF24** — Menções (@aluno) nos comentários
- **RF28–RF30** — Notificações (atribuição, prazo próximo, novo comentário)
- **RF31–RF33** — Dashboard de conclusão, relatório de atrasados, exportação PDF/Excel

---

## Dependências entre sprints (visão rápida)

```
Sprint 1 (Auth+Turma)
   └─> Sprint 2 (Grupo)
         └─> Sprint 3 (Estágio/Quadro)
               └─> Sprint 4 (Atividade: criar/atribuir)
                     └─> Sprint 5 (mover/histórico/RBAC)
                           ├─> Sprint 6 (Checklist)
                           ├─> Sprint 7 (Anexos)
                           └─> Sprint 8 (Comentários)
                                 └─> Sprint 9 (Filtros/Navegação)
```

Sprints 6, 7 e 8 são independentes entre si e podem ser reordenadas ou paralelizadas se houver mais de uma pessoa disponível.
