-- =====================================================================
--  FLEMAN — seed data
--
--  Run this ONCE against a fresh database, AFTER starting the backend
--  so Hibernate (ddl-auto=update) has created all the tables.
--
--      mysql -u root -p fleetmanagement < seed-data.sql
--
--  Contents
--    1. state           8 rows    real Indian states
--    2. city           14 rows    real cities
--    3. hub            22 rows    14 airport hubs + 8 city hubs
--    4. airport        14 rows    real names and IATA codes
--    5. car_type      110 rows    5 classes x 22 hubs (generated)
--    6. addon         132 rows    6 add-ons x 22 hubs (generated)
--    7. car            42 rows    real Indian models, 7 busiest hubs
--    8. staff          10 rows    one per major hub
--    9. customer        8 rows
--   10. bookings        3 rows    OPTIONAL - see section 10
--
--  LOGIN FOR EVERY SEEDED ACCOUNT
--      password: Password@123
--      (BCrypt $2a$10$..., verified against Spring's BCryptPasswordEncoder)
--
--  Explicit primary keys are used for state / city / hub / airport so the
--  foreign keys below stay readable. That is safe on a fresh database -
--  MySQL continues AUTO_INCREMENT from the highest value inserted.
-- =====================================================================

SET NAMES utf8mb4;

-- MySQL Workbench runs with "safe updates" on by default, which rejects any
-- DELETE that has no WHERE clause on a key column (Error 1175). We are
-- deliberately clearing whole tables here, so switch it off for this session.
-- It is restored at the bottom of the file.
SET SQL_SAFE_UPDATES = 0;

-- Let us delete parents before children without upsetting the foreign keys.
SET FOREIGN_KEY_CHECKS = 0;

-- Start from a clean slate (child tables first).
DELETE FROM invoice_detail;
DELETE FROM invoice_header;
DELETE FROM booking_detail;
DELETE FROM booking_header;
DELETE FROM car;
DELETE FROM addon;
DELETE FROM car_type;
DELETE FROM airport;
DELETE FROM staff;
DELETE FROM customer;
DELETE FROM hub;
DELETE FROM city;
DELETE FROM state;

-- Re-runnable: restart the auto-increment counters that this file does not
-- set explicitly, so ids stay tidy if you load the seed data more than once.
ALTER TABLE car_type       AUTO_INCREMENT = 1;
ALTER TABLE addon          AUTO_INCREMENT = 1;
ALTER TABLE car            AUTO_INCREMENT = 1;
ALTER TABLE staff          AUTO_INCREMENT = 1;
ALTER TABLE booking_detail AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;


-- =====================================================================
-- 1. STATE
-- =====================================================================

INSERT INTO state (state_id, state_name, created_at, updated_at) VALUES
  (1, 'Maharashtra',   NOW(), NOW()),
  (2, 'Delhi',         NOW(), NOW()),
  (3, 'Karnataka',     NOW(), NOW()),
  (4, 'Tamil Nadu',    NOW(), NOW()),
  (5, 'Telangana',     NOW(), NOW()),
  (6, 'West Bengal',   NOW(), NOW()),
  (7, 'Gujarat',       NOW(), NOW()),
  (8, 'Rajasthan',     NOW(), NOW());


-- =====================================================================
-- 2. CITY
-- =====================================================================

INSERT INTO city (city_id, city_name, state_id, created_at, updated_at) VALUES
  ( 1, 'Mumbai',      1, NOW(), NOW()),
  ( 2, 'Pune',        1, NOW(), NOW()),
  ( 3, 'Nagpur',      1, NOW(), NOW()),
  ( 4, 'New Delhi',   2, NOW(), NOW()),
  ( 5, 'Bengaluru',   3, NOW(), NOW()),
  ( 6, 'Mysuru',      3, NOW(), NOW()),
  ( 7, 'Chennai',     4, NOW(), NOW()),
  ( 8, 'Coimbatore',  4, NOW(), NOW()),
  ( 9, 'Hyderabad',   5, NOW(), NOW()),
  (10, 'Kolkata',     6, NOW(), NOW()),
  (11, 'Ahmedabad',   7, NOW(), NOW()),
  (12, 'Surat',       7, NOW(), NOW()),
  (13, 'Jaipur',      8, NOW(), NOW()),
  (14, 'Udaipur',     8, NOW(), NOW());


-- =====================================================================
-- 3. HUB
--    hub_type is the HubType enum: 'AIRPORT' or 'HUB'.
--    Hubs 1-14 sit at airports, hubs 15-22 are city branches.
-- =====================================================================

INSERT INTO hub (hub_id, hub_name, hub_type, address_line_1, address_line_2,
                 city_id, state_id, pincode, phone, created_at, updated_at) VALUES
  ( 1, 'Mumbai Airport Hub - Terminal 2', 'AIRPORT', 'Chhatrapati Shivaji Maharaj Intl Airport', 'Andheri East',            1, 1, '400099', '02226813000', NOW(), NOW()),
  ( 2, 'Pune Airport Hub',                'AIRPORT', 'Pune Airport, New Airport Road',           'Lohegaon',                2, 1, '411032', '02026685201', NOW(), NOW()),
  ( 3, 'Nagpur Airport Hub',              'AIRPORT', 'Dr. Babasaheb Ambedkar Intl Airport',      'Sonegaon',                3, 1, '440005', '07122051000', NOW(), NOW()),
  ( 4, 'Delhi Airport Hub - Terminal 3',  'AIRPORT', 'Indira Gandhi International Airport',      'Aerocity',                4, 2, '110037', '01125676789', NOW(), NOW()),
  ( 5, 'Bengaluru Airport Hub',           'AIRPORT', 'Kempegowda International Airport',         'Devanahalli',             5, 3, '560300', '08066782255', NOW(), NOW()),
  ( 6, 'Mysuru Airport Hub',              'AIRPORT', 'Mysuru Airport',                           'Mandakalli',              6, 3, '571311', '08212402400', NOW(), NOW()),
  ( 7, 'Chennai Airport Hub',             'AIRPORT', 'Chennai International Airport',            'Meenambakkam',            7, 4, '600027', '04422560551', NOW(), NOW()),
  ( 8, 'Coimbatore Airport Hub',          'AIRPORT', 'Coimbatore International Airport',         'Peelamedu',               8, 4, '641014', '04222594000', NOW(), NOW()),
  ( 9, 'Hyderabad Airport Hub',           'AIRPORT', 'Rajiv Gandhi International Airport',       'Shamshabad',              9, 5, '500409', '04066546370', NOW(), NOW()),
  (10, 'Kolkata Airport Hub',             'AIRPORT', 'Netaji Subhas Chandra Bose Intl Airport',  'Dum Dum',                10, 6, '700052', '03325118787', NOW(), NOW()),
  (11, 'Ahmedabad Airport Hub',           'AIRPORT', 'Sardar Vallabhbhai Patel Intl Airport',    'Hansol',                 11, 7, '380003', '07922869211', NOW(), NOW()),
  (12, 'Surat Airport Hub',               'AIRPORT', 'Surat Airport',                            'Magdalla',               12, 7, '395007', '02612463366', NOW(), NOW()),
  (13, 'Jaipur Airport Hub',              'AIRPORT', 'Jaipur International Airport',             'Sanganer',               13, 8, '302029', '01412550623', NOW(), NOW()),
  (14, 'Udaipur Airport Hub',             'AIRPORT', 'Maharana Pratap Airport',                  'Dabok',                  14, 8, '313022', '02942655453', NOW(), NOW()),

  (15, 'Bandra Kurla Complex Hub',        'HUB',     'Unit 4, G Block, BKC',                     'Bandra East',             1, 1, '400051', '02261234500', NOW(), NOW()),
  (16, 'Andheri East City Hub',           'HUB',     'Chakala, Andheri Kurla Road',              'Andheri East',            1, 1, '400069', '02261234600', NOW(), NOW()),
  (17, 'Hinjawadi City Hub',              'HUB',     'Phase 1, Rajiv Gandhi Infotech Park',      'Hinjawadi',               2, 1, '411057', '02067123400', NOW(), NOW()),
  (18, 'Connaught Place Hub',             'HUB',     'N Block, Outer Circle',                    'Connaught Place',         4, 2, '110001', '01143215000', NOW(), NOW()),
  (19, 'Koramangala City Hub',            'HUB',     '80 Feet Road, 4th Block',                  'Koramangala',             5, 3, '560034', '08041234500', NOW(), NOW()),
  (20, 'T. Nagar City Hub',               'HUB',     'Usman Road, T. Nagar',                     'Thyagaraya Nagar',        7, 4, '600017', '04428150000', NOW(), NOW()),
  (21, 'Banjara Hills Hub',               'HUB',     'Road No. 12, Banjara Hills',               'Banjara Hills',           9, 5, '500034', '04023550000', NOW(), NOW()),
  (22, 'Salt Lake City Hub',              'HUB',     'Sector V, Salt Lake',                      'Bidhannagar',            10, 6, '700064', '03340051000', NOW(), NOW());


-- =====================================================================
-- 4. AIRPORT
--    Real airport names and IATA codes. Each one points at its hub.
-- =====================================================================

INSERT INTO airport (airport_id, airport_name, airport_code,
                     city_id, state_id, hub_id, created_at, updated_at) VALUES
  ( 1, 'Chhatrapati Shivaji Maharaj International Airport',   'BOM',  1, 1,  1, NOW(), NOW()),
  ( 2, 'Pune Airport',                                        'PNQ',  2, 1,  2, NOW(), NOW()),
  ( 3, 'Dr. Babasaheb Ambedkar International Airport',        'NAG',  3, 1,  3, NOW(), NOW()),
  ( 4, 'Indira Gandhi International Airport',                 'DEL',  4, 2,  4, NOW(), NOW()),
  ( 5, 'Kempegowda International Airport',                    'BLR',  5, 3,  5, NOW(), NOW()),
  ( 6, 'Mysuru Airport',                                      'MYQ',  6, 3,  6, NOW(), NOW()),
  ( 7, 'Chennai International Airport',                       'MAA',  7, 4,  7, NOW(), NOW()),
  ( 8, 'Coimbatore International Airport',                    'CJB',  8, 4,  8, NOW(), NOW()),
  ( 9, 'Rajiv Gandhi International Airport',                  'HYD',  9, 5,  9, NOW(), NOW()),
  (10, 'Netaji Subhas Chandra Bose International Airport',    'CCU', 10, 6, 10, NOW(), NOW()),
  (11, 'Sardar Vallabhbhai Patel International Airport',      'AMD', 11, 7, 11, NOW(), NOW()),
  (12, 'Surat Airport',                                       'STV', 12, 7, 12, NOW(), NOW()),
  (13, 'Jaipur International Airport',                        'JAI', 13, 8, 13, NOW(), NOW()),
  (14, 'Maharana Pratap Airport',                             'UDR', 14, 8, 14, NOW(), NOW());


-- =====================================================================
-- 5. CAR_TYPE  (rate card)
--
--    A customer books a car TYPE, so every hub needs the full rate card.
--    Rather than writing 110 rows by hand we cross-join the 5 classes of
--    the CarClass enum against every hub.
--
--    Rates are in INR and reflect typical Indian self-drive pricing.
-- =====================================================================

INSERT INTO car_type (car_class, car_type, image_url,
                      daily_rate, weekly_rate, monthly_rate,
                      hub_id, effective_from, effective_to,
                      created_at, updated_at)
SELECT
    t.car_class,
    t.car_type,
    t.image_url,
    t.daily_rate,
    t.weekly_rate,
    t.monthly_rate,
    h.hub_id,
    '2026-01-01',
    '2026-12-31',
    NOW(), NOW()
FROM hub h
CROSS JOIN (
    SELECT 'SMALL'        AS car_class, 'Small Hatchback'   AS car_type, 1800 AS daily_rate, 10800 AS weekly_rate,  38000 AS monthly_rate, 'https://images.unsplash.com/photo-1619682817481-e994891cd1f5?w=800&h=500&fit=crop' AS image_url
    UNION ALL SELECT 'COMPACT',      'Compact Hatchback',      2200, 13200,  46000, 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&h=500&fit=crop'
    UNION ALL SELECT 'INTERMEDIATE', 'Intermediate Sedan',     2800, 16800,  58000, 'https://images.unsplash.com/photo-1550355291-bbee04a92027?w=800&h=500&fit=crop'
    UNION ALL SELECT 'SEDAN',        'Premium Sedan',          3500, 21000,  72000, 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&h=500&fit=crop'
    UNION ALL SELECT 'SUV',          'Full Size SUV',          4800, 28800,  99000, 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=500&fit=crop'
) t;


-- =====================================================================
-- 6. ADDON
--
--    Same idea: every hub offers the same six add-ons.
--    NOTE: the booking screen looks for an add-on whose name contains
--    "insurance", so keep "Full Insurance Cover" named as it is.
-- =====================================================================

INSERT INTO addon (addon_name, `description`, price_per_day, hub_id,
                   available_quantity, effective_from, effective_to,
                   created_at, updated_at)
SELECT
    a.addon_name,
    a.description,
    a.price_per_day,
    h.hub_id,
    a.available_quantity,
    '2026-01-01',
    '2026-12-31',
    NOW(), NOW()
FROM hub h
CROSS JOIN (
    SELECT 'Full Insurance Cover'     AS addon_name, 'Zero-deductible damage and theft protection for the whole rental.' AS description, 499 AS price_per_day, 50 AS available_quantity
    UNION ALL SELECT 'Additional Driver',      'Register a second driver on the rental agreement.',                 250, 30
    UNION ALL SELECT 'Child Safety Seat',      'ISOFIX child seat suitable for 9 to 36 kg.',                        199, 20
    UNION ALL SELECT 'GPS Navigation Device',  'Pre-loaded India maps with live traffic.',                          149, 25
    UNION ALL SELECT 'Roadside Assistance Plus','24x7 breakdown cover, towing and on-site help anywhere in India.',  299, 60
    UNION ALL SELECT 'Portable Wi-Fi Hotspot', '4G hotspot with unlimited data, connects up to 5 devices.',          199, 15
) a;


-- =====================================================================
-- 7. CAR
--
--    Real models sold in India, mapped to the matching car_type of the
--    same hub. Registration numbers follow the Indian format and the
--    state code matches the hub's state.
--
--    Cars are seeded for the seven busiest hubs. Other hubs still show
--    car types (customers can book), they simply have no vehicles for
--    staff to assign yet.
--
--    car_type_id is resolved with a sub-query so this works no matter
--    what ids section 5 generated.
--    status is the CarStatus enum: AVAILABLE / RENTED / MAINTENANCE / RETIRED.
-- =====================================================================

INSERT INTO car (car_type_id, hub_id, registration_no, model_name, brand_name,
                 `year`, color, transmission, mileage, fuel_type,
                 fuel_capacity_liters, seat_capacity, service_due_date,
                 `status`, image, created_at, updated_at)
SELECT
    (SELECT car_type_id FROM car_type ct
      WHERE ct.hub_id = v.hub_id AND ct.car_class = v.car_class),
    v.hub_id, v.registration_no, v.model_name, v.brand_name,
    v.model_year, v.color, v.transmission, v.mileage, v.fuel_type,
    v.fuel_capacity, v.seat_capacity, v.service_due_date,
    v.car_status, v.image, NOW(), NOW()
FROM (
    -- ---- Hub 1 : Mumbai Airport (MH) ----
    SELECT 1 AS hub_id, 'SMALL'        AS car_class, 'MH01AB1234' AS registration_no, 'Swift'     AS model_name, 'Maruti Suzuki' AS brand_name, 2023 AS model_year, 'Pearl White'  AS color, 'Manual'    AS transmission, 22.4 AS mileage, 'Petrol' AS fuel_type, 37.0 AS fuel_capacity, 5 AS seat_capacity, '2026-11-15' AS service_due_date, 'AVAILABLE' AS car_status, 'https://images.unsplash.com/photo-1619682817481-e994891cd1f5?w=800&h=500&fit=crop' AS image
    UNION ALL SELECT 1, 'COMPACT',      'MH01CD5678', 'Baleno',   'Maruti Suzuki', 2024, 'Nexa Blue',    'Automatic', 22.9, 'Petrol', 37.0, 5, '2026-12-01', 'AVAILABLE', 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&h=500&fit=crop'
    UNION ALL SELECT 1, 'INTERMEDIATE', 'MH01EF9012', 'City',     'Honda',         2024, 'Platinum Silver','Automatic', 18.4, 'Petrol', 40.0, 5, '2026-10-20', 'AVAILABLE', 'https://images.unsplash.com/photo-1550355291-bbee04a92027?w=800&h=500&fit=crop'
    UNION ALL SELECT 1, 'SEDAN',        'MH01GH3456', 'Slavia',   'Skoda',         2024, 'Crystal Blue', 'Automatic', 19.6, 'Petrol', 45.0, 5, '2027-01-10', 'AVAILABLE', 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&h=500&fit=crop'
    UNION ALL SELECT 1, 'SUV',          'MH01IJ7890', 'XUV700',   'Mahindra',      2024, 'Midnight Black','Automatic', 16.0, 'Diesel', 60.0, 7, '2026-09-30', 'AVAILABLE', 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=500&fit=crop'
    UNION ALL SELECT 1, 'SUV',          'MH01KL2345', 'Harrier',  'Tata',          2023, 'Calypso Red',  'Manual',    16.8, 'Diesel', 50.0, 5, '2026-08-25', 'MAINTENANCE', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=500&fit=crop'

    -- ---- Hub 15 : Bandra Kurla Complex, Mumbai (MH) ----
    UNION ALL SELECT 15, 'SMALL',        'MH02AB1111', 'Tiago',   'Tata',          2023, 'Arizona Blue', 'Manual',    19.0, 'Petrol', 35.0, 5, '2026-11-05', 'AVAILABLE', 'https://images.unsplash.com/photo-1619682817481-e994891cd1f5?w=800&h=500&fit=crop'
    UNION ALL SELECT 15, 'COMPACT',      'MH02CD2222', 'Altroz',  'Tata',          2024, 'Opera Blue',   'Manual',    19.3, 'Petrol', 37.0, 5, '2026-12-12', 'AVAILABLE', 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&h=500&fit=crop'
    UNION ALL SELECT 15, 'INTERMEDIATE', 'MH02EF3333', 'Verna',   'Hyundai',       2024, 'Fiery Red',    'Automatic', 20.6, 'Petrol', 45.0, 5, '2027-02-18', 'AVAILABLE', 'https://images.unsplash.com/photo-1550355291-bbee04a92027?w=800&h=500&fit=crop'
    UNION ALL SELECT 15, 'SEDAN',        'MH02GH4444', 'Virtus',  'Volkswagen',    2024, 'Wild Cherry',  'Automatic', 19.4, 'Petrol', 45.0, 5, '2026-10-08', 'AVAILABLE', 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&h=500&fit=crop'
    UNION ALL SELECT 15, 'SUV',          'MH02IJ5555', 'Creta',   'Hyundai',       2024, 'Titan Grey',   'Automatic', 17.4, 'Petrol', 50.0, 5, '2026-11-28', 'AVAILABLE', 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=500&fit=crop'
    UNION ALL SELECT 15, 'SUV',          'MH02KL6666', 'Fortuner','Toyota',        2023, 'Attitude Black','Automatic', 14.2, 'Diesel', 80.0, 7, '2026-09-14', 'AVAILABLE', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=500&fit=crop'

    -- ---- Hub 2 : Pune Airport (MH) ----
    UNION ALL SELECT 2, 'SMALL',        'MH12AB7777', 'i20',      'Hyundai',       2023, 'Polar White',  'Manual',    20.3, 'Petrol', 37.0, 5, '2026-10-30', 'AVAILABLE', 'https://images.unsplash.com/photo-1619682817481-e994891cd1f5?w=800&h=500&fit=crop'
    UNION ALL SELECT 2, 'COMPACT',      'MH12CD8888', 'Jazz',     'Honda',         2023, 'Radiant Red',  'Manual',    17.1, 'Petrol', 40.0, 5, '2026-12-22', 'AVAILABLE', 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&h=500&fit=crop'
    UNION ALL SELECT 2, 'INTERMEDIATE', 'MH12EF9999', 'Ciaz',     'Maruti Suzuki', 2024, 'Grandeur Grey','Automatic', 20.6, 'Petrol', 43.0, 5, '2027-01-25', 'AVAILABLE', 'https://images.unsplash.com/photo-1550355291-bbee04a92027?w=800&h=500&fit=crop'
    UNION ALL SELECT 2, 'SEDAN',        'MH12GH1010', 'Camry',    'Toyota',        2024, 'Graphite',     'Automatic', 25.5, 'Hybrid', 50.0, 5, '2026-11-11', 'AVAILABLE', 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&h=500&fit=crop'
    UNION ALL SELECT 2, 'SUV',          'MH12IJ1212', 'Hector',   'MG',            2023, 'Starry Sky',   'Automatic', 15.6, 'Diesel', 60.0, 5, '2026-08-19', 'AVAILABLE', 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=500&fit=crop'
    UNION ALL SELECT 2, 'SUV',          'MH12KL1313', 'Safari',   'Tata',          2024, 'Cosmic Gold',  'Automatic', 16.1, 'Diesel', 50.0, 7, '2027-03-05', 'AVAILABLE', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=500&fit=crop'

    -- ---- Hub 4 : Delhi Airport (DL) ----
    UNION ALL SELECT 4, 'SMALL',        'DL01AB2468', 'Swift',    'Maruti Suzuki', 2024, 'Solid Fire Red','Manual',   22.4, 'Petrol', 37.0, 5, '2026-12-05', 'AVAILABLE', 'https://images.unsplash.com/photo-1619682817481-e994891cd1f5?w=800&h=500&fit=crop'
    UNION ALL SELECT 4, 'COMPACT',      'DL02CD1357', 'Baleno',   'Maruti Suzuki', 2023, 'Luxe Beige',   'Automatic', 22.9, 'Petrol', 37.0, 5, '2026-10-16', 'AVAILABLE', 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&h=500&fit=crop'
    UNION ALL SELECT 4, 'INTERMEDIATE', 'DL03EF2469', 'City',     'Honda',         2024, 'Obsidian Blue','Automatic', 18.4, 'Petrol', 40.0, 5, '2027-02-01', 'AVAILABLE', 'https://images.unsplash.com/photo-1550355291-bbee04a92027?w=800&h=500&fit=crop'
    UNION ALL SELECT 4, 'SEDAN',        'DL04GH3690', 'Superb',   'Skoda',         2023, 'Quartz Grey',  'Automatic', 15.1, 'Petrol', 66.0, 5, '2026-09-21', 'AVAILABLE', 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&h=500&fit=crop'
    UNION ALL SELECT 4, 'SUV',          'DL05IJ4802', 'XUV700',   'Mahindra',      2024, 'Everest White','Automatic', 16.0, 'Diesel', 60.0, 7, '2026-11-19', 'AVAILABLE', 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=500&fit=crop'
    UNION ALL SELECT 4, 'SUV',          'DL06KL5913', 'Creta',    'Hyundai',       2024, 'Ranger Khaki', 'Manual',    17.4, 'Diesel', 50.0, 5, '2027-01-30', 'AVAILABLE', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=500&fit=crop'

    -- ---- Hub 5 : Bengaluru Airport (KA) ----
    UNION ALL SELECT 5, 'SMALL',        'KA01AB1470', 'Tiago',    'Tata',          2023, 'Daytona Grey', 'Manual',    19.0, 'Petrol', 35.0, 5, '2026-10-09', 'AVAILABLE', 'https://images.unsplash.com/photo-1619682817481-e994891cd1f5?w=800&h=500&fit=crop'
    UNION ALL SELECT 5, 'COMPACT',      'KA02CD2581', 'i20',      'Hyundai',       2024, 'Fiery Red',    'Automatic', 20.3, 'Petrol', 37.0, 5, '2026-12-28', 'AVAILABLE', 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&h=500&fit=crop'
    UNION ALL SELECT 5, 'INTERMEDIATE', 'KA03EF3692', 'Verna',    'Hyundai',       2024, 'Abyss Black',  'Automatic', 20.6, 'Petrol', 45.0, 5, '2027-02-14', 'AVAILABLE', 'https://images.unsplash.com/photo-1550355291-bbee04a92027?w=800&h=500&fit=crop'
    UNION ALL SELECT 5, 'SEDAN',        'KA04GH4703', 'Virtus',   'Volkswagen',    2024, 'Curcuma Yellow','Automatic', 19.4, 'Petrol', 45.0, 5, '2026-11-02', 'AVAILABLE', 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&h=500&fit=crop'
    UNION ALL SELECT 5, 'SUV',          'KA05IJ5814', 'Nexon',    'Tata',          2024, 'Creative Ocean','Automatic', 17.4, 'Petrol', 44.0, 5, '2026-09-08', 'AVAILABLE', 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=500&fit=crop'
    UNION ALL SELECT 5, 'SUV',          'KA06KL6925', 'Fortuner', 'Toyota',        2023, 'Super White',  'Automatic', 14.2, 'Diesel', 80.0, 7, '2026-08-27', 'RETIRED',   'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=500&fit=crop'

    -- ---- Hub 7 : Chennai Airport (TN) ----
    UNION ALL SELECT 7, 'SMALL',        'TN01AB3141', 'Swift',    'Maruti Suzuki', 2023, 'Metallic Silver','Manual',  22.4, 'Petrol', 37.0, 5, '2026-11-23', 'AVAILABLE', 'https://images.unsplash.com/photo-1619682817481-e994891cd1f5?w=800&h=500&fit=crop'
    UNION ALL SELECT 7, 'COMPACT',      'TN02CD5926', 'Altroz',   'Tata',          2024, 'Harbour Blue', 'Manual',    19.3, 'Diesel', 37.0, 5, '2027-01-17', 'AVAILABLE', 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&h=500&fit=crop'
    UNION ALL SELECT 7, 'INTERMEDIATE', 'TN03EF5358', 'Ciaz',     'Maruti Suzuki', 2023, 'Nexa Blue',    'Automatic', 20.6, 'Petrol', 43.0, 5, '2026-10-11', 'AVAILABLE', 'https://images.unsplash.com/photo-1550355291-bbee04a92027?w=800&h=500&fit=crop'
    UNION ALL SELECT 7, 'SEDAN',        'TN04GH9793', 'Camry',    'Toyota',        2024, 'Emotional Red','Automatic', 25.5, 'Hybrid', 50.0, 5, '2027-03-22', 'AVAILABLE', 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&h=500&fit=crop'
    UNION ALL SELECT 7, 'SUV',          'TN05IJ2384', 'Hector',   'MG',            2024, 'Glaze Red',    'Automatic', 15.6, 'Diesel', 60.0, 7, '2026-09-05', 'AVAILABLE', 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=500&fit=crop'
    UNION ALL SELECT 7, 'SUV',          'TN06KL6264', 'Harrier',  'Tata',          2024, 'Ash Grey',     'Automatic', 16.8, 'Diesel', 50.0, 5, '2026-12-16', 'AVAILABLE', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=500&fit=crop'

    -- ---- Hub 9 : Hyderabad Airport (TS) ----
    UNION ALL SELECT 9, 'SMALL',        'TS07AB3383', 'i20',      'Hyundai',       2024, 'Typhoon Silver','Manual',   20.3, 'Petrol', 37.0, 5, '2026-11-07', 'AVAILABLE', 'https://images.unsplash.com/photo-1619682817481-e994891cd1f5?w=800&h=500&fit=crop'
    UNION ALL SELECT 9, 'COMPACT',      'TS08CD4494', 'Baleno',   'Maruti Suzuki', 2023, 'Splendid Silver','Automatic', 22.9, 'Petrol', 37.0, 5, '2026-10-25', 'AVAILABLE', 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&h=500&fit=crop'
    UNION ALL SELECT 9, 'INTERMEDIATE', 'TS09EF5505', 'City',     'Honda',         2024, 'Lunar Silver', 'Automatic', 18.4, 'Petrol', 40.0, 5, '2027-02-09', 'AVAILABLE', 'https://images.unsplash.com/photo-1550355291-bbee04a92027?w=800&h=500&fit=crop'
    UNION ALL SELECT 9, 'SEDAN',        'TS10GH6616', 'Slavia',   'Skoda',         2024, 'Tornado Red',  'Automatic', 19.6, 'Petrol', 45.0, 5, '2026-12-03', 'AVAILABLE', 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&h=500&fit=crop'
    UNION ALL SELECT 9, 'SUV',          'TS11IJ7727', 'Creta',    'Hyundai',       2024, 'Atlas White',  'Automatic', 17.4, 'Petrol', 50.0, 5, '2026-09-18', 'AVAILABLE', 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=500&fit=crop'
    UNION ALL SELECT 9, 'SUV',          'TS12KL8838', 'Scorpio N','Mahindra',      2023, 'Napoli Black', 'Manual',    15.4, 'Diesel', 57.0, 7, '2026-08-31', 'MAINTENANCE', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=500&fit=crop'
) v;


-- =====================================================================
-- 8. STAFF
--
--    Password for every account below: Password@123
--    Sign in on the login screen using the "Staff" tab.
--
--    A staff member only ever sees the bookings and vehicles of their
--    own hub, so seed at least one person per hub you want to demo.
-- =====================================================================

INSERT INTO staff (first_name, last_name, email, gender, date_of_birth,
                   password_hash, phone, address_line_1, address_line_2,
                   city_name, state_name, hub_id, created_at, updated_at) VALUES
  ('Rajesh',  'Kumar',      'rajesh.kumar@fleman.in',    'Male',   '1988-04-12', '$2a$10$oD.aMdby3tbTmIKSQY.sk.jvDuNSQdppkJ/g41CL1GVpSbE.RUvTG', '9820011001', '12 Sahar Road',            'Andheri East',     'Mumbai',    'Maharashtra', 1,  NOW(), NOW()),
  ('Meena',   'Iyer',       'meena.iyer@fleman.in',      'Female', '1991-09-03', '$2a$10$oD.aMdby3tbTmIKSQY.sk.jvDuNSQdppkJ/g41CL1GVpSbE.RUvTG', '9820011002', 'B-403, Kalpataru Heights', 'Bandra East',      'Mumbai',    'Maharashtra', 15, NOW(), NOW()),
  ('Suresh',  'Pillai',     'suresh.pillai@fleman.in',   'Male',   '1985-12-21', '$2a$10$oD.aMdby3tbTmIKSQY.sk.jvDuNSQdppkJ/g41CL1GVpSbE.RUvTG', '9822011003', '7 Airport Road',           'Lohegaon',         'Pune',      'Maharashtra', 2,  NOW(), NOW()),
  ('Amit',    'Sinha',      'amit.sinha@fleman.in',      'Male',   '1983-07-30', '$2a$10$oD.aMdby3tbTmIKSQY.sk.jvDuNSQdppkJ/g41CL1GVpSbE.RUvTG', '9811011004', 'C-22, Aerocity',           'Near IGI T3',      'New Delhi', 'Delhi',       4,  NOW(), NOW()),
  ('Kavitha', 'Raman',      'kavitha.raman@fleman.in',   'Female', '1993-02-17', '$2a$10$oD.aMdby3tbTmIKSQY.sk.jvDuNSQdppkJ/g41CL1GVpSbE.RUvTG', '9845011005', '18 Airport Road',          'Devanahalli',      'Bengaluru', 'Karnataka',   5,  NOW(), NOW()),
  ('Arun',    'Balakrishnan','arun.b@fleman.in',         'Male',   '1990-06-08', '$2a$10$oD.aMdby3tbTmIKSQY.sk.jvDuNSQdppkJ/g41CL1GVpSbE.RUvTG', '9840011006', '5 GST Road',               'Meenambakkam',     'Chennai',   'Tamil Nadu',  7,  NOW(), NOW()),
  ('Sneha',   'Reddy',      'sneha.reddy@fleman.in',     'Female', '1994-11-25', '$2a$10$oD.aMdby3tbTmIKSQY.sk.jvDuNSQdppkJ/g41CL1GVpSbE.RUvTG', '9848011007', '9 Airport Approach Road',  'Shamshabad',       'Hyderabad', 'Telangana',   9,  NOW(), NOW()),
  ('Vikram',  'Nair',       'vikram.nair@fleman.in',     'Male',   '1987-03-14', '$2a$10$oD.aMdby3tbTmIKSQY.sk.jvDuNSQdppkJ/g41CL1GVpSbE.RUvTG', '9811011008', 'N-14, Outer Circle',       'Connaught Place',  'New Delhi', 'Delhi',       18, NOW(), NOW()),
  ('Priya',   'Deshmukh',   'priya.deshmukh@fleman.in',  'Female', '1992-08-19', '$2a$10$oD.aMdby3tbTmIKSQY.sk.jvDuNSQdppkJ/g41CL1GVpSbE.RUvTG', '9823011009', 'Phase 1, Infotech Park',   'Hinjawadi',        'Pune',      'Maharashtra', 17, NOW(), NOW()),
  ('Deepak',  'Joshi',      'deepak.joshi@fleman.in',    'Male',   '1989-05-27', '$2a$10$oD.aMdby3tbTmIKSQY.sk.jvDuNSQdppkJ/g41CL1GVpSbE.RUvTG', '9830011010', 'Sector V, Salt Lake',      'Bidhannagar',      'Kolkata',   'West Bengal', 22, NOW(), NOW());


-- =====================================================================
-- 9. CUSTOMER
--
--    Password for every account below: Password@123
--    Sign in on the login screen using the "Customer" tab.
--
--    customer_id is a String in the entity - the application generates a
--    UUID on registration, so the seeded ids follow the same shape.
--    document_type is the DocumentType enum:
--    DRIVING_LICENSE / IDP / PASSPORT / OTHER.
-- =====================================================================

INSERT INTO customer (customer_id, first_name, last_name, email, phone,
                      password_hash, date_of_birth, gender, nationality,
                      driving_license_no, passport_no,
                      address_line_1, address_line_2, city_id, state_id,
                      pincode, is_active, document_type, file_url,
                      created_at, updated_at) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Arjun',  'Mehta',   'arjun.mehta@example.com',   '9930012001', '$2a$10$oD.aMdby3tbTmIKSQY.sk.jvDuNSQdppkJ/g41CL1GVpSbE.RUvTG', '1992-01-15', 'Male',   'Indian', 'MH0120110012345', 'M1234567', 'A-701, Oberoi Springs',   'Andheri West',    1,  1, '400053', 1, 'DRIVING_LICENSE', NULL, NOW(), NOW()),
  ('22222222-2222-4222-8222-222222222222', 'Priya',  'Sharma',  'priya.sharma@example.com',  '9930012002', '$2a$10$oD.aMdby3tbTmIKSQY.sk.jvDuNSQdppkJ/g41CL1GVpSbE.RUvTG', '1995-06-22', 'Female', 'Indian', 'DL0120150067890', 'N2345678', '42, Hauz Khas Enclave',   NULL,              4,  2, '110016', 1, 'DRIVING_LICENSE', NULL, NOW(), NOW()),
  ('33333333-3333-4333-8333-333333333333', 'Rahul',  'Gupta',   'rahul.gupta@example.com',   '9930012003', '$2a$10$oD.aMdby3tbTmIKSQY.sk.jvDuNSQdppkJ/g41CL1GVpSbE.RUvTG', '1988-11-09', 'Male',   'Indian', 'KA0320120045678', NULL,       '221, Indiranagar 100ft Rd','HAL 2nd Stage',   5,  3, '560038', 1, 'DRIVING_LICENSE', NULL, NOW(), NOW()),
  ('44444444-4444-4444-8444-444444444444', 'Sneha',  'Patel',   'sneha.patel@example.com',   '9930012004', '$2a$10$oD.aMdby3tbTmIKSQY.sk.jvDuNSQdppkJ/g41CL1GVpSbE.RUvTG', '1997-03-30', 'Female', 'Indian', 'GJ0120160089012', 'P3456789', '15, Satellite Road',      'Jodhpur Village', 11, 7, '380015', 1, 'PASSPORT',        NULL, NOW(), NOW()),
  ('55555555-5555-4555-8555-555555555555', 'Vikram', 'Nair',    'vikram.nair@example.com',   '9930012005', '$2a$10$oD.aMdby3tbTmIKSQY.sk.jvDuNSQdppkJ/g41CL1GVpSbE.RUvTG', '1990-08-05', 'Male',   'Indian', 'TN0220140023456', NULL,        '8, Anna Nagar East',      NULL,              7,  4, '600102', 1, 'DRIVING_LICENSE', NULL, NOW(), NOW()),
  ('66666666-6666-4666-8666-666666666666', 'Anita',  'Desai',   'anita.desai@example.com',   '9930012006', '$2a$10$oD.aMdby3tbTmIKSQY.sk.jvDuNSQdppkJ/g41CL1GVpSbE.RUvTG', '1993-12-11', 'Female', 'Indian', 'TS0720170034567', NULL,        '6-3-1090, Raj Bhavan Rd', 'Somajiguda',      9,  5, '500082', 1, 'DRIVING_LICENSE', NULL, NOW(), NOW()),
  ('77777777-7777-4777-8777-777777777777', 'Kiran',  'Rao',     'kiran.rao@example.com',     '9930012007', '$2a$10$oD.aMdby3tbTmIKSQY.sk.jvDuNSQdppkJ/g41CL1GVpSbE.RUvTG', '1986-04-27', 'Male',   'Indian', 'WB0120130056789', 'Q4567890', '31, Park Street',         NULL,             10,  6, '700016', 1, 'DRIVING_LICENSE', NULL, NOW(), NOW()),
  ('88888888-8888-4888-8888-888888888888', 'James',  'Whitmore','james.whitmore@example.com','9930012008', '$2a$10$oD.aMdby3tbTmIKSQY.sk.jvDuNSQdppkJ/g41CL1GVpSbE.RUvTG', '1984-09-02', 'Male',   'British','UK-DVLA-8834219',  'R5678901', 'The Leela Palace',        'Old Airport Road', 5, 3, '560008', 1, 'IDP',             NULL, NOW(), NOW());


-- =====================================================================
-- 10. SAMPLE BOOKINGS  (OPTIONAL)
--
--     Three PENDING bookings at Mumbai Airport (hub 1) so the staff
--     Dashboard, Bookings and Hand-over screens have something to show
--     the moment you sign in as rajesh.kumar@fleman.in.
--
--     Nothing depends on these - delete this whole section if you would
--     rather create every booking through the UI.
--
--     booking_status is the BookingStatus enum:
--     PENDING / CONFIRMED / CANCELLED / COMPLETED.
--     car_id stays NULL - staff pick the actual vehicle at hand-over.
--     Amounts follow the same maths as the booking screen: 18% GST on
--     (vehicle amount + add-on amount).
-- =====================================================================

INSERT INTO booking_header
  (booking_id, `date`, customer_id, car_id, car_type_id,
   start_date, end_date, duration,
   pickup_hub_id, pickup_hub_name, dropoff_hub_id, dropoff_hub_name,
   first_name, last_name, email, phone, date_of_birth, gender, nationality,
   driving_license_no, passport_no,
   address_line_1, address_line_2, city_id, state_id, pincode,
   daily_rate, weekly_rate, monthly_rate,
   booking_status, vehicle_amount, addon_amount, tax_amount, grand_total,
   created_at, updated_at)
VALUES
  -- Arjun Mehta - 3 days in an SUV, with insurance
  (1, NOW(), '11111111-1111-4111-8111-111111111111', NULL,
   (SELECT car_type_id FROM car_type WHERE hub_id = 1 AND car_class = 'SUV'),
   '2026-08-03', '2026-08-06', 3,
   1, 'Mumbai Airport Hub - Terminal 2', 1, 'Mumbai Airport Hub - Terminal 2',
   'Arjun', 'Mehta', 'arjun.mehta@example.com', '9930012001', '1992-01-15', 'Male', 'Indian',
   'MH0120110012345', 'M1234567',
   'A-701, Oberoi Springs', 'Andheri West', 1, 1, '400053',
   4800.00, 28800.00, 99000.00,
   'PENDING', 14400.00, 1497.00, 2861.46, 18758.46,
   NOW(), NOW()),

  -- Priya Sharma - 5 days in a premium sedan, no add-ons
  (2, NOW(), '22222222-2222-4222-8222-222222222222', NULL,
   (SELECT car_type_id FROM car_type WHERE hub_id = 1 AND car_class = 'SEDAN'),
   '2026-08-05', '2026-08-10', 5,
   1, 'Mumbai Airport Hub - Terminal 2', 15, 'Bandra Kurla Complex Hub',
   'Priya', 'Sharma', 'priya.sharma@example.com', '9930012002', '1995-06-22', 'Female', 'Indian',
   'DL0120150067890', 'N2345678',
   '42, Hauz Khas Enclave', NULL, 4, 2, '110016',
   3500.00, 21000.00, 72000.00,
   'PENDING', 17500.00, 0.00, 3150.00, 20650.00,
   NOW(), NOW()),

  -- Rahul Gupta - 2 days in a small hatchback, GPS + child seat
  (3, NOW(), '33333333-3333-4333-8333-333333333333', NULL,
   (SELECT car_type_id FROM car_type WHERE hub_id = 1 AND car_class = 'SMALL'),
   '2026-08-04', '2026-08-06', 2,
   1, 'Mumbai Airport Hub - Terminal 2', 1, 'Mumbai Airport Hub - Terminal 2',
   'Rahul', 'Gupta', 'rahul.gupta@example.com', '9930012003', '1988-11-09', 'Male', 'Indian',
   'KA0320120045678', NULL,
   '221, Indiranagar 100ft Rd', 'HAL 2nd Stage', 5, 3, '560038',
   1800.00, 10800.00, 38000.00,
   'PENDING', 3600.00, 696.00, 773.28, 5069.28,
   NOW(), NOW());


-- Add-on lines for the bookings above.
-- booking_source is the BookingSource enum: ONLINE / STAFF.

INSERT INTO booking_detail (booking_id, addon_id, addon_name, addon_price,
                            booking_source, created_at, updated_at)
SELECT 1, a.addon_id, a.addon_name, a.price_per_day * 3, 'ONLINE', NOW(), NOW()
FROM addon a WHERE a.hub_id = 1 AND a.addon_name = 'Full Insurance Cover';

INSERT INTO booking_detail (booking_id, addon_id, addon_name, addon_price,
                            booking_source, created_at, updated_at)
SELECT 3, a.addon_id, a.addon_name, a.price_per_day * 2, 'ONLINE', NOW(), NOW()
FROM addon a WHERE a.hub_id = 1
  AND a.addon_name IN ('GPS Navigation Device', 'Child Safety Seat');


-- =====================================================================
--  DONE - restore the session setting and show a quick sanity check
-- =====================================================================

SET SQL_SAFE_UPDATES = 1;

SELECT 'state'          AS table_name, COUNT(*) AS rows_inserted FROM state
UNION ALL SELECT 'city',           COUNT(*) FROM city
UNION ALL SELECT 'hub',            COUNT(*) FROM hub
UNION ALL SELECT 'airport',        COUNT(*) FROM airport
UNION ALL SELECT 'car_type',       COUNT(*) FROM car_type
UNION ALL SELECT 'addon',          COUNT(*) FROM addon
UNION ALL SELECT 'car',            COUNT(*) FROM car
UNION ALL SELECT 'staff',          COUNT(*) FROM staff
UNION ALL SELECT 'customer',       COUNT(*) FROM customer
UNION ALL SELECT 'booking_header', COUNT(*) FROM booking_header
UNION ALL SELECT 'booking_detail', COUNT(*) FROM booking_detail;
