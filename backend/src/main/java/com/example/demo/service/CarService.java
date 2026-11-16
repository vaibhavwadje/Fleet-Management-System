package com.example.demo.service;

import java.util.List;

import com.example.demo.dto.response.CarResponse;
import com.example.demo.enums.CarStatus;

public interface CarService {

    List<CarResponse> getAllCars();

    CarResponse getCarById(Integer carId);

    /** Cars of a hub, optionally filtered by status (null = all). */
    List<CarResponse> getCarsByHub(Integer hubId, CarStatus status);

    /**
     * Cars of one category at a hub, optionally filtered by status.
     *
     * The carTypeId is treated as "which category", not "which row": car_type
     * rows are per-hub, so the id passed in usually belongs to a different hub
     * than the one being asked about. The implementation reads the class off
     * that row and matches on the class instead.
     */
    List<CarResponse> getCarsByHubAndCarType(
            Integer hubId, Integer carTypeId, CarStatus status);

}