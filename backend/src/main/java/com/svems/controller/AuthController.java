package com.svems.controller;

import com.svems.model.ApiResponse;
import com.svems.model.User;
import com.svems.security.AuthenticatedUser;
import com.svems.security.CurrentUser;
import com.svems.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Session endpoints.
 *
 * There is no login endpoint: the client authenticates directly against Firebase
 * Authentication and receives an ID token. This controller only reports back who
 * that token belongs to — reaching it at all means the token already verified.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    /** Resolve the caller's profile. Called by the frontend right after sign-in. */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Map<String, Object>>> me(HttpServletRequest request) {
        AuthenticatedUser caller = CurrentUser.require(request);
        try {
            Optional<User> profile = userService.findByUid(caller.uid());

            if (profile.isPresent() && "INACTIVE".equals(profile.get().getStatus())) {
                return ResponseEntity.status(403)
                        .body(ApiResponse.error("This account has been deactivated."));
            }

            userService.recordLogin(caller.uid());
            return ResponseEntity.ok(ApiResponse.success("Session verified.", describe(caller, profile)));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Could not load profile: " + e.getMessage()));
        }
    }

    /**
     * Identity comes from the verified token's claims; the Firestore profile only
     * fills in details the token does not carry.
     */
    private static Map<String, Object> describe(AuthenticatedUser caller, Optional<User> profile) {
        Map<String, Object> safe = new LinkedHashMap<>();
        safe.put("uid", caller.uid());
        safe.put("id", profile.map(User::getId).orElse(caller.uid()));
        safe.put("name", caller.displayName());
        safe.put("username", caller.username());
        safe.put("email", caller.email());
        safe.put("role", caller.role());
        safe.put("status", profile.map(User::getStatus).orElse("ACTIVE"));
        safe.put("lastLogin", profile.map(User::getLastLogin).orElse(null));
        return safe;
    }
}
