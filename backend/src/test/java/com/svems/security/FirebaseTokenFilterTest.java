package com.svems.security;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * The filter must judge a request by the path Spring MVC routes it to. Encoded or
 * decorated spellings of a protected path reach the same controller, so they must
 * meet the same checks.
 */
class FirebaseTokenFilterTest {

    private FirebaseAuth firebaseAuth;
    private FirebaseTokenFilter filter;

    @BeforeEach
    void setUp() {
        firebaseAuth = mock(FirebaseAuth.class);
        filter = new FirebaseTokenFilter(firebaseAuth);
        ReflectionTestUtils.setField(filter, "publicPaths", List.of("/api/health"));
        ReflectionTestUtils.setField(filter, "adminPaths", List.of("/api/users/**", "PUT:/api/configuration"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/users", "/%61pi/users", "/api/%75sers", "/api/users;x=1", "/api//users"})
    void requestsWithoutATokenAreRefusedHoweverThePathIsSpelled(String uri) throws Exception {
        MockFilterChain chain = new MockFilterChain();
        MockHttpServletResponse response = run(get(uri), chain);

        assertEquals(401, response.getStatus());
        assertNull(chain.getRequest(), "request must not reach the controller");
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/users", "/%61pi/users", "/api/users;x=1", "/api//users/abc"})
    void operatorsAreRefusedAdminRoutesHoweverThePathIsSpelled(String uri) throws Exception {
        signedInAs("Security Operator");
        MockHttpServletRequest request = get(uri);
        request.addHeader("Authorization", "Bearer token");
        MockFilterChain chain = new MockFilterChain();

        MockHttpServletResponse response = run(request, chain);

        assertEquals(403, response.getStatus());
        assertNull(chain.getRequest());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/configuration", "/%61pi/configuration", "/api/configuration;x=1"})
    void operatorsCannotSaveConfiguration(String uri) throws Exception {
        signedInAs("Security Operator");
        MockHttpServletRequest request = new MockHttpServletRequest("PUT", uri);
        request.addHeader("Authorization", "Bearer token");

        assertEquals(403, run(request, new MockFilterChain()).getStatus());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/health", "/api/health;x=1"})
    void publicPathsNeedNoToken(String uri) throws Exception {
        MockFilterChain chain = new MockFilterChain();
        run(get(uri), chain);
        assertEquals(uri, ((MockHttpServletRequest) chain.getRequest()).getRequestURI());
    }

    private void signedInAs(String role) throws Exception {
        FirebaseToken token = mock(FirebaseToken.class);
        when(token.getUid()).thenReturn("uid-1");
        when(token.getClaims()).thenReturn(Map.of("role", role, "username", "operator"));
        when(firebaseAuth.verifyIdToken(anyString(), anyBoolean())).thenReturn(token);
    }

    private static MockHttpServletRequest get(String uri) {
        return new MockHttpServletRequest("GET", uri);
    }

    private MockHttpServletResponse run(MockHttpServletRequest request, MockFilterChain chain) throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, chain);
        return response;
    }
}
