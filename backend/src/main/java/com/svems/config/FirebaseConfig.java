package com.svems.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;
import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;

/**
 * Initializes the Firebase Admin SDK from credentials supplied by the environment.
 *
 * Resolution order:
 *   1. FIREBASE_SERVICE_ACCOUNT_BASE64 — base64 of the service account JSON (preferred).
 *   2. GOOGLE_APPLICATION_CREDENTIALS  — absolute path to the JSON file on disk.
 *   3. Application Default Credentials — for GCP/Cloud Run, where the runtime supplies them.
 *
 * The key is never read from the classpath, so it can never be packaged into a jar
 * or committed with the source. See .env.example for local setup.
 */
@Configuration
public class FirebaseConfig {

    @Value("${FIREBASE_SERVICE_ACCOUNT_BASE64:}")
    private String serviceAccountBase64;

    @Value("${GOOGLE_APPLICATION_CREDENTIALS:}")
    private String serviceAccountPath;

    @PostConstruct
    public void initialize() throws IOException {
        if (!FirebaseApp.getApps().isEmpty()) return;

        FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(resolveCredentials())
                .build();

        FirebaseApp.initializeApp(options);
        System.out.println("✅ Firebase Admin SDK initialized successfully.");
    }

    private GoogleCredentials resolveCredentials() throws IOException {
        if (hasText(serviceAccountBase64)) {
            byte[] json = decodeBase64(serviceAccountBase64.trim());
            System.out.println("🔐 Firebase credentials loaded from FIREBASE_SERVICE_ACCOUNT_BASE64.");
            try (InputStream in = new ByteArrayInputStream(json)) {
                return GoogleCredentials.fromStream(in);
            }
        }

        if (hasText(serviceAccountPath)) {
            Path path = Path.of(serviceAccountPath.trim());
            if (!Files.isReadable(path)) {
                throw new IllegalStateException(
                        "GOOGLE_APPLICATION_CREDENTIALS points to a file that does not exist or is not readable: " + path);
            }
            System.out.println("🔐 Firebase credentials loaded from " + path);
            try (InputStream in = new FileInputStream(path.toFile())) {
                return GoogleCredentials.fromStream(in);
            }
        }

        try {
            GoogleCredentials adc = GoogleCredentials.getApplicationDefault();
            System.out.println("🔐 Firebase credentials loaded from Application Default Credentials.");
            return adc;
        } catch (IOException e) {
            throw new IllegalStateException(
                    "No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT_BASE64 (see backend/.env.example), " +
                    "or GOOGLE_APPLICATION_CREDENTIALS to the path of your service account JSON. " +
                    "Generate a key at Firebase Console → Project Settings → Service Accounts.", e);
        }
    }

    /** Accepts both standard and URL-safe base64, with or without padding. */
    private static byte[] decodeBase64(String value) {
        String normalized = value.replaceAll("\\s", "");
        try {
            return Base64.getDecoder().decode(normalized);
        } catch (IllegalArgumentException e) {
            try {
                return Base64.getUrlDecoder().decode(normalized);
            } catch (IllegalArgumentException e2) {
                // Tolerate a raw (un-encoded) JSON value being pasted into the variable.
                if (normalized.startsWith("{")) {
                    return value.getBytes(StandardCharsets.UTF_8);
                }
                throw new IllegalStateException(
                        "FIREBASE_SERVICE_ACCOUNT_BASE64 is not valid base64. Regenerate it with: " +
                        "base64 -i serviceAccountKey.json | tr -d '\\n'", e2);
            }
        }
    }

    private static boolean hasText(String s) {
        return s != null && !s.isBlank();
    }

    /** Exposed so services and the auth filter can inject it rather than reaching for the static. */
    @Bean
    public FirebaseAuth firebaseAuth() {
        return FirebaseAuth.getInstance();
    }
}
