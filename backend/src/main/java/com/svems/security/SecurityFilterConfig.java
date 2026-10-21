package com.svems.security;

import com.google.firebase.auth.FirebaseAuth;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

/**
 * Registers {@link FirebaseTokenFilter} across /api/*.
 *
 * Registering explicitly (rather than annotating the filter @Component) pins two
 * things that matter: the URL pattern, and the order relative to the CORS filter.
 * CORS must run first so that rejected requests still come back with the headers
 * the browser needs to read the 401 body.
 */
@Configuration
public class SecurityFilterConfig {

    /** Runs immediately after CorsConfig's filter — see CorsConfig#corsFilterRegistration. */
    public static final int TOKEN_FILTER_ORDER = Ordered.HIGHEST_PRECEDENCE + 10;

    @Bean
    public FirebaseTokenFilter firebaseTokenFilter(FirebaseAuth firebaseAuth) {
        return new FirebaseTokenFilter(firebaseAuth);
    }

    @Bean
    public FilterRegistrationBean<FirebaseTokenFilter> firebaseTokenFilterRegistration(
            FirebaseTokenFilter filter) {
        FilterRegistrationBean<FirebaseTokenFilter> registration = new FilterRegistrationBean<>(filter);
        registration.addUrlPatterns("/api/*");
        registration.setOrder(TOKEN_FILTER_ORDER);
        registration.setName("firebaseTokenFilter");
        return registration;
    }
}
