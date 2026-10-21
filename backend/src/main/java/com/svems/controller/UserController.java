package com.svems.controller;

import com.svems.config.ApiException;
import com.svems.model.ApiResponse;
import com.svems.model.User;
import com.svems.security.AuthenticatedUser;
import com.svems.security.CurrentUser;
import com.svems.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * User administration. Every route here is Administrator-only — enforced by
 * FirebaseTokenFilter via `svems.security.admin-paths`, so a non-admin token
 * never reaches these methods.
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ApiResponse<List<User>> getAll() throws Exception {
        return ApiResponse.success(userService.findAll());
    }

    @PostMapping
    public ApiResponse<Map<String, Object>> create(@RequestBody Map<String, String> body) throws Exception {
        User user = User.builder()
                .name(body.get("name"))
                .username(body.get("username"))
                .role(body.getOrDefault("role", AuthenticatedUser.ROLE_OPERATOR))
                .build();
        Map<String, Object> created = userService.create(user);
        return ApiResponse.success("User created. Share the temporary password with them.", created);
    }

    @PutMapping("/{id}")
    public ApiResponse<User> update(@PathVariable String id, @RequestBody Map<String, String> body,
                                    HttpServletRequest request) throws Exception {
        if (isSelf(id, request) && !AuthenticatedUser.ROLE_ADMIN.equals(body.get("role"))) {
            throw ApiException.badRequest("You cannot remove your own administrator role.");
        }
        return ApiResponse.success("User updated.", userService.update(id, body.get("name"), body.get("role")));
    }

    @PutMapping("/{id}/reset-password")
    public ApiResponse<Map<String, Object>> resetPassword(@PathVariable String id) throws Exception {
        return ApiResponse.success("Password reset. Share the new temporary password with the user.",
                userService.resetPassword(id));
    }

    @PutMapping("/{id}/toggle")
    public ApiResponse<Void> toggle(@PathVariable String id, HttpServletRequest request) throws Exception {
        // Guard against an admin locking themselves out of their own session.
        if (isSelf(id, request)) {
            throw ApiException.badRequest("You cannot deactivate your own account.");
        }
        userService.toggleStatus(id);
        return ApiResponse.success("User status updated.", null);
    }

    private boolean isSelf(String id, HttpServletRequest request) throws Exception {
        AuthenticatedUser caller = CurrentUser.require(request);
        return id.equals(caller.uid()) || userService.findByUid(caller.uid())
                .map(u -> id.equals(u.getId())).orElse(false);
    }
}
