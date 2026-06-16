const COOKIE_NAME = 'qp_account'
const MAX_AGE_SEC = 7 * 24 * 60 * 60

function readCookie() {
  const prefix = `${COOKIE_NAME}=`
  const entry = document.cookie.split('; ').find((row) => row.startsWith(prefix))
  if (!entry) return null

  try {
    return JSON.parse(decodeURIComponent(entry.slice(prefix.length)))
  } catch {
    return null
  }
}

export function getAccountFromCookie() {
  const data = readCookie()
  if (!data || typeof data.displayName !== 'string' || !data.displayName.trim()) {
    return null
  }
  return {
    displayName: data.displayName.trim(),
    email: typeof data.email === 'string' ? data.email : '',
  }
}

export function setAccountCookie(account) {
  const displayName = account.displayName?.trim()
  if (!displayName) return

  const payload = encodeURIComponent(
    JSON.stringify({
      displayName,
      email: account.email?.trim() ?? '',
    })
  )
  document.cookie = `${COOKIE_NAME}=${payload}; path=/; max-age=${MAX_AGE_SEC}; SameSite=Lax`
}

export function clearAccountCookie() {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`
}
