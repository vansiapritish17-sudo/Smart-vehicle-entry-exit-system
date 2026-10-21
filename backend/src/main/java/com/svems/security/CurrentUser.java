package com.svems.security;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Accessor for the authenticated caller attached to the current request.
 *
 * Controllers take {@code HttpServletRequest} and call {@link #require(HttpServletRequest)};
 * on any path behind {@link FirebaseTokenFilter} the user is guaranteed to be present.
 */
public final class CurrentUser {

    public static final String REQUEST_ATTRIBUTE = "svems.currentUser";

    private CurrentUser() {}

    public static AuthenticatedUser get(HttpServletRequest request) {
        Object value = request.getAttribute(REQUEST_ATTRIBUTE);
        return value instanceof AuthenticatedUser user ? user : null;
    }

    /**
     * @throws IllegalStateException if called on a path the filter does not guard —
     *         a wiring bug, not a client error.
     */
    public static AuthenticatedUser require(HttpServletRequest request) {
        AuthenticatedUser user = get(request);
        if (user == null) {
            throw new IllegalStateException(
                    "No authenticated user on request " + request.getRequestURI() +
                    ". Is this path listed in svems.security.public-paths?");
        }
        return user;
    }
}
