const authBaseUrl = import.meta.env.VITE_AUTH_API_URL || '';
const quizBaseUrl = import.meta.env.VITE_QUIZ_API_URL || '';

async function parseResponse(response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.message || payload?.error?.message || response.statusText || 'Unexpected error';
    throw new Error(message);
  }
  return payload?.data ?? payload;
}

async function request(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });

  return parseResponse(response);
}

function authUrl(path) {
  return authBaseUrl ? authBaseUrl + path : path;
}

function quizUrl(path) {
  return quizBaseUrl ? quizBaseUrl + path : path;
}

function authHeaders(accessToken) {
  return accessToken ? { Authorization: 'Bearer ' + accessToken } : {};
}

export async function registerUser({ name, email, password, role }) {
  return request(authUrl('/api/auth/register'), {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role }),
  });
}

export async function loginUser({ email, password }) {
  return request(authUrl('/api/auth/login'), {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function refreshSession() {
  return request(authUrl('/api/auth/refresh'), { method: 'POST' });
}

export async function logoutUser() {
  return request(authUrl('/api/auth/logout'), { method: 'POST' });
}

export async function getProfile(accessToken) {
  return request(authUrl('/api/auth/me'), { headers: authHeaders(accessToken) });
}

export async function listQuizzes(accessToken) {
  return request(quizUrl('/api/quizzes'), { headers: authHeaders(accessToken) });
}

export async function getQuiz(accessToken, quizId) {
  return request(quizUrl('/api/quizzes/' + quizId), { headers: authHeaders(accessToken) });
}

export async function createQuiz(accessToken, quizData) {
  return request(quizUrl('/api/quizzes'), {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(quizData),
  });
}

export async function deleteQuiz(accessToken, quizId) {
  return request(quizUrl('/api/quizzes/' + quizId), {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  });
}

export async function publishQuiz(accessToken, quizId) {
  return request(quizUrl('/api/quizzes/' + quizId + '/publish'), {
    method: 'POST',
    headers: authHeaders(accessToken),
  });
}

export async function createSession(accessToken, quizId) {
  return request(quizUrl('/api/sessions'), {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ quizId }),
  });
}

export async function findSessionByRoomCode(accessToken, roomCode) {
  return request(quizUrl('/api/sessions/by-code/' + roomCode), {
    headers: authHeaders(accessToken),
  });
}

export async function joinSession(accessToken, sessionId) {
  return request(quizUrl('/api/sessions/' + sessionId + '/join'), {
    method: 'POST',
    headers: authHeaders(accessToken),
  });
}

export async function startSession(accessToken, sessionId) {
  return request(quizUrl('/api/sessions/' + sessionId + '/start'), {
    method: 'POST',
    headers: authHeaders(accessToken),
  });
}

export async function showQuestion(accessToken, sessionId, questionId) {
  return request(quizUrl('/api/sessions/' + sessionId + '/questions/' + questionId + '/show'), {
    method: 'POST',
    headers: authHeaders(accessToken),
  });
}

export async function closeQuestion(accessToken, sessionId) {
  return request(quizUrl('/api/sessions/' + sessionId + '/questions/close'), {
    method: 'POST',
    headers: authHeaders(accessToken),
  });
}

export async function submitAnswer(accessToken, sessionId, questionId, selectedOptionIds) {
  return request(quizUrl('/api/sessions/' + sessionId + '/answers'), {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ questionId, selectedOptionIds }),
  });
}

export async function getLeaderboard(accessToken, sessionId) {
  return request(quizUrl('/api/sessions/' + sessionId + '/leaderboard'), {
    headers: authHeaders(accessToken),
  });
}

export async function getSessionState(accessToken, sessionId) {
  return request(quizUrl('/api/sessions/' + sessionId + '/state'), {
    headers: authHeaders(accessToken),
  });
}

export async function endSession(accessToken, sessionId) {
  return request(quizUrl('/api/sessions/' + sessionId + '/end'), {
    method: 'POST',
    headers: authHeaders(accessToken),
  });
}

export async function getOrganizedHistory(accessToken) {
  return request(quizUrl('/api/history/organized'), { headers: authHeaders(accessToken) });
}

export async function getParticipatedHistory(accessToken) {
  return request(quizUrl('/api/history/participated'), { headers: authHeaders(accessToken) });
}

export async function getSessionHistoryDetail(accessToken, sessionId) {
  return request(quizUrl('/api/history/sessions/' + sessionId), {
    headers: authHeaders(accessToken),
  });
}
