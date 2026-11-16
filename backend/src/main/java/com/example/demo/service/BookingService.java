package com.example.demo.service;

import java.util.Optional;

import com.example.demo.dto.request.BookingRequest;
import com.example.demo.dto.request.GuestBookingRequest;
import com.example.demo.dto.request.StaffBookingRequest;
import com.example.demo.dto.request.UpdateBookingLocationsRequest;
import com.example.demo.dto.request.UpdateBookingRequest;
import com.example.demo.dto.request.UpdateBookingStatusRequest;
import com.example.demo.dto.response.BookingPageResponse;
import com.example.demo.dto.response.BookingResponse;
import com.example.demo.dto.response.BookingStatsResponse;
import com.example.demo.entity.base.Customer;
import com.example.demo.enums.BookingStatus;
import com.example.demo.enums.HubScope;
import com.example.demo.response.ApiResponse;

public interface BookingService {

    ApiResponse<BookingResponse> createBooking(BookingRequest request);
    
    ApiResponse<BookingResponse> createGuestBooking(GuestBookingRequest request);

    /**
     * A booking taken by staff at the counter.
     *
     * The pick-up date, pick-up time and both hubs are set by the server from
     * the clock and the signed-in staff member's hub - they are not read from
     * the request.
     */
    ApiResponse<BookingResponse> createStaffBooking(StaffBookingRequest request);
    
    ApiResponse<BookingPageResponse> getBookings(
            int page,
            int size,
            BookingStatus status);
    
    ApiResponse<BookingResponse> getBookingById(
            Long bookingId);
    
    ApiResponse<BookingResponse> updateBooking(
            Long bookingId,
            UpdateBookingRequest request);
    
    ApiResponse<BookingResponse> cancelBooking(
            Long bookingId);
    
    
    ApiResponse<BookingStatsResponse> getBookingStats();
    
    
    /**
     * Staff bookings, scoped to which end of the rental this hub handles.
     * @param scope PICKUP (hand-over), RETURN, or ALL. Null means ALL.
     */
    ApiResponse<BookingPageResponse> getStaffBookings(
            int page,
            int size,
            BookingStatus status,
            HubScope scope);
    
    /**
     * Staff changing where a booking is collected from or returned to.
     *
     * Not hub-restricted: a customer can ask any branch, and the branch they
     * asked should be able to help. The pick-up hub is frozen once the
     * vehicle has been handed over.
     */
    ApiResponse<BookingResponse> updateBookingLocations(
            Long bookingId,
            UpdateBookingLocationsRequest request);

    ApiResponse<BookingResponse> getStaffBookingById(
            Long bookingId);
    
    ApiResponse<BookingStatsResponse> getStaffBookingStats();
    
    ApiResponse<BookingResponse> updateStaffBookingStatus(
            Long bookingId,
            UpdateBookingStatusRequest request);
    
    ApiResponse<BookingResponse> cancelStaffBooking(
            Long bookingId);
    
    
}