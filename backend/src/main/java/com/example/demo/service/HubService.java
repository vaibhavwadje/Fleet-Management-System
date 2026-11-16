package com.example.demo.service;

import java.util.List;

import com.example.demo.dto.response.HubResponse;

public interface HubService {

    HubResponse getHubById(Integer hubId);

    List<HubResponse> getAllHubs(Integer stateId, Integer cityId);

    /**
     * Every hub, unfiltered.
     *
     * The customer booking flow narrows by state then city, because a
     * customer knows where they are. Staff changing a booking's location know
     * the hub name and want to type it, so they get one searchable list.
     */
    List<HubResponse> getEveryHub();

}