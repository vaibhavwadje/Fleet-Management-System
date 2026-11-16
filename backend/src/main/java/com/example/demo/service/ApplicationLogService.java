package com.example.demo.service;

import com.example.demo.entity.ApplicationLog;

public interface ApplicationLogService {

    /**
     * Persists one log row in its own transaction, so it survives a rollback
     * of whatever the application was doing when the log was written.
     *
     * Never throws. A logging failure must not be able to fail a request.
     */
    void save(ApplicationLog entry);
}
