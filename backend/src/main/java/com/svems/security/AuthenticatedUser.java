package com.svems.security;

/**
 * The caller identified by a verified Firebase ID token.
 * Stored on the request by {@link FirebaseTokenFilter} and read via {@link CurrentUser}.
 */
public record AuthenticatedUser(
        String uid,
        String email,
        String username,
        String name,
        String role
) {
    public static final String ROLE_ADMIN = "Administrator";
    public static final String ROLE_OPERATOR = "Security Operator";

    public boolean isAdmin() {
        return ROLE_ADMIN.equals(role);
    }

    /** Display name for audit fields such as a movement's operator. */
    public String displayName() {
        if (name != null && !name.isBlank()) return name;
        if (username != null && !username.isBlank()) return username;
        return email != null ? email : uid;
    }
}
