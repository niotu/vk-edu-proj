# Архитектура VK Edu Quiz Platform (MVP)

Документ фиксирует целевую архитектуру, сущности БД, контракты REST и Socket.IO, user flow и критерии готовности этапов. Версия: **0.1** (этап 0 — контракты и границы MVP).

---

## 1. Цель MVP

Работоспособный прототип квиз-платформы, в котором:

| Роль | Возможности |
|------|-------------|
| **ORGANIZER** (организатор) | Регистрация, создание и настройка квиза, добавление вопросов, запуск live-сессии по коду комнаты, просмотр лидерборда |
| **MEMBER** (участник) | Регистрация, вход в комнату по коду, ответы на вопросы в реальном времени, просмотр результатов и истории участия |

**Вне MVP (v1.0):** соцсети, OAuth, загрузка файлов на S3, мультиязычность, админ-панель, рейтинги между организаторами, мобильные приложения.

---

## 2. Контекст системы

```mermaid
flowchart TB
  subgraph client [Клиент]
    Web["apps/web — React + Vite"]
  end

  subgraph backend [Backend]
    Auth["auth-service :3001"]
    Quiz["quiz-service :3002"]
  end

  subgraph data [Данные]
    PG_Auth[(PostgreSQL auth_db)]
    PG_Quiz[(PostgreSQL quiz_db)]
  end

  Web -->|REST + cookies| Auth
  Web -->|REST + Bearer JWT| Quiz
  Web -->|Socket.IO| Quiz
  Auth --> PG_Auth
  Quiz --> PG_Quiz
  Quiz -.->|JWT verify same secret| Auth
```

На этапе MVP допускается **одна физическая БД PostgreSQL** с двумя логическими базами (`auth_service`, `quiz_service`) или одной БД и двумя схемами — по усмотрению DevOps. Сервисы остаются раздельными по коду и деплою.

---

## 3. Репозиторий и сервисы

```
vk-edu-proj/
├── docs/
│   └── ARCHITECTURE.md      ← этот документ
├── apps/
│   └── web/                 ← React + Vite (этап 2+)
├── services/
│   ├── auth-service/        ← ✅ реализован
│   └── quiz-service/        ← этап 1+
├── agents-tasks/            ← роли команды (справочно)
└── TASK.md                  ← ТЗ платформы VK Edu
```

| Сервис | Порт | Статус | Ответственность |
|--------|------|--------|-----------------|
| `auth-service` | 3001 | **Реализован** | Пользователи, JWT, роли |
| `quiz-service` | 3002 | Запланирован | Квизы, вопросы, сессии, ответы, очки, Socket.IO |
| `apps/web` | 3000 | Запланирован | UI, роутинг, вызов API |

---

## 4. Технологический стек

| Слой | Технология |
|------|------------|
| Frontend | React 18+, Vite, TypeScript, React Router |
| HTTP API | Express 4, TypeScript |
| ORM | Prisma 5 |
| БД | PostgreSQL 16 |
| Auth | JWT (access + refresh httpOnly cookie) |
| Realtime | Socket.IO 4 (в `quiz-service`) |
| Пароли | bcrypt |
| Локальная инфра | Docker Compose |

---

## 5. Роли и права

| Prisma `Role` | UI-роль | Права |
|---------------|---------|-------|
| `MEMBER` | Участник | Join room, submit answers, view own history |
| `ORGANIZER` | Организатор | CRUD своих квизов, start/end session, show questions |

Проверка роли на защищённых маршрутах `quiz-service`:

- `requireAuth` — валидный access JWT.
- `requireOrganizer` — `role === ORGANIZER` в payload токена.

---

## 6. Модель данных

### 6.1. auth-service (реализовано)

```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  password_hash String
  role          Role     @default(MEMBER)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum Role { MEMBER, ORGANIZER }
```

`quiz-service` хранит только `organizerId` / `userId` как **UUID строки** без FK между базами (слабая связь через JWT `sub`).

### 6.2. quiz-service (целевая схема)

