import { useRef } from 'react'
import {
  generateECDHKeypair,
  deriveSharedSecret,
  deriveAESKeyFromSharedSecret,
  deriveMacKeyFromSharedSecret,
  buildMacPayload,
  signMac,
  verifyMac,
  MAC_ALG,
  encryptMessage,
  decryptMessage,
  savePrivateKeyToStorage,
  loadPrivateKeyFromStorage,
} from '../utils/crypto'
import { getPublicKey, sendMessage, getMessages } from '../utils/api'

interface Message {
  sender_email: string
  receiver_email: string
  plaintext: string
  ciphertext: string
  iv: string
  mac: string
  mac_alg: string
  macExpected?: string
  timestamp: string
  decryptionFailed?: boolean
  macInvalid?: boolean
}

type SendMacOptions = {
  simulate?: boolean
  manualMac?: string
}

interface ContactSession {
  myPrivateKey: CryptoKey | null
  contactPublicKeyB64: string | null
  sharedSecret: ArrayBuffer | null
  aesKey: CryptoKey | null
  macKey: CryptoKey | null
  draft?: {
    plaintext: string
    ciphertext: string
    iv: string
    mac: string
  }
  messages: Message[]
}

interface ChatSessionState {
  token: string
  myEmail: string
  sessions: Map<string, ContactSession>
  activeContactEmail: string
}

