import { useRef } from 'react'
import {
  generateECDHKeypair,
  deriveSharedSecret,
  deriveAESKeyFromSharedSecret,
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
  timestamp: string
  decryptionFailed?: boolean
}

interface ContactSession {
  myPrivateKey: CryptoKey | null
  contactPublicKeyB64: string | null
  sharedSecret: ArrayBuffer | null
  aesKey: CryptoKey | null
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
        messages: [],
      })
    }
    return stateRef.current.sessions.get(email)!
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

      return true
    } catch (error) {
      console.error('Gagal initialize session:', error)
      throw error
    }
  }

  const sendEncryptedMessage = async (plaintext: string): Promise<Message> => {
    const target = stateRef.current.activeContactEmail
    if (!target) throw new Error('Tidak ada kontak yang dipilih')

    const session = stateRef.current.sessions.get(target)
    if (!session?.aesKey) {
      throw new Error('Chat session belum diinisialisasi')
    }

    const { ciphertext, iv } = await encryptMessage(plaintext, session.aesKey)
    const response = await sendMessage(stateRef.current.token, target, ciphertext, iv)

    const message: Message = {
      sender_email: stateRef.current.myEmail,
      receiver_email: target,
      plaintext,
      ciphertext,
      iv,
      timestamp: response.timestamp,
    }

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

    try {
      const encryptedMessages = await getMessages(stateRef.current.token, target)

      const decryptedMessages: Message[] = []
      for (const msg of encryptedMessages) {
        try {
          const plaintext = await decryptMessage(msg.ciphertext, msg.iv, session.aesKey)
          decryptedMessages.push({
            sender_email: msg.sender_email,
            receiver_email: msg.receiver_email,
            plaintext,
            ciphertext: msg.ciphertext,
            iv: msg.iv,
            timestamp: msg.timestamp,
          })
        } catch (error) {
          console.error('Gagal decrypt message:', error)
          decryptedMessages.push({
            sender_email: msg.sender_email,
            receiver_email: msg.receiver_email,
            plaintext: '[Gagal mendekripsi pesan]',
            ciphertext: msg.ciphertext,
            iv: msg.iv,
            timestamp: msg.timestamp,
            decryptionFailed: true,
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

  return {
    initializeSession,
    sendEncryptedMessage,
    loadMessageHistory,
    getMessages: getLocalMessages,
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
