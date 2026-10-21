package com.svems.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A user profile. Credentials are NOT stored here — Firebase Authentication owns
 * passwords and issues the ID tokens. This document holds only the profile and the
 * {@code uid} that links it to the Firebase Auth account.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {
    private String id;
    private String uid;           // Firebase Auth UID — the link to the credential
    private String name;
    private String username;      // login handle, e.g. "admin"
    private String email;         // derived: username@<svems.auth.email-domain>
    private String role;          // Administrator, Security Operator
    private String status;        // ACTIVE, INACTIVE
    private String lastLogin;
}
