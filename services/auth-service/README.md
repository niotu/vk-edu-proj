# Auth Service

Микросервис аутентификации для квиз-платформы: регистрация, вход, JWT, роли MEMBER и ORGANIZER, PostgreSQL через Prisma.

## Быстрый старт

### 1. PostgreSQL (Docker)

```bash
cd services/auth-service
docker compose up -d
```

### 2. Зависимости и миграции

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
```

### 3. Запуск

```bash
npm run dev
```

Сервис: http://localhost:3001

## Проверка

### Health (включая БД)

```bash
curl http://localhost:3001/health
```

### Регистрация организатора

```bash
curl -X POST http://localhost:3001/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"organizer@example.com\",\"password\":\"secret12\",\"role\":\"ORGANIZER\"}"
```

### Вход

```bash
curl -X POST http://localhost:3001/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"organizer@example.com\",\"password\":\"secret12\"}"
```

Сохраните `accessToken` из ответа.

### Профиль

```bash
curl http://localhost:3001/api/auth/me ^
  -H "Authorization: Bearer <accessToken>"
```

## API

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/health` | Статус сервиса и подключения к PostgreSQL |
| POST | `/api/auth/register` | Регистрация (`email`, `password`, `role?`) |
| POST | `/api/auth/login` | Вход |
| POST | `/api/auth/refresh` | Обновление access token (cookie `refreshToken`) |
| POST | `/api/auth/logout` | Выход |
| GET | `/api/auth/me` | Текущий пользователь (Bearer token) |

## Переменные окружения

Скопируйте `.env.example` в `.env` или используйте существующий `.env`.

```
DATABASE_URL=postgresql://authuser:authpassword@localhost:5432/auth_service?schema=public
JWT_SECRET=...
JWT_REFRESH_SECRET=...
PORT=3001
```

## Скрипты

- `npm run dev` — разработка (ts-node)
- `npm run build` / `npm start` — production
- `npm run prisma:migrate` — миграции в dev
- `npm run prisma:migrate:deploy` — применить миграции
- `npm run prisma:studio` — GUI для БД