```mermaid
erDiagram
  Quiz ||--o{ Question : contains
  Question ||--o{ AnswerOption : has
  Quiz ||--o{ QuizSession : runs
  QuizSession ||--o{ SessionParticipant : includes
  QuizSession ||--o{ ParticipantAnswer : collects
  SessionParticipant ||--o{ ParticipantAnswer : submits
  QuizSession ||--o| QuizResult : produces

  Quiz {
    uuid id PK
    uuid organizerId
    string title
    string description
    string category
    int questionTimeSec
    enum status
    datetime createdAt
    datetime updatedAt
  }

  Question {
    uuid id PK
    uuid quizId FK
    int orderIndex
    enum type
    string text
    string imageUrl
    enum choiceMode
    int timeLimitSec
  }

  AnswerOption {
    uuid id PK
    uuid questionId FK
    string text
    boolean isCorrect
    int orderIndex
  }

  QuizSession {
    uuid id PK
    uuid quizId FK
    uuid organizerId
    string roomCode UK
    enum status
    uuid currentQuestionId
    datetime startedAt
    datetime endedAt
  }

  SessionParticipant {
    uuid id PK
    uuid sessionId FK
    uuid userId
    int totalScore
    datetime joinedAt
  }

  ParticipantAnswer {
    uuid id PK
    uuid sessionId FK
    uuid userId
    uuid questionId FK
    json selectedOptionIds
    boolean isCorrect
    int pointsAwarded
    datetime answeredAt
  }

  QuizResult {
    uuid id PK
    uuid sessionId FK UK
    json leaderboard
    datetime finishedAt
  }
```

#### Перечисления (enum)

| Enum | Значения | Назначение |
|------|----------|------------|
| `QuizStatus` | `DRAFT`, `PUBLISHED`, `ARCHIVED` | Жизненный цикл квиза |
| `QuestionType` | `TEXT`, `IMAGE` | Тип контента вопроса |
| `ChoiceMode` | `SINGLE`, `MULTIPLE` | Один или несколько правильных вариантов |
| `SessionStatus` | `LOBBY`, `ACTIVE`, `QUESTION_OPEN`, `QUESTION_CLOSED`, `FINISHED` | Состояние live-сессии |

#### Инварианты БД

1. `roomCode` — 6 символов, уникален среди активных сессий (`LOBBY` / `ACTIVE` / `QUESTION_*`).
2. Один ответ на пару `(sessionId, userId, questionId)` — уникальный индекс.
3. `AnswerOption.isCorrect` задаётся только организатором при создании квиза.
4. Баллы (`pointsAwarded`, `totalScore`) вычисляет **только сервер** при `answer:submit`.

---

## 7. Аутентификация (межсервисный контракт)

### 7.1. Токены

| Токен | Где | TTL (по умолчанию) | Payload |
|-------|-----|-------------------|---------|
| Access | `Authorization: Bearer <token>` | 1h | `{ sub, email, role }` |
| Refresh | httpOnly cookie `refreshToken`, path `/api/auth` | 7d | `{ sub }` |

**Обязательно:** одинаковые `JWT_SECRET` и `JWT_REFRESH_SECRET` в `auth-service` и `quiz-service` (или позже — отдельный endpoint introspection; в MVP — shared secret).

### 7.2. auth-service — реализованные endpoints

Базовый URL: `http://localhost:3001`

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| GET | `/health` | — | Статус сервиса и PostgreSQL |
| POST | `/api/auth/register` | — | Регистрация |
| POST | `/api/auth/login` | — | Вход |
| POST | `/api/auth/refresh` | cookie | Новый access token |
| POST | `/api/auth/logout` | — | Очистка refresh cookie |
| GET | `/api/auth/me` | Bearer | Профиль текущего пользователя |

#### POST `/api/auth/register`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secret12",
  "role": "ORGANIZER"
}
```
`role` опционален, по умолчанию `MEMBER`.

**Response 201:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "ORGANIZER",
      "createdAt": "2026-06-05T00:00:00.000Z",
      "updatedAt": "2026-06-05T00:00:00.000Z"
    },
    "accessToken": "eyJ..."
  },
  "timestamp": "2026-06-05T00:00:00.000Z"
}
```

#### POST `/api/auth/login`

**Request:** `{ "email", "password" }`  
**Response 200:** как register (без смены структуры).

