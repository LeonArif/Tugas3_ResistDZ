// Utility functions untuk cryptography menggunakan Web Crypto API

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
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return bytes.buffer
}

export function base64ToHex(base64: string): string {
  return arrayBufferToHex(base64ToArrayBuffer(base64))
}

export function hexToBase64(hex: string): string {
  return arrayBufferToBase64(hexToArrayBuffer(hex))
}
