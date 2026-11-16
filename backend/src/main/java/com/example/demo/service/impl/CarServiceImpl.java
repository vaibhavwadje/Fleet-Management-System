package com.example.demo.service.impl;

import java.util.List;

import org.springframework.stereotype.Service;

import com.example.demo.dto.response.CarResponse;
import com.example.demo.entity.base.Car;
import com.example.demo.entity.base.CarType;
import com.example.demo.enums.CarClass;
import com.example.demo.enums.CarStatus;
import com.example.demo.exception.error.ResourceNotFoundException;
import com.example.demo.repository.CarRepository;
import com.example.demo.repository.CarTypeRepository;
import com.example.demo.service.CarService;

@Service
public class CarServiceImpl implements CarService {

    private final CarRepository repository;

    private final CarTypeRepository carTypeRepository;

    public CarServiceImpl(CarRepository repository,
                          CarTypeRepository carTypeRepository) {
        this.repository = repository;
        this.carTypeRepository = carTypeRepository;
    }

    @Override
    public List<CarResponse> getAllCars() {

        List<Car> cars = repository.findAll();

        if (cars.isEmpty()) {
            throw new ResourceNotFoundException("No cars found.");
        }

        return cars.stream()
                .map(CarResponse::fromEntity)
                .toList();
    }

    @Override
    public CarResponse getCarById(Integer carId) {

        Car car = repository.findById(carId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Car not found with Id : " + carId));

        return CarResponse.fromEntity(car);
    }
    
    @Override
    public List<CarResponse> getCarsByHub(Integer hubId, CarStatus status) {

        List<Car> cars;

        if (status == null) {
            cars = repository.findByHub_HubId(hubId);
        } else {
            cars = repository.findByHub_HubIdAndStatus(hubId, status);
        }

        return cars.stream()
                .map(CarResponse::fromEntity)
                .toList();
    }

    /**
     * Cars of one category at one hub.
     *
     * WHY THE car_type_id IS TRANSLATED INSTEAD OF MATCHED
     * ---------------------------------------------------
     * car_type is a per-hub rate row, so "Intermediate Sedan" exists once per
     * hub with a different car_type_id each time. The id that arrives here is
     * whatever the BOOKING stored, which is the row at the hub the customer
     * originally chose.
     *
     * Since hand-over went global, that hub is very often not the hub being
     * asked about. Indore staff open a booking made for Mumbai, the screen
     * asks for hub 4 + BOM's car_type_id 2, and no Indore car will ever point
     * at a BOM rate row - so the list comes back empty and the screen reports
     * "no vehicle available" while the category is standing in the bay.
     *
     * So: read the CLASS off the incoming car type, then look for cars of that
     * class at this hub. The class is the part that means the same thing
     * everywhere; the id is a local rate row and is not portable.
     */
    @Override
    public List<CarResponse> getCarsByHubAndCarType(
            Integer hubId, Integer carTypeId, CarStatus status) {

        CarType requested = carTypeRepository.findById(carTypeId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Car type not found with Id : " + carTypeId));

        CarClass carClass = requested.getCarClass();

        List<Car> cars;

        if (carClass == null) {

            // No class on the row - nothing to translate with, so fall back
            // to the literal id rather than returning everything at the hub.
            cars = (status == null)
                    ? repository.findByHub_HubIdAndCarType_CarTypeId(hubId, carTypeId)
                    : repository.findByHub_HubIdAndCarType_CarTypeIdAndStatus(
                            hubId, carTypeId, status);

        } else if (status == null) {
            cars = repository.findByHub_HubIdAndCarType_CarClass(hubId, carClass);
        } else {
            cars = repository.findByHub_HubIdAndCarType_CarClassAndStatus(
                    hubId, carClass, status);
        }

        return cars.stream()
                .map(CarResponse::fromEntity)
                .toList();
    }
}