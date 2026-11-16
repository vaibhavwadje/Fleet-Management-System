package com.example.demo.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.example.demo.entity.ApplicationLog;

@Repository
public interface ApplicationLogRepository extends JpaRepository<ApplicationLog, Long> {

    /** Most recent first - the default view of a log table. */
    Page<ApplicationLog> findAllByOrderByLoggedAtDesc(Pageable pageable);

    /** Only the failures, for troubleshooting. */
    Page<ApplicationLog> findByStatusOrderByLoggedAtDesc(String status, Pageable pageable);

    /** Everything one request did, across the controller and service layers. */
    List<ApplicationLog> findByTraceIdOrderByLoggedAtAsc(String traceId);

    /**
     * Used by the retention clean-up.
     *
     * A derived delete needs a transaction of its own - without @Transactional
     * this throws TransactionRequiredException the moment it is called.
     */
    @Modifying
    @Transactional
    long deleteByLoggedAtBefore(LocalDateTime cutoff);
}
