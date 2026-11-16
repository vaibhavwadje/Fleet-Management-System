package com.example.demo.service.impl;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.entity.ApplicationLog;
import com.example.demo.repository.ApplicationLogRepository;
import com.example.demo.service.ApplicationLogService;

/**
 * Writes one {@link ApplicationLog} row.
 *
 * TWO THINGS HERE ARE LOAD-BEARING
 * --------------------------------
 *
 * 1. REQUIRES_NEW
 *
 *    The interesting logs are the failures, and a failure normally means the
 *    business transaction is about to roll back. Saved in that same
 *    transaction, the log row would roll back with it - so the one case you
 *    most want a record of would be the one case that leaves no record.
 *
 *    REQUIRES_NEW suspends the caller's transaction and runs this insert in
 *    its own, which commits independently. The log survives the rollback.
 *
 * 2. The try / catch
 *
 *    Logging is a convenience. If the log table is missing, full, or locked,
 *    the customer's registration must still succeed. Every failure in here is
 *    swallowed and reported to the console logger instead, which is the one
 *    place that cannot itself fail.
 *
 * WHY A SEPARATE BEAN AND NOT A METHOD ON THE ASPECT
 * --------------------------------------------------
 * @Transactional is applied by a proxy, and a proxy only intercepts calls
 * that arrive from outside the bean. An aspect calling its own save method
 * would bypass the proxy entirely and get no new transaction at all - the
 * annotation would silently do nothing.
 */
@Service
public class ApplicationLogServiceImpl implements ApplicationLogService {

    /**
     * Note this logger is for problems with LOGGING itself. It must never be
     * routed back through the aspect, or a failing insert would try to log
     * the failure, which would fail, which would try to log it.
     */
    private static final Logger log =
            LoggerFactory.getLogger(ApplicationLogServiceImpl.class);

    private final ApplicationLogRepository applicationLogRepository;

    public ApplicationLogServiceImpl(
            ApplicationLogRepository applicationLogRepository) {
        this.applicationLogRepository = applicationLogRepository;
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void save(ApplicationLog entry) {

        try {
            applicationLogRepository.save(entry);

        } catch (Exception ex) {
            // Deliberately swallowed. The request carries on.
            log.error("Could not write application log row for {}.{}(): {}",
                    entry.getClassName(),
                    entry.getMethodName(),
                    ex.getMessage());
        }
    }
}
