// Utility functions untuk cryptography menggunakan Web Crypto API

export const MAC_ALG = 'HMAC-SHA256'
const MAC_INFO = 'chat-mac-key'
const MAC_VERSION = 'v1'

// Generate ECDH keypair menggunakan X25519
export async function generateECDHKeypair(): Promise<{
  privateKey: CryptoKey
  publicKeyB64: string
}> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'X25519',
    },
    true, 
    ['deriveKey', 'deriveBits']
  )

  const publicKeyArrayBuffer = await window.crypto.subtle.exportKey('raw', keyPair.publicKey)
  const publicKeyB64 = arrayBufferToBase64(publicKeyArrayBuffer)

  return {
    privateKey: keyPair.privateKey,
    publicKeyB64,
  }
}

export async function deriveSharedSecret(
  privateKey: CryptoKey,
  publicKeyB64: string
): Promise<ArrayBuffer> {
  const publicKeyArrayBuffer = base64ToArrayBuffer(publicKeyB64)
  const publicKey = await window.crypto.subtle.importKey(
    'raw',
    publicKeyArrayBuffer,
    {
      name: 'X25519',
    },
    false,
    []
  )

  const sharedSecret = await window.crypto.subtle.deriveBits(
    {
      name: 'X25519',
      public: publicKey,
    },
    privateKey,
    256
  )

  return sharedSecret
}

// Derive AES key menggunakan HKDF dari shared secret
export async function deriveAESKeyFromSharedSecret(
  sharedSecret: ArrayBuffer,
  salt: string = ''
): Promise<CryptoKey> {
  const saltBuffer = salt ? base64ToArrayBuffer(salt) : new Uint8Array(16)

  const key = await window.crypto.subtle.importKey('raw', sharedSecret, 'HKDF', false, [
    'deriveBits',
  ])

  const derivedKeyBits = await window.crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: saltBuffer,
      info: new TextEncoder().encode('chat-aes-key'),
    },
    key,
    256
  )

  const aesKey = await window.crypto.subtle.importKey('raw', derivedKeyBits, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])

  return aesKey
}

// Derive MAC key terpisah agar tidak reuse AES key untuk autentikasi
export async function deriveMacKeyFromSharedSecret(
  sharedSecret: ArrayBuffer,
  salt: string = ''
): Promise<CryptoKey> {
  const saltBuffer = salt ? base64ToArrayBuffer(salt) : new Uint8Array(16)
  const key = await window.crypto.subtle.importKey('raw', sharedSecret, 'HKDF', false, [
    'deriveBits',
  ])

  const derivedKeyBits = await window.crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: saltBuffer,
      info: new TextEncoder().encode(MAC_INFO),
    },
    key,
    256
  )

  return window.crypto.subtle.importKey(
    'raw',
    derivedKeyBits,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export function buildMacPayload(params: {
  senderEmail: string
  receiverEmail: string
  ciphertext: string
  iv: string
  macAlg?: string
}): string {
  const macAlg = (params.macAlg ?? MAC_ALG).toUpperCase()
  const senderEmail = params.senderEmail.trim().toLowerCase()
  const receiverEmail = params.receiverEmail.trim().toLowerCase()
  const ciphertext = params.ciphertext.trim().toLowerCase()
  const iv = params.iv.trim().toLowerCase()

  return [
    MAC_VERSION,
    macAlg,
    senderEmail,
    receiverEmail,
    ciphertext,
    iv,
  ].join('|')
}

export async function signMac(payload: string, macKey: CryptoKey): Promise<string> {
  const data = new TextEncoder().encode(payload)
  const signature = await window.crypto.subtle.sign('HMAC', macKey, data)
  return arrayBufferToHex(signature)
}

export async function verifyMac(
  payload: string,
  macHex: string,
  macKey: CryptoKey
): Promise<boolean> {
  try {
    const data = new TextEncoder().encode(payload)
    const signature = hexToArrayBuffer(macHex)
    return window.crypto.subtle.verify('HMAC', macKey, signature, data)
  } catch {
    return false
  }
}

// Encrypt message menggunakan AES-256-GCM
export async function encryptMessage(
  message: string,
  aesKey: CryptoKey
): Promise<{
  ciphertext: string
  iv: string
}> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const plaintext = new TextEncoder().encode(message)

  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    aesKey,
    plaintext
  )

  return {
    ciphertext: arrayBufferToHex(ciphertext),
    iv: arrayBufferToHex(iv.buffer),
  }
}