#### GET `/api/auth/me`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "user": { "id", "email", "role", "createdAt", "updatedAt" }
  },
  "timestamp": "..."
}
```

### 7.3. Формат ошибок (общий для всех сервисов)

```json
{
  "success": false,
  "message": "Human readable message",
  "code": "ERROR_CODE",
  "statusCode": 400,
  "timestamp": "2026-06-05T00:00:00.000Z"
}
```

| HTTP | Типичные `code` |
|------|-----------------|
| 400 | `INVALID_EMAIL`, `INVALID_PASSWORD`, `INVALID_ROLE` |
| 401 | `INVALID_CREDENTIALS`, `MISSING_TOKEN`, `INVALID_TOKEN` |
| 403 | `FORBIDDEN` |
| 404 | `ROUTE_NOT_FOUND`, `USER_NOT_FOUND`, `QUIZ_NOT_FOUND` |
| 409 | `EMAIL_EXISTS` |
| 500 | `INTERNAL_ERROR` |

---

## 8. quiz-service — REST API (контракт, этап 1+)

Базовый URL: `http://localhost:3002`  
Префикс: `/api`  
Все маршруты ниже, кроме `/health` и публичного join preview, требуют `Authorization: Bearer <accessToken>`.

### 8.1. Health

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/health` | Статус + PostgreSQL |

### 8.2. Quizzes (ORGANIZER)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/quizzes` | Список квизов текущего организатора |
| POST | `/api/quizzes` | Создать квиз (DRAFT) |
| GET | `/api/quizzes/:id` | Детали квиза + вопросы |
| PATCH | `/api/quizzes/:id` | Обновить метаданные |
| DELETE | `/api/quizzes/:id` | Удалить (только DRAFT) |
| POST | `/api/quizzes/:id/publish` | Статус → PUBLISHED |

**POST `/api/quizzes` — Request:**
```json
{
  "title": "Викторина по истории",
  "description": "10 вопросов",
  "category": "history",
  "questionTimeSec": 30
}
```

### 8.3. Questions (ORGANIZER, владелец квиза)

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/quizzes/:quizId/questions` | Добавить вопрос |
| PATCH | `/api/questions/:id` | Изменить вопрос |
| DELETE | `/api/questions/:id` | Удалить вопрос |
| PUT | `/api/questions/:id/options` | Заменить варианты ответа |

**POST question — Request:**
```json
{
  "orderIndex": 0,
  "type": "TEXT",
  "text": "В каком году...?",
  "imageUrl": null,
  "choiceMode": "SINGLE",
  "timeLimitSec": 30,
  "options": [
    { "text": "1945", "isCorrect": true, "orderIndex": 0 },
    { "text": "1939", "isCorrect": false, "orderIndex": 1 }
  ]
}
```

### 8.4. Sessions (live)

| Метод | Путь | Роль | Описание |
|-------|------|------|----------|
| POST | `/api/sessions` | ORGANIZER | Создать сессию (`roomCode` генерируется) |
| GET | `/api/sessions/by-code/:roomCode` | Auth | Инфо о комнате (название квиза, статус) |
| POST | `/api/sessions/:id/join` | MEMBER+ | Войти в комнату |
| POST | `/api/sessions/:id/start` | ORGANIZER | Старт квиза |
| POST | `/api/sessions/:id/questions/:questionId/show` | ORGANIZER | Показать вопрос |
| POST | `/api/sessions/:id/questions/close` | ORGANIZER | Закрыть приём ответов |
| POST | `/api/sessions/:id/end` | ORGANIZER | Завершить, сохранить результат |
| GET | `/api/sessions/:id/leaderboard` | Auth | Текущий лидерборд |
| POST | `/api/sessions/:id/answers` | MEMBER | Отправить ответ (дублирует WS для надёжности) |

**POST `/api/sessions/:id/answers` — Request:**
```json
{
  "questionId": "uuid",
  "selectedOptionIds": ["uuid-option-1"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isCorrect": true,
    "pointsAwarded": 100,
    "totalScore": 300
  },
  "timestamp": "..."
}
```

### 8.5. History

| Метод | Путь | Роль | Описание |
|-------|------|------|----------|
| GET | `/api/history/organized` | ORGANIZER | Проведённые квизы |
| GET | `/api/history/participated` | MEMBER | Участие в сессиях |
| GET | `/api/history/sessions/:sessionId` | Auth | Детали + leaderboard snapshot |

---

## 9. Socket.IO — контракт событий (quiz-service)

**URL:** `http://localhost:3002`  
**Namespace:** `/` (default)  
**Auth при connect:** `auth: { token: "<accessToken>" }` в handshake.

### 9.1. Client → Server