export function useChatSession(contactEmail: string, token: string, myEmail: string) {
  const stateRef = useRef<ChatSessionState>({
    token,
    myEmail,
    sessions: new Map(),
    activeContactEmail: contactEmail,
  })

  const normalizeEmail = (email: string) => email.trim().toLowerCase()
  const normalizeHex = (value: string) => value.trim().toLowerCase()

  stateRef.current.token = token
  stateRef.current.myEmail = myEmail
  stateRef.current.activeContactEmail = contactEmail

  const getOrCreateSession = (email: string): ContactSession => {
    if (!stateRef.current.sessions.has(email)) {
      stateRef.current.sessions.set(email, {
        myPrivateKey: null,
        contactPublicKeyB64: null,
        sharedSecret: null,
        aesKey: null,
        macKey: null,
        draft: undefined,
        messages: [],
      })
    }
    return stateRef.current.sessions.get(email)!
  }

  const buildDraft = async (plaintext: string, session: ContactSession, target: string) => {
    const { ciphertext, iv } = await encryptMessage(plaintext, session.aesKey as CryptoKey)
    const macPayload = buildMacPayload({
      senderEmail: normalizeEmail(stateRef.current.myEmail),
      receiverEmail: normalizeEmail(target),
      ciphertext: normalizeHex(ciphertext),
      iv: normalizeHex(iv),
      macAlg: MAC_ALG,
    })
    const mac = await signMac(macPayload, session.macKey as CryptoKey)

    return {
      plaintext,
      ciphertext,
      iv,
      mac,
    }
  }

  const initializeSession = async (password: string, targetContactEmail?: string) => {
    const target = targetContactEmail || stateRef.current.activeContactEmail
    if (!target) throw new Error('Tidak ada kontak yang dipilih')

    const session = getOrCreateSession(target)

    try {
      const privateKey = await loadPrivateKeyFromStorage(
        password,
        stateRef.current.myEmail
      )
      if (!privateKey) {
        throw new Error('Private key tidak ditemukan')
      }
      session.myPrivateKey = privateKey

      const publicKeyResponse = await getPublicKey(target, stateRef.current.token)
      console.log('Public key dari backend:', publicKeyResponse.public_key)
      session.contactPublicKeyB64 = publicKeyResponse.public_key

      const sharedSecret = await deriveSharedSecret(privateKey, publicKeyResponse.public_key)
      session.sharedSecret = sharedSecret

      const aesKey = await deriveAESKeyFromSharedSecret(sharedSecret)
      session.aesKey = aesKey

      // Derive MAC key terpisah agar integrity + auth tidak tercampur dengan AES key
      const macKey = await deriveMacKeyFromSharedSecret(sharedSecret)
      session.macKey = macKey

      return true
    } catch (error) {
      console.error('Gagal initialize session:', error)
      throw error
    }
  }

  const sendEncryptedMessage = async (
    plaintext: string,
    options?: SendMacOptions
  ): Promise<Message> => {
    const target = stateRef.current.activeContactEmail
    if (!target) throw new Error('Tidak ada kontak yang dipilih')

    const session = stateRef.current.sessions.get(target)
    if (!session?.aesKey) {
      throw new Error('Chat session belum diinisialisasi')
    }

    if (!session.macKey) {
      throw new Error('MAC key belum tersedia')
    }

    const draft =
      session.draft && session.draft.plaintext === plaintext
        ? session.draft
        : await buildDraft(plaintext, session, target)
    const tamperHex = (hex: string) => {
      if (!hex) return hex
      const replacement = hex[0] === '0' ? '1' : '0'
      return `${replacement}${hex.slice(1)}`
    }
    const manualMac = options?.manualMac?.trim()
    const macToSend = options?.simulate
      ? manualMac
        ? normalizeHex(manualMac)
        : tamperHex(draft.mac)
      : draft.mac
    const response = await sendMessage(
      stateRef.current.token,
      target,
      draft.ciphertext,
      draft.iv,
      macToSend,
      MAC_ALG
    )

    const message: Message = {
      sender_email: stateRef.current.myEmail,
      receiver_email: target,
      plaintext,
      ciphertext: draft.ciphertext,
      iv: draft.iv,
      mac: macToSend,
      mac_alg: MAC_ALG,
      macExpected: draft.mac,
      timestamp: response.timestamp,
      macInvalid: false,
    }

    session.draft = undefined
    session.messages.push(message)
    return message
  }

  const loadMessageHistory = async (targetContactEmail?: string) => {
    const target = targetContactEmail || stateRef.current.activeContactEmail
    if (!target) throw new Error('Tidak ada kontak yang dipilih')

    const session = stateRef.current.sessions.get(target)
    if (!session?.aesKey) {
      throw new Error('Chat session belum diinisialisasi')
    }

    if (!session.macKey) {
      throw new Error('MAC key belum tersedia')
    }

    try {
      const encryptedMessages = await getMessages(stateRef.current.token, target)

      const decryptedMessages: Message[] = []

      // Flow: verify MAC -> decrypt only if MAC valid
      for (const msg of encryptedMessages) {
        const macPayload = buildMacPayload({
          senderEmail: normalizeEmail(msg.sender_email),
          receiverEmail: normalizeEmail(msg.receiver_email),
          ciphertext: normalizeHex(msg.ciphertext),
          iv: normalizeHex(msg.iv),
          macAlg: msg.mac_alg,
        })
        const expectedMac = await signMac(macPayload, session.macKey)
        const macIsValid =
          msg.mac_alg === MAC_ALG &&
          (await verifyMac(macPayload, normalizeHex(msg.mac), session.macKey))

        if (!macIsValid) {
          decryptedMessages.push({
            sender_email: msg.sender_email,
            receiver_email: msg.receiver_email,
            plaintext: '[MAC tidak valid]',
            ciphertext: msg.ciphertext,
            iv: msg.iv,
            mac: msg.mac,
            mac_alg: msg.mac_alg,
            macExpected: expectedMac,
            timestamp: msg.timestamp,
            macInvalid: true,
          })
          continue
        }

        try {
          const plaintext = await decryptMessage(msg.ciphertext, msg.iv, session.aesKey)
          decryptedMessages.push({
            sender_email: msg.sender_email,
            receiver_email: msg.receiver_email,
            plaintext,
            ciphertext: msg.ciphertext,
            iv: msg.iv,
            mac: msg.mac,
            mac_alg: msg.mac_alg,
            macExpected: expectedMac,
            timestamp: msg.timestamp,
            macInvalid: false,
          })
        } catch (error) {
          console.error('Gagal decrypt message:', error)
          decryptedMessages.push({
            sender_email: msg.sender_email,
            receiver_email: msg.receiver_email,
            plaintext: '[Gagal mendekripsi pesan]',
            ciphertext: msg.ciphertext,
            iv: msg.iv,
            mac: msg.mac,
            mac_alg: msg.mac_alg,
            macExpected: expectedMac,
            timestamp: msg.timestamp,
            decryptionFailed: true,
            macInvalid: false,
          })
        }
      }

      session.messages = decryptedMessages
      return decryptedMessages
    } catch (error) {
      console.error('Gagal load message history:', error)
      throw error
    }
  }

  const getLocalMessages = () => {
    const target = stateRef.current.activeContactEmail
    return target ? (stateRef.current.sessions.get(target)?.messages ?? []) : []
  }

  const previewMacForDraft = async (plaintext: string) => {
    const target = stateRef.current.activeContactEmail
    if (!target) throw new Error('Tidak ada kontak yang dipilih')

    const session = stateRef.current.sessions.get(target)
    if (!session?.aesKey) {
      throw new Error('Chat session belum diinisialisasi')
    }

    if (!session.macKey) {
      throw new Error('MAC key belum tersedia')
    }

    const draft = await buildDraft(plaintext, session, target)
    session.draft = draft
    return draft.mac
  }

  return {
    initializeSession,
    sendEncryptedMessage,
    loadMessageHistory,
    getMessages: getLocalMessages,
    previewMacForDraft,
    verifyMacForMessage: async (msg: Message, overrideMac?: string) => {
      const target = stateRef.current.activeContactEmail
      if (!target) throw new Error('Tidak ada kontak yang dipilih')

      const session = stateRef.current.sessions.get(target)
      if (!session?.macKey) throw new Error('MAC key belum tersedia')

      const effectiveMac = overrideMac ? normalizeHex(overrideMac) : normalizeHex(msg.mac)
      const macPayload = buildMacPayload({
        senderEmail: normalizeEmail(msg.sender_email),
        receiverEmail: normalizeEmail(msg.receiver_email),
        ciphertext: normalizeHex(msg.ciphertext),
        iv: normalizeHex(msg.iv),
        macAlg: msg.mac_alg,
      })

      return msg.mac_alg === MAC_ALG && (await verifyMac(macPayload, effectiveMac, session.macKey))
    },
  }
}

export function useRegistration() {
  const generateKeypair = async () => {
    try {
      const { privateKey, publicKeyB64 } = await generateECDHKeypair()
      window.sessionStorage.setItem('tempPublicKey', publicKeyB64)
      return { privateKey, publicKeyB64 }
    } catch (error) {
      console.error('Gagal generate keypair:', error)
      throw error
    }
  }

  const savePrivateKey = async (privateKey: CryptoKey, password: string, myEmail: string) => {
    try {
      await savePrivateKeyToStorage(privateKey, password, myEmail)
    } catch (error) {
      console.error('Gagal save private key:', error)
      throw error
    }
  }

  const getTempPublicKey = () => {
    return window.sessionStorage.getItem('tempPublicKey')
  }

  const clearTemp = () => {
    window.sessionStorage.removeItem('tempPublicKey')
  }

  return {
    generateKeypair,
    savePrivateKey,
    getTempPublicKey,
    clearTemp,
  }
}
