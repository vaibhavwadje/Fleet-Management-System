package com.example.demo.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.dto.request.UpdateBookingStatusRequest;
import com.example.demo.dto.request.StaffBookingRequest;
import com.example.demo.dto.request.UpdateBookingLocationsRequest;
import com.example.demo.dto.response.BookingPageResponse;
import com.example.demo.dto.response.BookingResponse;
import com.example.demo.dto.response.BookingStatsResponse;
import com.example.demo.enums.BookingStatus;
import com.example.demo.enums.HubScope;
import com.example.demo.response.ApiResponse;
import com.example.demo.service.BookingService;

import jakarta.validation.Valid;

@RestController
	@RequestMapping("/api/staff/bookings")
	public class StaffBookingController {

	    @Autowired
	    private BookingService bookingService;

	    @GetMapping
	    public ResponseEntity<ApiResponse<BookingPageResponse>> getBookings(

	            @RequestParam(defaultValue = "0")
	            int page,

	            @RequestParam(defaultValue = "10")
	            int size,

	            @RequestParam(required = false)
	            BookingStatus status,

	            /**
	             * PICKUP  - bookings this hub hands over
	             * RETURN  - bookings this hub takes back
	             * ALL     - either end (the default)
	             */
	            @RequestParam(required = false)
	            HubScope scope) {

	        return ResponseEntity.ok(

	                bookingService.getStaffBookings(
	                        page,
	                        size,
	                        status,
	                        scope));
	    }
	    
	    /**
	     * Staff on-spot booking, for a walk-in customer.
	     *
	     * Sits under /api/staff/**, which SecurityConfig already restricts to
	     * ROLE_STAFF - so customers cannot reach this workflow at all, which
	     * is the requirement rather than a side effect.
	     *
	     * The pick-up date, time and hub are set by the service from the
	     * server clock and the signed-in staff member's hub, so nothing the
	     * caller sends for them is honoured.
	     */
	    @PostMapping("/on-spot")
	    public ResponseEntity<ApiResponse<BookingResponse>> createOnSpotBooking(

	            @Valid
	            @RequestBody
	            StaffBookingRequest request) {

	        return ResponseEntity.ok(
	                bookingService.createStaffBooking(request));
	    }

	    /**
	     * Change where a booking is collected from or returned to.
	     *
	     * The customer asked at the counter or on the phone; whichever hub
	     * they asked can make the change. Once saved, the booking moves into
	     * the revised hub's Hand-over or Return list on the next refresh.
	     */
	    @PatchMapping("/{bookingId}/locations")
	    public ResponseEntity<ApiResponse<BookingResponse>> updateLocations(

	            @PathVariable Long bookingId,

	            @RequestBody
	            UpdateBookingLocationsRequest request) {

	        return ResponseEntity.ok(
	                bookingService.updateBookingLocations(bookingId, request));
	    }

	    @GetMapping("/{bookingId}")
	    public ResponseEntity<ApiResponse<BookingResponse>>
	            getBookingById(
	                    @PathVariable Long bookingId) {

	        return ResponseEntity.ok(

	                bookingService.getStaffBookingById(
	                        bookingId));
	    }
	    
	    @GetMapping("/stats")
	    public ResponseEntity<ApiResponse<BookingStatsResponse>>
	            getBookingStats() {

	        return ResponseEntity.ok(
	                bookingService.getStaffBookingStats());
	    }
	    
	    @PatchMapping("/{bookingId}/status")
	    public ResponseEntity<ApiResponse<BookingResponse>>
	            updateBookingStatus(

	                    @PathVariable Long bookingId,

	                    @Valid
	                    @RequestBody
	                    UpdateBookingStatusRequest request) {

	        return ResponseEntity.ok(

	                bookingService
	                        .updateStaffBookingStatus(
	                                bookingId,
	                                request));
	    }
	    
	}