| Событие | Payload | Кто | Описание |
|---------|---------|-----|----------|
| `room:join` | `{ roomCode: string }` | Все | Войти в Socket-room `room:<code>` |
| `session:start` | `{ sessionId: string }` | ORGANIZER | Старт (дубль REST) |
| `question:show` | `{ sessionId, questionId }` | ORGANIZER | Открыть вопрос + серверный таймер |
| `question:close` | `{ sessionId }` | ORGANIZER | Закрыть приём ответов |
| `answer:submit` | `{ sessionId, questionId, selectedOptionIds: string[] }` | MEMBER | Ответ участника |
| `session:end` | `{ sessionId }` | ORGANIZER | Финиш и лидерборд |

### 9.2. Server → Client (broadcast в `room:<code>`)

| Событие | Payload | Когда |
|---------|---------|-------|
| `room:state` | `{ session, participantsCount }` | После join / изменения лобби |
| `session:started` | `{ sessionId, quizTitle }` | Старт квиза |
| `question:opened` | `{ question, options, endsAt }` | Вопрос открыт; `endsAt` — ISO, **серверное время** |
| `question:closed` | `{ questionId }` | Время вышло или организатор закрыл |
| `answer:received` | `{ userId, questionId }` | Уведомление организатору (без правильности) |
| `leaderboard:update` | `{ entries: [{ userId, score, rank }] }` | После закрытия вопроса или конца сессии |
| `session:finished` | `{ leaderboard, resultId }` | Квиз завершён |
| `error` | `{ code, message }` | Ошибка валидации / прав |

### 9.3. Правила realtime

1. Таймер вопроса запускает **сервер**; клиент только отображает `endsAt`.
2. `answer:submit` принимается только при `SessionStatus === QUESTION_OPEN` и `now < endsAt`.
3. Повторный ответ на тот же вопрос отклоняется (`ANSWER_ALREADY_SUBMITTED`).
4. После `question:close` ответы не принимаются (`QUESTION_CLOSED`).
5. Лидерборд пересчитывается на сервере; клиент не суммирует баллы самостоятельно.

### 9.4. Подсчёт баллов (MVP)

| Условие | Очки |
|---------|------|
| `SINGLE` + верный вариант | 100 |
| `MULTIPLE` + все верные и ни одного лишнего | 100 |
| Иначе | 0 |

Бонус за скорость — **вне MVP**.

---

## 10. User flow

### 10.1. Организатор

```mermaid
sequenceDiagram
  participant O as Organizer
  participant Web as apps/web
  participant Auth as auth-service
  participant Quiz as quiz-service

  O->>Web: Регистрация role=ORGANIZER
  Web->>Auth: POST /api/auth/register
  O->>Web: Создать квиз + вопросы
  Web->>Quiz: CRUD /api/quizzes
  O->>Web: Запустить сессию
  Web->>Quiz: POST /api/sessions
  Quiz-->>O: roomCode
  O->>Web: Start + Show questions
  Web->>Quiz: Socket question:show / REST
  Quiz-->>O: leaderboard:update
```

### 10.2. Участник

```mermaid
sequenceDiagram
  participant P as Participant
  participant Web as apps/web
  participant Auth as auth-service
  participant Quiz as quiz-service

  P->>Web: Вход
  Web->>Auth: POST /api/auth/login
  P->>Web: Ввести room code
  Web->>Quiz: POST join + Socket room:join
  Quiz-->>P: room:state
  Quiz-->>P: question:opened
  P->>Quiz: answer:submit
  Quiz-->>P: leaderboard:update
  Quiz-->>P: session:finished
```

---

## 11. apps/web — маршруты (контракт UI)

| Путь | Доступ | Экран |
|------|--------|-------|
| `/login` | Public | Вход |
| `/register` | Public | Регистрация (выбор роли) |
| `/` | Auth | Редирект по роли |
| `/organizer/quizzes` | ORGANIZER | Список квизов |
| `/organizer/quizzes/new` | ORGANIZER | Создание квиза |
| `/organizer/quizzes/:id/edit` | ORGANIZER | Редактор вопросов |
| `/organizer/sessions/:id/host` | ORGANIZER | Панель ведущего + WS |
| `/join` | Auth | Ввод кода комнаты |
| `/play/:roomCode` | Auth | Экран участника + WS |
| `/results/:sessionId` | Auth | Лидерборд |
| `/history` | Auth | История (вкладки по роли) |

