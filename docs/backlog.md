# Backlog & Requisitos Funcionais — Gestão de Atividades por Turma (Kanban)

## 1. Visão Geral

Sistema de gestão de atividades acadêmicas organizado em quadros Kanban por turma, onde professores e gestores de grupo criam e atribuem atividades, e os integrantes interagem com elas (movimentação, comentários, anexos).

---

## 2. Entidades Principais

| Entidade | Descrição |
|---|---|
| **Professor** | Cria turmas, define os quadros Kanban e seus estágios, cria/atribui atividades |
| **Turma** | Agrupamento principal; possui um quadro Kanban próprio |
| **Grupo** | Subdivisão de uma turma; possui integrantes |
| **Integrante** | Aluno pertencente a um grupo |
| **Gestor** | Integrante do grupo com permissão extra (criar/atribuir atividades) |
| **Quadro Kanban** | Um por turma; possui estágios (colunas) definidos pelo professor |
| **Estágio** | Coluna do quadro (ex: A Fazer, Em Andamento, Em Revisão, Concluído) — customizável por turma |
| **Atividade (Card)** | Unidade de trabalho, vinculada a um estágio |
| **Anexo** | Arquivo vinculado a uma atividade |
| **Comentário** | Mensagem no chat da atividade |

---

## 3. Perfis e Permissões (RBAC)

| Ação | Professor | Gestor | Integrante |
|---|:---:|:---:|:---:|
| Criar turma | ✅ | ❌ | ❌ |
| Criar/gerenciar grupos e integrantes | ✅ | ❌ | ❌ |
| Definir/editar estágios do quadro | ✅ | ❌ | ❌ |
| Criar atividade | ✅ | ✅ | ❌ |
| Atribuir responsável pela atividade | ✅ | ✅ | ❌ |
| Editar atividade (nome, datas, texto) | ✅ | ✅ (do próprio grupo) | ❌ |
| Mover atividade entre estágios | ✅ | ✅ | ✅ (se responsável) |
| Anexar arquivos | ✅ | ✅ | ✅ |
| Comentar no card | ✅ | ✅ | ✅ |
| Visualizar quadro da turma | ✅ | ✅ (do grupo) | ✅ (do grupo) |
| Visualizar quadros de todas as turmas | ✅ | ❌ | ❌ |

> ⚠️ Ponto a decidir: um Gestor pode editar/mover atividades de **outros grupos** da mesma turma, ou só do próprio grupo? (assumido acima: só do próprio grupo)

---

## 4. Requisitos Funcionais

### 4.1 Turmas
- **RF01** — O professor pode criar, editar e arquivar turmas.
- **RF02** — Cada turma possui um quadro Kanban único e independente.
- **RF03** — O professor pode duplicar a estrutura de estágios de uma turma para outra (reuso de template).

### 4.2 Grupos e Integrantes
- **RF04** — O professor pode criar grupos dentro de uma turma.
- **RF05** — O professor pode adicionar/remover integrantes de um grupo.
- **RF06** — O professor define quem é o Gestor de cada grupo (podendo trocar depois). Um mesmo integrante pode ser Gestor de mais de um grupo, inclusive em turmas diferentes.
- **RF07** — Um integrante pertence a apenas um grupo por turma.

### 4.3 Quadro Kanban e Estágios
- **RF08** — O professor define os estágios (colunas) do quadro de cada turma (nome, ordem, cor).
- **RF09** — O professor pode adicionar, renomear, reordenar ou remover estágios.
- **RF10** — Ao mover um card para um novo estágio, o sistema registra a **data de início naquele estágio** automaticamente.
- **RF11** — (Sugestão) O sistema pode calcular o tempo que o card ficou em cada estágio (histórico).

