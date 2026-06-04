# Quiz Service

CRUD квизов, live-сессии, Socket.IO, лидерборд и история для VK Edu Quiz Platform.

## Требования

- Node.js 18+
- PostgreSQL (тот же сервер, что у `auth-service`)
- **Тот же `JWT_SECRET`**, что в `auth-service`

## Подготовка БД

**Вариант A — Docker (тот же контейнер, что у auth-service):**

```powershell
npm run db:create
```

**Вариант B — вручную в PostgreSQL:**

```sql
CREATE DATABASE quiz_service OWNER authuser;
```

Скопируйте `JWT_SECRET` из `services/auth-service/.env` — значения должны совпадать.

`DATABASE_URL` — те же `user`/`password`/`host`, что у auth, но база `quiz_service`:

```
postgresql://authuser:ВАШ_ПАРОЛЬ@localhost:5432/quiz_service?schema=public
```

## Установка

```powershell
cd services\quiz-service
copy .env.example .env
# DATABASE_URL + JWT_SECRET как в auth-service

npm install
npm run db:create
npm run prisma:generate
npm run prisma:migrate:deploy
npm run dev
```

Сервис: http://localhost:3002

## API

Заголовок для защищённых маршрутов: `Authorization: Bearer <accessToken>`.

### Квизы (ORGANIZER)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/health` | Статус + БД + Socket.IO |
| GET | `/api/quizzes` | Список квизов |
| POST | `/api/quizzes` | Создать квиз (DRAFT) |
| GET | `/api/quizzes/:id` | Квиз с вопросами |
| PATCH | `/api/quizzes/:id` | Обновить метаданные |
| DELETE | `/api/quizzes/:id` | Удалить (только DRAFT) |
| POST | `/api/quizzes/:id/publish` | Опубликовать |
| POST | `/api/quizzes/:quizId/questions` | Добавить вопрос |
| PATCH | `/api/questions/:id` | Изменить вопрос |
| DELETE | `/api/questions/:id` | Удалить вопрос |
| PUT | `/api/questions/:id/options` | Заменить варианты |

### Live-сессии

| Метод | Путь | Роль | Описание |
|-------|------|------|----------|
| POST | `/api/sessions` | ORGANIZER | Создать комнату (`roomCode`) |
| GET | `/api/sessions/by-code/:roomCode` | Auth | Инфо о комнате |
| POST | `/api/sessions/:id/join` | Auth | Войти в комнату |
| POST | `/api/sessions/:id/start` | ORGANIZER | Старт квиза |
| POST | `/api/sessions/:id/questions/:questionId/show` | ORGANIZER | Показать вопрос |
| POST | `/api/sessions/:id/questions/close` | ORGANIZER | Закрыть вопрос |
| POST | `/api/sessions/:id/answers` | Auth | Отправить ответ |
| GET | `/api/sessions/:id/leaderboard` | Auth | Лидерборд |
| POST | `/api/sessions/:id/end` | ORGANIZER | Завершить квиз |

### История

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/history/organized` | ORGANIZER — проведённые сессии |
| GET | `/api/history/participated` | Участие пользователя |
| GET | `/api/history/sessions/:sessionId` | Детали сессии |

## Socket.IO

Подключение: `http://localhost:3002`, handshake: `auth: { token: "<accessToken>" }`.

**Клиент → сервер:** `room:join`, `session:start`, `question:show`, `question:close`, `answer:submit`, `session:end`

**Сервер → комната:** `room:state`, `session:started`, `question:opened`, `question:closed`, `leaderboard:update`, `session:finished`, `error`

## Проверка сценария

```powershell
# 1. Токен организатора (auth-service :3001)
$auth = Invoke-RestMethod -Method POST -Uri "http://localhost:3001/api/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"organizer@example.com","password":"secret12"}'
$token = $auth.data.accessToken

# 2. Создать квиз
$headers = @{ Authorization = "Bearer $token" }
$quiz = Invoke-RestMethod -Method POST -Uri "http://localhost:3002/api/quizzes" `
  -Headers $headers -ContentType "application/json" `
  -Body '{"title":"История","category":"history","questionTimeSec":30}'

# 3. Добавить вопрос
$quizId = $quiz.data.quiz.id
Invoke-RestMethod -Method POST -Uri "http://localhost:3002/api/quizzes/$quizId/questions" `
  -Headers $headers -ContentType "application/json" `
  -Body '{"orderIndex":0,"type":"TEXT","text":"Год окончания WWII?","choiceMode":"SINGLE","options":[{"text":"1945","isCorrect":true,"orderIndex":0},{"text":"1939","isCorrect":false,"orderIndex":1}]}'

# 4. Опубликовать
Invoke-RestMethod -Method POST -Uri "http://localhost:3002/api/quizzes/$quizId/publish" -Headers $headers

# 5. Создать live-сессию
$session = Invoke-RestMethod -Method POST -Uri "http://localhost:3002/api/sessions" `
  -Headers $headers -ContentType "application/json" -Body "{`"quizId`":`"$quizId`"}"
$session.data.session.roomCode
```

## Скрипты

- `npm run dev` — разработка
- `npm run build` / `npm start` — production
- `npm run prisma:studio` — просмотр БД