// Decrypt message menggunakan AES-256-GCM
export async function decryptMessage(
  ciphertext: string,
  iv: string,
  aesKey: CryptoKey
): Promise<string> {
  try {
    const ciphertextBuffer = hexToArrayBuffer(ciphertext)
    const ivBuffer = hexToArrayBuffer(iv)

    const plaintext = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer,
      },
      aesKey,
      ciphertextBuffer
    )

    return new TextDecoder().decode(plaintext)
  } catch (error) {
    throw new Error('Gagal mendekripsi pesan')
  }
}

export async function savePrivateKeyToStorage(
  privateKey: CryptoKey,
  encryptionPassword: string,
  email: string
): Promise<void> {
  const exportedKey = await window.crypto.subtle.exportKey('pkcs8', privateKey)

  const passwordKey = await deriveKeyFromPassword(encryptionPassword)

  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const encryptedKey = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    passwordKey,
    exportedKey
  )

  window.localStorage.setItem(`privateKeyIV_${email}`,arrayBufferToBase64(iv.buffer))
  window.localStorage.setItem(`privateKeyEncrypted_${email}`,arrayBufferToBase64(encryptedKey))
}

export async function loadPrivateKeyFromStorage(
  encryptionPassword: string,
  email: string
): Promise<CryptoKey | null> {
  const encryptedKeyB64 = window.localStorage.getItem(`privateKeyEncrypted_${email}`)
  const ivB64 = window.localStorage.getItem(`privateKeyIV_${email}`)

  if (!encryptedKeyB64 || !ivB64) {
    return null
  }

  try {
    const passwordKey = await deriveKeyFromPassword(encryptionPassword)

    const encryptedKey = base64ToArrayBuffer(encryptedKeyB64)
    const iv = base64ToArrayBuffer(ivB64)

    const decryptedKey = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      passwordKey,
      encryptedKey
    )

    const privateKey = await window.crypto.subtle.importKey(
      'pkcs8',
      decryptedKey,
      {
        name: 'X25519',
      },
      true,
      ['deriveKey', 'deriveBits']
    )

    return privateKey
  } catch (error) {
    throw new Error('Gagal memuat private key')
  }
}

export async function deriveKeyFromPassword(password: string): Promise<CryptoKey> {
  const passwordBuffer = new TextEncoder().encode(password)
  const salt = new Uint8Array(16)

  const passwordKey = await window.crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, [
    'deriveBits',
  ])

  const derivedKeyBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: salt,
      iterations: 200000,
    },
    passwordKey,
    256
  )

  return window.crypto.subtle.importKey('raw', derivedKeyBits, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToArrayBuffer(hex: string): ArrayBuffer {
  const normalized = normalizeHexString(hex)
  if (normalized.length % 2 !== 0) {
    throw new Error('Invalid hex length')
  }
  const bytes = new Uint8Array(normalized.length / 2)
  for (let i = 0; i < normalized.length; i += 2) {
    const byte = Number.parseInt(normalized.slice(i, i + 2), 16)
    if (Number.isNaN(byte)) {
      throw new Error('Invalid hex content')
    }
    bytes[i / 2] = byte
  }
  return bytes.buffer
}

function normalizeHexString(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^0x/, '')
    .replace(/\s+/g, '')
}

export function base64ToHex(base64: string): string {
  return arrayBufferToHex(base64ToArrayBuffer(base64))
}

export function hexToBase64(hex: string): string {
  return arrayBufferToBase64(hexToArrayBuffer(hex))
}
