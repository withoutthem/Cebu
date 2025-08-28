package com.hmm.cbui.exception;

public class CryptoException extends Exception {
    public CryptoException(String message) { super(message); }
    public CryptoException(String message, Throwable cause) { super(message, cause); }
}