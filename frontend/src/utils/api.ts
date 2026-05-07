// API utility functions untuk komunikasi dengan backend

const API_BASE_URL = '/api'

interface FetchOptions {
  token?: string
}

async function apiFetch(
  endpoint: string,
  options: RequestInit & FetchOptions = {}
): Promise<Response> {
  const { token, ...fetchOptions } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (fetchOptions.headers && typeof fetchOptions.headers === 'object') {
    Object.assign(headers, fetchOptions.headers)
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  })

  return response
}

export async function getContacts(
  token: string
): Promise<{ email: string; username: string }[]> {
  const response = await apiFetch('/contacts', {
    method: 'GET',
    token,
  })

  if (!response.ok) {
    throw new Error('Gagal mengambil daftar kontak')
  }

  return response.json()
}

export async function getPublicKey(email: string, token: string): Promise<{ public_key: string }> {
  const response = await apiFetch(`/users/${encodeURIComponent(email)}/public-key`, {
    method: 'GET',
    token,
  })

  if (!response.ok) {
    throw new Error('Gagal mengambil public key')
  }

  return response.json()
}

export async function sendMessage(
  token: string,
  receiverEmail: string,
  ciphertext: string,
  iv: string
): Promise<{ message: string; id: number; timestamp: string }> {
  const response = await apiFetch('/messages', {
    method: 'POST',
    token,
    body: JSON.stringify({
      receiver_email: receiverEmail,
      ciphertext,
      iv,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error((error as any).detail || 'Gagal mengirim pesan')
  }

  return response.json()
}

export async function getMessages(
  token: string,
  userEmail: string
): Promise<
  {
    sender_email: string
    receiver_email: string
    ciphertext: string
    iv: string
    timestamp: string
  }[]
> {
  const response = await apiFetch(`/messages/${encodeURIComponent(userEmail)}`, {
    method: 'GET',
    token,
  })

  if (!response.ok) {
    throw new Error('Gagal mengambil pesan')
  }

  return response.json()
}

export function parseJWT(token: string): { payload?: Record<string, any> } {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format')
    }

    const payload = JSON.parse(atob(parts[1]))
    return { payload }
  } catch (error) {
    return {}
  }
}
