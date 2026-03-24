import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CryptoService {
  
  // Robust ArrayBuffer to Base64 using modern approach
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return btoa(String.fromCharCode.apply(null, Array.from(bytes)));
  }

  // Robust Base64 to ArrayBuffer using modern approach
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async generateKeyPair(): Promise<CryptoKeyPair> {
    return window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );
  }

  async exportPublicKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("spki", key);
    return this.arrayBufferToBase64(exported);
  }

  async importPublicKey(base64Key: string): Promise<CryptoKey> {
    const buffer = this.base64ToArrayBuffer(base64Key);
    return window.crypto.subtle.importKey(
      "spki",
      buffer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["encrypt"]
    );
  }

  async exportPrivateKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("pkcs8", key);
    return this.arrayBufferToBase64(exported);
  }

  async importPrivateKey(base64Key: string): Promise<CryptoKey> {
    const buffer = this.base64ToArrayBuffer(base64Key);
    return window.crypto.subtle.importKey(
      "pkcs8",
      buffer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["decrypt"]
    );
  }

  async encryptMessage(publicKey: CryptoKey, message: string): Promise<string> {
    const encodedMessage = new TextEncoder().encode(message);
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: "RSA-OAEP"
      },
      publicKey,
      encodedMessage
    );
    return this.arrayBufferToBase64(encryptedBuffer);
  }

  async decryptMessage(privateKey: CryptoKey, encryptedMessageBase64: string): Promise<string> {
    try {
      const encryptedBuffer = this.base64ToArrayBuffer(encryptedMessageBase64);
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: "RSA-OAEP"
        },
        privateKey,
        encryptedBuffer
      );
      return new TextDecoder().decode(decryptedBuffer);
    } catch (e) {
      console.error("Decryption failed", e);
      return "🔒 [Decryption Failed]";
    }
  }
}
