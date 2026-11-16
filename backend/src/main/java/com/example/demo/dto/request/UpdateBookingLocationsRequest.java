package com.example.demo.dto.request;

/**
 * Staff changing where a booking is collected from or returned to.
 *
 * The customer is at the counter or on the phone saying "actually, can I pick
 * it up from BKC instead" - so this is a small, targeted change, not a
 * re-quote of the whole booking. Nothing else about the booking moves, and in
 * particular the amounts do not: the rental is the same length for the same
 * vehicle, only the geography changed.
 *
 * Both fields are optional. Send one to change one, both to change both, and
 * a null means "leave this as it is" rather than "clear it".
 */
public class UpdateBookingLocationsRequest {

    /**
     * New pick-up hub.
     *
     * Refused once the vehicle has been handed over - the car has physically
     * left a specific hub and changing where it was collected from would be
     * rewriting history.
     */
    private Integer pickupHubId;

    /** New drop-off hub. Editable right up until the vehicle is returned. */
    private Integer dropoffHubId;

    public UpdateBookingLocationsRequest() {
    }

    public Integer getPickupHubId() {
        return pickupHubId;
    }

    public void setPickupHubId(Integer pickupHubId) {
        this.pickupHubId = pickupHubId;
    }

    public Integer getDropoffHubId() {
        return dropoffHubId;
    }

    public void setDropoffHubId(Integer dropoffHubId) {
        this.dropoffHubId = dropoffHubId;
    }
}
