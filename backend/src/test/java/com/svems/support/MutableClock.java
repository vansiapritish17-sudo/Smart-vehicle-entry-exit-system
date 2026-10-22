package com.svems.support;

import java.time.*;

/** A clock tests can move forward, to check stay durations exactly. */
public class MutableClock extends Clock {

    private Instant now;
    private final ZoneId zone;

    public MutableClock(LocalDateTime start, ZoneId zone) {
        this.now = start.atZone(zone).toInstant();
        this.zone = zone;
    }

    public void advance(Duration duration) {
        now = now.plus(duration);
    }

    @Override
    public ZoneId getZone() {
        return zone;
    }

    @Override
    public Clock withZone(ZoneId zone) {
        return new MutableClock(LocalDateTime.ofInstant(now, zone), zone);
    }

    @Override
    public Instant instant() {
        return now;
    }
}
