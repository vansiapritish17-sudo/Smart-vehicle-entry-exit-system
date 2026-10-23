package com.svems.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import com.svems.model.ApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.UrlPathHelper;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * Verifies the Firebase ID token (a signed RS256 JWT) on every /api request.
 *
 * The client sends `Authorization: Bearer <idToken>`; the Admin SDK checks the
 * signature against Google's rotating public keys and validates issuer, audience
 * and expiry. Identity and role come from the token's claims — never from the
 * request body — so a caller cannot assert its own role.
 *
 * Requests without a valid token get 401. Valid tokens whose role claim does not
 * satisfy an admin-only route get 403.
 */
public class FirebaseTokenFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(FirebaseTokenFilter.class);
    private static final String BEARER_PREFIX = "Bearer ";

    private final AntPathMatcher matcher = new AntPathMatcher();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final FirebaseAuth firebaseAuth;

    /** Paths under /api that are reachable without a token. */
    @Value("${svems.security.public-paths:}")
    private List<String> publicPaths = List.of();

    /**
     * Routes restricted to the Administrator role. Each entry is an Ant path,
     * optionally prefixed with `METHOD:` to restrict only that verb.
     */
    @Value("${svems.security.admin-paths:/api/users/**,PUT:/api/configuration}")
    private List<String> adminPaths = List.of();

    /**
     * When true, every request also checks whether the token was revoked or the
     * account disabled — so toggling a user to INACTIVE locks them out immediately
     * instead of when their hour-long token expires. Costs one Admin SDK lookup
     * per request; set false if that latency ever matters more than the delay.
     */
    @Value("${svems.security.check-revoked:true}")
    private boolean checkRevoked;

    public FirebaseTokenFilter(FirebaseAuth firebaseAuth) {
        this.firebaseAuth = firebaseAuth;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // CORS preflight carries no Authorization header by design.
        if (HttpMethod.OPTIONS.matches(request.getMethod())) return true;

        String path = pathOf(request);
        if (!path.startsWith("/api/")) return true;

        return publicPaths.stream().anyMatch(pattern -> matcher.match(pattern.trim(), path));
    }

    /**
     * The path as Spring MVC routes it: percent-decoded, `;params` removed and `//`
     * collapsed. Matching the raw URI instead would let `/%61pi/users` or
     * `/api/users;x` skip these checks yet still reach the controller.
     */
    static String pathOf(HttpServletRequest request) {
        return PATHS.getPathWithinApplication(request);
    }

    private static final UrlPathHelper PATHS = new UrlPathHelper();
    static {
        PATHS.setUrlDecode(true);
        PATHS.setRemoveSemicolonContent(true);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith(BEARER_PREFIX)) {
            log.debug("Rejected {} {} — missing bearer token", request.getMethod(), request.getRequestURI());
            reject(response, HttpServletResponse.SC_UNAUTHORIZED,
                    "Missing authentication token. Sign in and retry.");
            return;
        }

        String idToken = header.substring(BEARER_PREFIX.length()).trim();
        FirebaseToken token;
        try {
            token = firebaseAuth.verifyIdToken(idToken, checkRevoked);
        } catch (FirebaseAuthException e) {
            log.debug("Rejected {} {} — {}", request.getMethod(), request.getRequestURI(), e.getMessage());
            reject(response, HttpServletResponse.SC_UNAUTHORIZED, describe(e));
            return;
        } catch (IllegalArgumentException e) {
            reject(response, HttpServletResponse.SC_UNAUTHORIZED, "Malformed authentication token.");
            return;
        }

        AuthenticatedUser user = toUser(token);

        if (user.role() == null || user.role().isBlank()) {
            // The account exists in Firebase Auth but was never assigned a role claim.
            reject(response, HttpServletResponse.SC_FORBIDDEN,
                    "Account has no role assigned. Ask an administrator to re-provision it.");
            return;
        }

        if (requiresAdmin(request) && !user.isAdmin()) {
            log.debug("Rejected {} {} for {} — administrator only",
                    request.getMethod(), request.getRequestURI(), user.username());
            reject(response, HttpServletResponse.SC_FORBIDDEN,
                    "This action is restricted to administrators.");
            return;
        }

        request.setAttribute(CurrentUser.REQUEST_ATTRIBUTE, user);
        chain.doFilter(request, response);
    }

    private boolean requiresAdmin(HttpServletRequest request) {
        String path = pathOf(request);
        String method = request.getMethod();

        for (String entry : adminPaths) {
            String rule = entry.trim();
            if (rule.isEmpty()) continue;

            int split = rule.indexOf(':');
            if (split > 0) {
                String verb = rule.substring(0, split);
                String pattern = rule.substring(split + 1);
                if (verb.equalsIgnoreCase(method) && matcher.match(pattern, path)) return true;
            } else if (matcher.match(rule, path)) {
                return true;
            }
        }
        return false;
    }

    private static AuthenticatedUser toUser(FirebaseToken token) {
        Map<String, Object> claims = token.getClaims();
        return new AuthenticatedUser(
                token.getUid(),
                token.getEmail(),
                asString(claims.get("username")),
                token.getName() != null && !token.getName().isBlank()
                        ? token.getName()
                        : asString(claims.get("name")),
                asString(claims.get("role"))
        );
    }

    private static String asString(Object value) {
        return value instanceof String s ? s : null;
    }

    /** Turn Firebase's error codes into something a user can act on. */
    private static String describe(FirebaseAuthException e) {
        String code = e.getAuthErrorCode() == null ? "" : e.getAuthErrorCode().name();
        return switch (code) {
            case "EXPIRED_ID_TOKEN"  -> "Session expired. Sign in again.";
            case "REVOKED_ID_TOKEN"  -> "Session was revoked. Sign in again.";
            case "USER_DISABLED"     -> "This account has been deactivated.";
            default                  -> "Invalid authentication token.";
        };
    }

    private void reject(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getWriter(), ApiResponse.error(message));
    }
}
