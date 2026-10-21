package com.svems;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.TimeZone;

@SpringBootApplication
public class SvemsApplication {
    public static void main(String[] args) {
        // Every recorded time ("yyyy-MM-dd HH:mm") is in the site's local zone,
        // whatever zone the host machine or container runs in.
        TimeZone.setDefault(TimeZone.getTimeZone(
                System.getenv().getOrDefault("SVEMS_TIMEZONE", "Asia/Kolkata")));
        SpringApplication.run(SvemsApplication.class, args);
    }
}
