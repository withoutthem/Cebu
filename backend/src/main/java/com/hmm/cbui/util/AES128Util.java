package com.hmm.cbui.util;

import com.hmm.cbui.exception.CryptoException;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-128 GCM 유틸
 * 포맷: Base64( IV(12바이트) || CIPHERTEXT+TAG )
 * == EXAMPLE ==
 * AES128Util aes = new AES128Util("1234567890abcdef"); // 16 bytes
 * String enc = aes.encrypt("hello");
 * String dec = aes.decrypt(enc);
 * dec.equals("hello") -> true
 */
public final class AES128Util {

    // ===== 상수 (매직 넘버 제거) =====
    private static final String ALG = "AES";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int KEY_BYTES = 16;        // 128-bit
    private static final int IV_LEN = 12;           // GCM 권장 12 bytes
    private static final int GCM_TAG_BITS = 128;    // 16 bytes tag

    private static final SecureRandom RNG = new SecureRandom();

    // 16바이트 키
    private final SecretKey secretKey;

    public AES128Util(String key) {
        byte[] kb = key.getBytes(StandardCharsets.UTF_8);
        if (kb.length != KEY_BYTES) {
            throw new IllegalArgumentException("Key must be 16 bytes (128 bits) in UTF-8.");
        }
        this.secretKey = new SecretKeySpec(kb, ALG);
    }

    /** 암호화: Base64( IV || CIPHERTEXT+TAG ) */
    public String encrypt(String plainText) throws CryptoException {
        try {
            byte[] iv = new byte[IV_LEN];
            RNG.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_BITS, iv));

            byte[] pt = plainText.getBytes(StandardCharsets.UTF_8);
            byte[] ct = cipher.doFinal(pt);

            // IV + CT 합치기
            byte[] out = new byte[IV_LEN + ct.length];
            System.arraycopy(iv, 0, out, 0, IV_LEN);
            System.arraycopy(ct, 0, out, IV_LEN, ct.length);

            return Base64.getEncoder().encodeToString(out);
        } catch (Exception e) {
            throw new CryptoException("Encrypt failed", e);
        }
    }

    /** 복호화: 입력은 Base64( IV || CIPHERTEXT+TAG ) */
    public String decrypt(String encoded) throws CryptoException {
        try {
            byte[] all = Base64.getDecoder().decode(encoded);
            if (all.length <= IV_LEN) {
                throw new CryptoException("Invalid ciphertext: too short");
            }

            byte[] iv = new byte[IV_LEN];
            byte[] ct = new byte[all.length - IV_LEN];
            System.arraycopy(all, 0, iv, 0, IV_LEN);
            System.arraycopy(all, IV_LEN, ct, 0, ct.length);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_BITS, iv));

            byte[] pt = cipher.doFinal(ct);
            return new String(pt, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new CryptoException("Decrypt failed", e);
        }
    }
}