### 4.4 Atividades (Cards)
- **RF12** — Professor ou Gestor podem criar uma atividade dentro de um estágio do quadro da turma/grupo.
- **RF13** — Uma atividade contém: nome, data de início, data de criação (auto), data de início no estágio atual (auto), data de fim (prazo), responsável(is), criador (auto), texto orientativo, estágio atual.
- **RF14** — Integrantes **não podem criar** atividades, apenas interagir com as existentes.
- **RF15** — Uma atividade pode ter **um ou mais responsáveis**, atribuídos/reatribuídos pelo professor ou gestor.
- **RF16** — Uma atividade pode ter múltiplos anexos (arquivos).
- **RF16a** — Um card pode conter uma **lista de subtarefas/checklist** (itens marcáveis como concluído), visível e editável por professor, gestor e responsáveis pela atividade.
- **RF17** — Uma atividade possui um chat/mural de comentários, onde todos os envolvidos podem interagir.
- **RF18** — O sistema deve indicar visualmente atividades atrasadas (data de fim < hoje e não concluída).
- **RF19** — (Sugestão) Histórico/log de alterações da atividade (quem moveu, quando, de qual estágio para qual).
- **RF19a** — O quadro deve conter um estágio dedicado de **conclusão/aprovação** (ex: "Aguardando aprovação"), para o qual os alunos movem a atividade quando finalizam; a mudança para o estágio final de "Concluído" fica sob controle do professor/gestor.

### 4.5 Anexos
- **RF20** — Upload de arquivos (documentos, imagens, PDFs) vinculados a uma atividade.
- **RF21** — Qualquer integrante do grupo pode anexar arquivos ao card.
- **RF22** — (Sugestão) Limite de tamanho/tipo de arquivo configurável.
- **RF22a** — Anexos suportam **versionamento**: ao subir um novo arquivo com o mesmo nome/referência, o sistema mantém o histórico de versões anteriores, permitindo consultar/baixar versões antigas.

### 4.6 Comentários / Chat do Card
- **RF23** — Comentários em ordem cronológica, com autor e data/hora.
- **RF24** — (Sugestão) Menções (@aluno) para notificar integrantes específicos.

### 4.7 Visualização e Navegação
- **RF25** — Professor visualiza todos os quadros de todas as suas turmas.
- **RF26** — Gestor e Integrantes visualizam apenas o quadro da própria turma/grupo.
- **RF27** — Filtros no quadro: por responsável, por prazo, por status (atrasado/em dia).

### 4.8 Notificações (sugestão para versões futuras)
- **RF28** — Notificar responsável quando uma atividade é criada/atribuída a ele.
- **RF29** — Notificar quando o prazo está próximo do vencimento.
- **RF30** — Notificar quando há novo comentário no card.

### 4.9 Relatórios (sugestão para o professor)
- **RF31** — Dashboard com % de conclusão por grupo/turma.
- **RF32** — Relatório de atividades atrasadas por grupo.
- **RF33** — Exportação de relatório (PDF/Excel) de acompanhamento por turma.

---

## 5. MVP sugerido (primeira versão)

Escopo mínimo para validar o uso em sala de aula:

1. Turmas, Grupos e Integrantes, com Gestor podendo atuar em múltiplos grupos (RF01–RF07)
2. Quadro Kanban com estágios customizáveis, incluindo estágio de aprovação/conclusão (RF08–RF10, RF19a)
3. Criação/atribuição de atividades com múltiplos responsáveis e todos os campos de data (RF12–RF16)
4. Checklist/subtarefas no card (RF16a)
5. Anexos com versionamento (RF20–RF22a)
6. Comentários no card (RF23)
7. Permissões básicas (Professor / Gestor / Integrante)

**Deixar para depois:** notificações, relatórios avançados, log de histórico detalhado, exportação.

---

## 6. Decisões tomadas

| Questão | Decisão |
|---|---|
| Um integrante pode ser Gestor de mais de um grupo/turma? | **Sim** |
| Atividades podem ter subtarefas (checklist)? | **Sim** |
| Pode haver mais de um responsável por atividade? | **Sim** |
| Aprovação de conclusão pelo professor? | **Não é aprovação manual — haverá um estágio específico no quadro para isso** (ex: "Aguardando aprovação" antes de "Concluído") |
| Versionamento de arquivos anexados? | **Sim** |
