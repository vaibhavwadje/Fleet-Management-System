package com.example.demo.service;

import com.example.demo.dto.response.BookingResponse;
import com.example.demo.dto.response.InvoiceResponse;

public interface EmailService {

        /** Sent when a booking is made, with the booking PDF attached. */
        void sendBookingConfirmation(
                        BookingResponse booking);

        /**
         * Sent when a booking is changed, with the updated booking PDF attached.
         * Same layout as the confirmation, different wording.
         */
        void sendBookingModification(
                        BookingResponse booking);

        /** Sent after the vehicle is returned, with the invoice PDF attached. */
        void sendInvoice(
                        InvoiceResponse invoice);
}