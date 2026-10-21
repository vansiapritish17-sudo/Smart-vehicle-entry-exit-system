package com.svems.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

/**
 * Serves the built React app (copied into {@code classpath:/static} by the Maven build)
 * so the whole system ships as one jar on one origin.
 *
 * Client-side routes such as /dashboard or /vehicles/abc have no file behind them, so
 * any non-API path that is not a real asset falls back to index.html and React Router
 * takes over. Unknown /api paths still 404.
 */
@Configuration
public class SpaConfig implements WebMvcConfigurer {

    private static final ClassPathResource INDEX = new ClassPathResource("/static/index.html");

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String path, Resource location) throws IOException {
                        Resource requested = location.createRelative(path);
                        if (requested.exists() && requested.isReadable()) return requested;
                        if (path.startsWith("api/")) return null;
                        return INDEX.exists() ? INDEX : null;
                    }
                });
    }
}
