-- =====================================================================
--  Schema updates required by the frontend/backend integration work.
--
--  WHY THIS FILE EXISTS
--  Hibernate runs with spring.jpa.hibernate.ddl-auto=update. That setting
--  ADDS new columns, but it never RELAXES an existing NOT NULL constraint.
--  Two columns changed from NOT NULL to nullable in the entities, so on a
--  database that already has these tables you must run the statements
--  below once by hand.
--
--  A brand new database created from scratch does not need this file.
--
--  HOW TO RUN
--      mysql -u <user> -p fleetmanagement < schema-updates.sql
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. customer.city_id / customer.state_id must allow NULL
--
--    A customer signs up with only name, email, phone and password.
--    Their address is captured later (profile or booking), so these
--    columns cannot be mandatory or registration fails outright.
-- ---------------------------------------------------------------------

ALTER TABLE customer MODIFY COLUMN city_id  INT NULL;
ALTER TABLE customer MODIFY COLUMN state_id INT NULL;


-- ---------------------------------------------------------------------
-- 2. booking_header.car_id must allow NULL
--
--    Per the BRD the customer books a CAR TYPE. Staff choose the actual
--    vehicle at hand-over and it is stored in assigned_car_id, so car_id
--    is empty for every online booking.
-- ---------------------------------------------------------------------

ALTER TABLE booking_header MODIFY COLUMN car_id BIGINT NULL;


-- ---------------------------------------------------------------------
-- 3. New customer columns
--
--    Hibernate adds these automatically on startup. They are listed here
--    only so the change is visible in one place.
--
--    ALTER TABLE customer ADD COLUMN date_of_birth DATE NULL;
--    ALTER TABLE customer ADD COLUMN gender        VARCHAR(10) NULL;
--    ALTER TABLE customer ADD COLUMN nationality   VARCHAR(50) NULL;
-- ---------------------------------------------------------------------


-- ---------------------------------------------------------------------
-- 4. application_log - AOP database logging
--
--    Written by com.example.demo.aspect.LoggingAspect, one row per
--    advised method call. Hibernate creates this automatically on
--    startup with ddl-auto=update; the DDL is spelled out here so the
--    shape of the table is visible in one place, and so it can be
--    created by hand on an environment where ddl-auto is off.
--
--    message and stack_trace are TEXT because a stack trace routinely
--    runs to several kilobytes. The aspect truncates before saving, so
--    an over-long value can never fail the insert.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS application_log (
    log_id            BIGINT       NOT NULL AUTO_INCREMENT,

    logged_at         DATETIME     NOT NULL,
    log_level         VARCHAR(10)  NOT NULL,   -- INFO / WARN / ERROR
    status            VARCHAR(10)  NOT NULL,   -- SUCCESS / FAILURE

    class_name        VARCHAR(150) NOT NULL,
    method_name       VARCHAR(150) NOT NULL,
    layer             VARCHAR(20)  NULL,       -- CONTROLLER / SERVICE
    method_args       VARCHAR(500) NULL,       -- argument TYPES, never values

    execution_time_ms BIGINT       NULL,

    username          VARCHAR(150) NULL,       -- signed-in user or 'anonymous'
    http_method       VARCHAR(10)  NULL,
    request_uri       VARCHAR(500) NULL,
    client_ip         VARCHAR(45)  NULL,       -- 45 chars fits an IPv6 address
    trace_id          VARCHAR(40)  NULL,       -- groups one request's rows

    message           TEXT         NULL,
    exception_type    VARCHAR(200) NULL,
    stack_trace       TEXT         NULL,

    PRIMARY KEY (log_id),

    -- The three ways this table actually gets queried.
    KEY idx_app_log_logged_at (logged_at),
    KEY idx_app_log_status    (status),
    KEY idx_app_log_class     (class_name)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;


-- Useful queries
-- --------------
-- Everything that failed today:
--   SELECT logged_at, class_name, method_name, exception_type, message
--   FROM application_log
--   WHERE status = 'FAILURE' AND logged_at >= CURDATE()
--   ORDER BY logged_at DESC;
--
-- The slowest calls:
--   SELECT class_name, method_name, MAX(execution_time_ms) AS worst_ms,
--          ROUND(AVG(execution_time_ms)) AS avg_ms, COUNT(*) AS calls
--   FROM application_log
--   GROUP BY class_name, method_name
--   ORDER BY worst_ms DESC;
--
-- Everything one request did, controller and service together:
--   SELECT * FROM application_log WHERE trace_id = 'abcd1234'
--   ORDER BY logged_at;
--
-- Retention - this table grows faster than any other, so trim it:
--   DELETE FROM application_log
--   WHERE logged_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