Состояния экранов (по UI/UX brief): `loading`, `empty`, `error`, `success` — обязательны для MVP-экранов join и host.

---

## 12. Переменные окружения

### auth-service (`.env`)

| Переменная | Пример | Описание |
|------------|--------|----------|
| `DATABASE_URL` | `postgresql://authuser:***@localhost:5432/auth_service` | PostgreSQL |
| `JWT_SECRET` | random string | Подпись access token |
| `JWT_REFRESH_SECRET` | random string | Подпись refresh token |
| `JWT_EXPIRY` | `1h` | TTL access |
| `JWT_REFRESH_EXPIRY` | `7d` | TTL refresh |
| `PORT` | `3001` | HTTP порт |
| `CORS_ORIGIN` | `http://localhost:3000` | Origin фронтенда |

### quiz-service (`.env`, этап 1+)

| Переменная | Пример | Описание |
|------------|--------|----------|
| `DATABASE_URL` | `postgresql://...@localhost:5432/quiz_service` | PostgreSQL |
| `JWT_SECRET` | **тот же, что auth** | Верификация Bearer |
| `PORT` | `3002` | HTTP + Socket.IO |
| `CORS_ORIGIN` | `http://localhost:3000` | CORS |
| `ROOM_CODE_LENGTH` | `6` | Длина кода комнаты |

### apps/web (`.env`)

| Переменная | Пример |
|------------|--------|
| `VITE_AUTH_API_URL` | `http://localhost:3001` |
| `VITE_QUIZ_API_URL` | `http://localhost:3002` |

---

## 13. Безопасность (MVP)

1. Пароли только в виде bcrypt-хеша; не логировать `password` и токены.
2. Refresh token — только httpOnly cookie, не в `localStorage`.
3. Access token — в памяти / `sessionStorage` (на выбор фронта; предпочтительно память).
4. Организатор может менять только свои квизы (`organizerId === jwt.sub`).
5. Участник может отвечать только от своего `userId`.
6. Rate limit — вне MVP, рекомендуется перед публичным деплоем.

---

## 14. Локальный запуск (целевой)

```bash
# PostgreSQL
cd services/auth-service && docker compose up -d

# Auth
cd services/auth-service
npm install && npm run prisma:migrate:deploy && npm run dev

# Quiz (после реализации)
cd services/quiz-service
npm install && npm run prisma:migrate:deploy && npm run dev

# Frontend (после реализации)
cd apps/web
npm install && npm run dev
```

---

## 15. Этапы и критерии готовности

| Этап | Содержание | Критерий приёмки |
|------|------------|------------------|
| **0** | ARCHITECTURE.md, .gitignore | Документ согласован; контракты REST/WS зафиксированы |
| **1** | quiz-service + Prisma | CRUD квиза с вопросами через curl/Postman |
| **2** | apps/web auth + dashboard | Регистрация/вход; разный home для ролей |
| **3** | UI редактора квиза | Квиз создаётся из браузера |
| **4** | Socket.IO live | 1 организатор + 2 участника, синхронный вопрос |
| **5** | Лидерборд + QuizResult | Итог виден всем; данные в БД после рестарта |
| **6** | История + README + compose | История в UI; полный локальный сценарий в README |
| **7** | Сдача | Записка, ссылки Figma + репозиторий |

---

## 16. Зависимости между этапами

```mermaid
flowchart LR
  E0[Этап 0 Контракты]
  E1[Этап 1 quiz-service]
  E2[Этап 2 web auth]
  E3[Этап 3 редактор]
  E4[Этап 4 realtime]
  E5[Этап 5 лидерборд]
  E6[Этап 6 история]

  E0 --> E1
  E1 --> E2
  E2 --> E3
  E3 --> E4
  E4 --> E5
  E5 --> E6
```

Параллельно с E1–E3 можно готовить wireframes в Figma (не блокирует backend).

---

## 17. Ссылки на артефакты сдачи (заполнить позже)

| Артефакт | URL |
|----------|-----|
| Miro | _TBD_ |
| Figma | _TBD_ |
| Репозиторий | _TBD_ |
| Демо (опционально) | _TBD_ |

---

## 18. История изменений документа

| Версия | Дата | Изменения |
|--------|------|-----------|
| 0.1 | 2026-06-05 | Первая фиксация архитектуры MVP (этап 0) |
