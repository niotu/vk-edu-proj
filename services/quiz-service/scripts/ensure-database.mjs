import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(__dirname, 'create-database.sql');

try {
  execSync(`docker exec -i auth-service-postgres psql -U authuser -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'quiz_service'"`, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const out = execSync(
    `docker exec auth-service-postgres psql -U authuser -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'quiz_service'"`,
    { encoding: 'utf8' }
  ).trim();
  if (out !== '1') {
    execSync(`docker exec auth-service-postgres psql -U authuser -d postgres -c "CREATE DATABASE quiz_service;"`, {
      stdio: 'inherit',
    });
    console.log('Created database quiz_service');
  } else {
    console.log('Database quiz_service already exists');
  }
} catch (err) {
  console.error('Docker postgres not available. Create database manually:');
  console.error(fs.readFileSync(sqlPath, 'utf8'));
  process.exit(1);
}
