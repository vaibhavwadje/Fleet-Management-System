package com.example.demo.repository;


import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.demo.entity.base.Car;
import com.example.demo.enums.CarClass;
import com.example.demo.enums.CarStatus;

@Repository
public interface CarRepository extends JpaRepository<Car, Integer> {

	List<Car> findByHub_HubId(Integer hubId);

    List<Car> findByHub_HubIdAndStatus(Integer hubId, CarStatus status);

    List<Car> findByHub_HubIdAndCarType_CarTypeId(Integer hubId, Integer carTypeId);

    /**
     * Vehicles of one category at one hub in a given state - used at hand-over
     * to offer staff only the AVAILABLE cars of the type the customer booked.
     */
    List<Car> findByHub_HubIdAndCarType_CarTypeIdAndStatus(
            Integer hubId, Integer carTypeId, CarStatus status);

    // =====================================================
    // Lookups by CATEGORY rather than by car_type_id
    //
    // car_type is a per-hub rate row: every hub has its own row for
    // "Intermediate Sedan", each with its own car_type_id. So a car_type_id
    // identifies a category AT ONE HUB, not a category.
    //
    // That is fine while the booking is collected where it was booked. It
    // breaks the moment hand-over goes global: a booking made at BOM carries
    // BOM's car_type_id, and no car in Indore's fleet is ever going to point
    // at a BOM rate row. Matching on car_type_id returns an empty list and
    // the screen says there are no vehicles when the bay is full of them.
    //
    // CarClass is the thing that is actually the same across hubs, so these
    // two are what the hand-over screen should be asking.
    // =====================================================

    List<Car> findByHub_HubIdAndCarType_CarClass(Integer hubId, CarClass carClass);

    List<Car> findByHub_HubIdAndCarType_CarClassAndStatus(
            Integer hubId, CarClass carClass, CarStatus status);

}
