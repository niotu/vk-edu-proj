-- Выполнить под суперпользователем PostgreSQL (postgres)
CREATE DATABASE quiz_service OWNER authuser;

\c quiz_service
GRANT ALL ON SCHEMA public TO authuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authuser;
