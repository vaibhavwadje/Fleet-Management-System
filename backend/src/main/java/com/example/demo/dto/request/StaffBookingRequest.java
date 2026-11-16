package com.example.demo.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/**
 * A booking taken by staff at the counter, for a walk-in customer.
 *
 * WHAT IS DELIBERATELY MISSING
 * ----------------------------
 * There is no start date, no pick-up hub and no drop-off hub on this request.
 * An on-spot booking starts now, at the hub the staff member works at, and
 * letting the browser send those values would make the rule advisory rather
 * than real. The service fills all three in from the server clock and the
 * signed-in staff member's hub.
 *
 * The customer's details are captured the same way the guest flow captures
 * them, because a walk-in is exactly that: someone with no account yet.
 */
public class StaffBookingRequest {

    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Please enter a valid email address")
    private String email;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[6-9]\\d{9}$",
             message = "Phone number must be 10 digits starting with 6-9")
    private String phone;

    @NotBlank(message = "Driving licence number is required")
    private String drivingLicenseNo;

    private String passportNo;

    private String addressLine1;
    private String addressLine2;
    private Integer stateId;
    private Integer cityId;
    private String pincode;

    /**
     * Vehicle category, return date and add-ons.
     *
     * Only carTypeId, endDate and addons are read from it. startDate and both
     * hub ids are overwritten by the service, so anything sent for them is
     * ignored rather than trusted.
     */
    @NotNull(message = "Booking details are required")
    @Valid
    private BookingRequest booking;

    public StaffBookingRequest() {
    }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getDrivingLicenseNo() { return drivingLicenseNo; }
    public void setDrivingLicenseNo(String drivingLicenseNo) {
        this.drivingLicenseNo = drivingLicenseNo;
    }

    public String getPassportNo() { return passportNo; }
    public void setPassportNo(String passportNo) { this.passportNo = passportNo; }

    public String getAddressLine1() { return addressLine1; }
    public void setAddressLine1(String addressLine1) { this.addressLine1 = addressLine1; }

    public String getAddressLine2() { return addressLine2; }
    public void setAddressLine2(String addressLine2) { this.addressLine2 = addressLine2; }

    public Integer getStateId() { return stateId; }
    public void setStateId(Integer stateId) { this.stateId = stateId; }

    public Integer getCityId() { return cityId; }
    public void setCityId(Integer cityId) { this.cityId = cityId; }

    public String getPincode() { return pincode; }
    public void setPincode(String pincode) { this.pincode = pincode; }

    public BookingRequest getBooking() { return booking; }
    public void setBooking(BookingRequest booking) { this.booking = booking; }
}
