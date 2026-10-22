package com.svems.controller;

import com.svems.model.ApiResponse;
import com.svems.model.Movement;
import com.svems.security.CurrentUser;
import com.svems.service.MovementService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/movements")
@RequiredArgsConstructor
public class MovementController {

    private final MovementService movementService;

    @GetMapping
    public ApiResponse<List<Movement>> getAll() throws Exception {
        return ApiResponse.success(movementService.findAll());
    }

    @PostMapping("/entry")
    public ResponseEntity<ApiResponse<Object>> entry(@RequestBody Map<String, String> body,
                                                    HttpServletRequest request) throws Exception {
        // Audit trail comes from the verified token, never the request body —
        // otherwise a caller could log movements under someone else's name.
        String operator = CurrentUser.require(request).displayName();
        return respond(movementService.recordEntry(body.get("regNo"), body.get("gate"), operator));
    }

    @PostMapping("/exit")
    public ResponseEntity<ApiResponse<Object>> exit(@RequestBody Map<String, String> body,
                                                    HttpServletRequest request) throws Exception {
        String operator = CurrentUser.require(request).displayName();
        return respond(movementService.recordExit(body.get("regNo"), body.get("gate"), operator));
    }

    /**
     * Clear movement history (Administrator only, via `svems.security.admin-paths`).
     * {@code olderThanDays=0} clears every completed record; open visits are always kept.
     */
    @DeleteMapping
    public ApiResponse<Map<String, Object>> clearHistory(@RequestParam(defaultValue = "0") int olderThanDays,
                                                         HttpServletRequest request) throws Exception {
        String clearedBy = CurrentUser.require(request).displayName();
        int removed = movementService.clearHistory(olderThanDays, clearedBy);
        String message = removed == 0
                ? "No records to clear."
                : "Cleared " + removed + " movement record" + (removed == 1 ? "" : "s") + ".";
        return ApiResponse.success(message, Map.of("removed", removed));
    }

    /** A refused movement is a valid outcome, not a server error: 422 with the alert attached. */
    private static ResponseEntity<ApiResponse<Object>> respond(Map<String, Object> result) {
        boolean ok = (boolean) result.get("ok");
        return ResponseEntity.status(ok ? 200 : 422)
                .body(new ApiResponse<>(ok, (String) result.get("message"), result));
    }
}
