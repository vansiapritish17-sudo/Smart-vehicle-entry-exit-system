package com.svems.service;

import com.google.cloud.firestore.FieldValue;
import com.svems.config.ApiException;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.UserRecord;
import com.svems.model.User;
import com.svems.repository.DocumentStore;
import com.svems.security.AuthenticatedUser;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * User profiles in Firestore, kept in step with the Firebase Auth accounts that
 * own the credentials.
 *
 * Passwords are never stored or verified here — the client authenticates directly
 * against Firebase Auth and the backend only ever sees the resulting ID token.
 * Roles live as a custom claim on the Auth account so they travel inside the
 * signed token and can be enforced by both this API and Firestore rules.
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);
    private static final String COLLECTION = "users";

    private final DocumentStore repo;
    private final FirebaseAuth firebaseAuth;

    /** Login handles are turned into addresses in this domain; it never receives mail. */
    @Value("${svems.auth.email-domain:svems.local}")
    private String emailDomain;

    /** Passwords for the two bootstrap accounts created on an empty database. */
    @Value("${svems.auth.admin-password:Admin@123}")
    private String adminPassword;

    @Value("${svems.auth.operator-password:Operator@123}")
    private String operatorPassword;

    private static final Pattern USERNAME = Pattern.compile("^[a-z0-9._-]{3,30}$");
    private static final Set<String> ROLES = Set.of(AuthenticatedUser.ROLE_ADMIN, AuthenticatedUser.ROLE_OPERATOR);
    private static final String PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    public List<User> findAll() throws Exception {
        return repo.findAll(COLLECTION).stream()
                .map(this::toUser)
                .sorted(Comparator.comparing(User::getUsername, Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.toList());
    }

    /**
     * A one-time password handed to the administrator to pass on. It is set on the
     * Firebase Auth account and never stored anywhere else.
     */
    public static String generateTemporaryPassword() {
        StringBuilder sb = new StringBuilder("Tmp-");
        for (int i = 0; i < 8; i++) sb.append(PASSWORD_ALPHABET.charAt(RANDOM.nextInt(PASSWORD_ALPHABET.length())));
        return sb.append('#').append(RANDOM.nextInt(10)).toString();
    }

    /** The profile behind a verified token, matched on Firebase UID. */
    public Optional<User> findByUid(String uid) throws Exception {
        return repo.findWhere(COLLECTION, "uid", uid).stream().map(this::toUser).findFirst();
    }

    public String emailFor(String username) {
        return username.contains("@") ? username : username.toLowerCase() + "@" + emailDomain;
    }

    /**
     * Create a profile and its Firebase Auth account together, with a fresh random
     * password that is returned once so the administrator can hand it over.
     */
    public Map<String, Object> create(User user) throws Exception {
        String username = user.getUsername() == null ? "" : user.getUsername().trim().toLowerCase();
        if (!USERNAME.matcher(username).matches()) {
            throw new IllegalArgumentException(
                    "Username must be 3–30 characters: lowercase letters, digits, dot, dash or underscore.");
        }
        requireName(user.getName());
        requireRole(user.getRole());
        if (!repo.findWhere(COLLECTION, "username", username).isEmpty()) {
            throw ApiException.conflict("Username '" + username + "' is already taken.");
        }

        user.setName(user.getName().trim());
        user.setUsername(username);
        user.setEmail(emailFor(username));
        user.setStatus("ACTIVE");
        user.setLastLogin("Not logged in");

        String password = generateTemporaryPassword();
        UserRecord record;
        try {
            record = firebaseAuth.createUser(new UserRecord.CreateRequest()
                    .setEmail(user.getEmail())
                    .setPassword(password)
                    .setDisplayName(user.getName())
                    .setEmailVerified(true)
                    .setDisabled(false));
        } catch (FirebaseAuthException e) {
            if (e.getAuthErrorCode() == com.google.firebase.auth.AuthErrorCode.EMAIL_ALREADY_EXISTS) {
                throw ApiException.conflict("Username '" + username + "' is already taken.");
            }
            throw e;
        }
        user.setUid(record.getUid());
        applyClaims(record.getUid(), user);

        String id = repo.save(COLLECTION, toMap(user));
        user.setId(id);
        log.info("Created user '{}' ({}) with uid {}", username, user.getRole(), record.getUid());
        return withPassword(user, password);
    }

    /**
     * Change a user's display name and/or role. A role change revokes their sessions
     * so the new role takes effect on their next sign-in instead of an hour later.
     */
    public User update(String id, String name, String role) throws Exception {
        Map<String, Object> doc = repo.findById(COLLECTION, id)
                .orElseThrow(() -> ApiException.notFound("User not found."));
        User user = toUser(doc);
        requireName(name);
        requireRole(role);

        boolean roleChanged = !role.equals(user.getRole());
        user.setName(name.trim());
        user.setRole(role);

        if (user.getUid() != null) {
            firebaseAuth.updateUser(new UserRecord.UpdateRequest(user.getUid()).setDisplayName(user.getName()));
            applyClaims(user.getUid(), user);
            if (roleChanged) firebaseAuth.revokeRefreshTokens(user.getUid());
        }
        repo.update(COLLECTION, id, Map.of("name", user.getName(), "role", role));
        return user;
    }

    /** Issue a new temporary password and sign the user out everywhere. */
    public Map<String, Object> resetPassword(String id) throws Exception {
        Map<String, Object> doc = repo.findById(COLLECTION, id)
                .orElseThrow(() -> ApiException.notFound("User not found."));
        User user = toUser(doc);
        if (user.getUid() == null) throw ApiException.badRequest("This user has no sign-in account yet.");

        String password = generateTemporaryPassword();
        firebaseAuth.updateUser(new UserRecord.UpdateRequest(user.getUid()).setPassword(password));
        firebaseAuth.revokeRefreshTokens(user.getUid());
        log.info("Password reset for user '{}'", user.getUsername());
        return withPassword(user, password);
    }

    private static Map<String, Object> withPassword(User user, String password) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("user", user);
        out.put("temporaryPassword", password);
        return out;
    }

    private static void requireName(String name) {
        if (name == null || name.trim().length() < 2) throw new IllegalArgumentException("Full name is required.");
    }

    private static void requireRole(String role) {
        if (role == null || !ROLES.contains(role)) {
            throw new IllegalArgumentException("Role must be Administrator or Security Operator.");
        }
    }

    /**
     * Flip ACTIVE/INACTIVE. Disabling also disables the Auth account and revokes
     * refresh tokens, so an already-issued ID token stops working right away rather
     * than lingering until it expires.
     */
    public void toggleStatus(String id) throws Exception {
        Map<String, Object> doc = repo.findById(COLLECTION, id)
                .orElseThrow(() -> ApiException.notFound("User not found."));

        boolean nowActive = !"ACTIVE".equals(doc.getOrDefault("status", "ACTIVE"));
        String uid = (String) doc.get("uid");

        if (uid != null) {
            firebaseAuth.updateUser(new UserRecord.UpdateRequest(uid).setDisabled(!nowActive));
            if (!nowActive) firebaseAuth.revokeRefreshTokens(uid);
        }
        repo.update(COLLECTION, id, Map.of("status", nowActive ? "ACTIVE" : "INACTIVE"));
    }

    public void recordLogin(String uid) throws Exception {
        findByUid(uid).ifPresent(user -> {
            try {
                repo.update(COLLECTION, user.getId(), Map.of("lastLogin", Instant.now().toString()));
            } catch (Exception e) {
                log.warn("Could not record login for uid {}: {}", uid, e.getMessage());
            }
        });
    }

    /**
     * Seeds the two bootstrap accounts on an empty database (passwords from
     * `svems.auth.*-password`) and brings existing profiles in line with Firebase Auth:
     * every profile gets an Auth account, a role claim and a uid, and any legacy
     * BCrypt hash left over from the old password table is deleted.
     */
    public void seedDefaultUsers() throws Exception {
        List<Map<String, Object>> existing = repo.findAll(COLLECTION);

        if (existing.isEmpty()) {
            seedOne("System Administrator", "admin", adminPassword, AuthenticatedUser.ROLE_ADMIN);
            seedOne("Gate Operator", "operator", operatorPassword, AuthenticatedUser.ROLE_OPERATOR);
            log.info("Seeded default users into Firebase Auth + Firestore.");
            return;
        }

        for (Map<String, Object> doc : existing) {
            migrate(doc);
        }
    }

    private void seedOne(String name, String username, String password, String role) throws Exception {
        User user = User.builder()
                .name(name)
                .username(username)
                .email(emailFor(username))
                .role(role)
                .status("ACTIVE")
                .lastLogin("Not logged in")
                .build();

        UserRecord record = upsertAuthAccount(user, password);
        user.setUid(record.getUid());
        applyClaims(record.getUid(), user);
        repo.save(COLLECTION, toMap(user));
    }

    /** Bring one pre-existing profile up to the Firebase Auth model. */
    private void migrate(Map<String, Object> doc) {
        String id = (String) doc.get("id");
        String username = (String) doc.get("username");
        if (id == null || username == null) return;

        try {
            User user = toUser(doc);
            if (user.getEmail() == null) user.setEmail(emailFor(username));
            if (user.getRole() == null) user.setRole(AuthenticatedUser.ROLE_OPERATOR);

            // Only used if the Auth account is missing and has to be created; an
            // administrator can then issue a fresh one with "Reset password".
            String password = switch (username) {
                case "admin"    -> adminPassword;
                case "operator" -> operatorPassword;
                default         -> generateTemporaryPassword();
            };

            UserRecord record = upsertAuthAccount(user, password);
            applyClaims(record.getUid(), user);
            firebaseAuth.updateUser(new UserRecord.UpdateRequest(record.getUid())
                    .setDisabled(!"ACTIVE".equals(user.getStatus())));

            Map<String, Object> updates = new LinkedHashMap<>();
            updates.put("uid", record.getUid());
            updates.put("email", user.getEmail());
            updates.put("role", user.getRole());
            if (doc.containsKey("passwordHash")) {
                // Credentials now live in Firebase Auth — drop the stale hash.
                updates.put("passwordHash", FieldValue.delete());
            }
            repo.update(COLLECTION, id, updates);
            log.info("Linked user '{}' to Firebase Auth uid {}", username, record.getUid());
        } catch (Exception e) {
            log.error("Could not link user '{}' to Firebase Auth: {}", username, e.getMessage());
        }
    }

    /** Fetch the Auth account for this user's email, creating it if absent. */
    private UserRecord upsertAuthAccount(User user, String password) throws FirebaseAuthException {
        String email = user.getEmail() != null ? user.getEmail() : emailFor(user.getUsername());
        try {
            return firebaseAuth.getUserByEmail(email);
        } catch (FirebaseAuthException e) {
            if (e.getAuthErrorCode() != com.google.firebase.auth.AuthErrorCode.USER_NOT_FOUND) throw e;
            return firebaseAuth.createUser(new UserRecord.CreateRequest()
                    .setEmail(email)
                    .setPassword(password)
                    .setDisplayName(user.getName())
                    .setEmailVerified(true)   // synthetic domain; nothing to verify
                    .setDisabled(false));
        }
    }

    /**
     * Write role/username/name into the account's custom claims. These are copied
     * into every ID token Firebase mints, which is how both this API and the
     * Firestore rules learn who the caller is.
     */
    private void applyClaims(String uid, User user) throws FirebaseAuthException {
        firebaseAuth.setCustomUserClaims(uid, Map.of(
                "role", user.getRole(),
                "username", user.getUsername(),
                "name", user.getName() == null ? user.getUsername() : user.getName(),
                "admin", AuthenticatedUser.ROLE_ADMIN.equals(user.getRole())
        ));
    }

    private User toUser(Map<String, Object> m) {
        return User.builder()
                .id((String) m.get("id"))
                .uid((String) m.get("uid"))
                .name((String) m.get("name"))
                .username((String) m.get("username"))
                .email((String) m.get("email"))
                .role((String) m.get("role"))
                .status((String) m.getOrDefault("status", "ACTIVE"))
                .lastLogin((String) m.getOrDefault("lastLogin", ""))
                .build();
    }

    private Map<String, Object> toMap(User u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("uid", u.getUid());
        m.put("name", u.getName());
        m.put("username", u.getUsername());
        m.put("email", u.getEmail());
        m.put("role", u.getRole());
        m.put("status", u.getStatus());
        m.put("lastLogin", u.getLastLogin());
        return m;
    }
}
