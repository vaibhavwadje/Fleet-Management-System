using System.Globalization;
using System.Text;
using FleetManagement.DTO.Responses;

namespace FleetManagement.Service.Email;

/// <summary>
/// HTML e-mail bodies, ported from the Java EmailTemplates so a customer
/// cannot tell which backend served them.
///
/// WHY THE MARKUP LOOKS OLD-FASHIONED
/// ----------------------------------
/// E-mail clients are not browsers. Outlook renders with Word, Gmail strips
/// &lt;style&gt; blocks, and most clients ignore flexbox and grid. So these
/// templates deliberately use:
///
///   - tables for layout, not divs
///   - inline styles on every element, not CSS classes
///   - a 600px wide container, the safe maximum
///   - width="100%" tables so it still reads on a phone
///   - web-safe fonts only
///
/// That is the standard way to build HTML e-mail and it renders correctly in
/// Gmail, Outlook, Apple Mail and the mobile clients.
///
/// Composed by string concatenation rather than a templating engine on
/// purpose: Razor would drag in view compilation for three static documents,
/// and the Java original is plain text blocks too - keeping the two shaped the
/// same is what makes a change to one easy to mirror in the other.
/// </summary>
public static class EmailTemplates
{
    // Brand palette, kept in step with the invoice PDF.
    private const string Brand = "#2563EB";
    private const string Dark = "#0F172A";
    private const string Muted = "#64748B";
    private const string Line = "#E2E8F0";
    private const string LightBg = "#F1F5F9";

    public const string Company = "FLEMAN Fleet Management Pvt. Ltd.";
    public const string Address =
        "Bandra Kurla Complex, Bandra East, Mumbai 400051, Maharashtra, India";
    public const string SupportPhone = "+91 1800 266 3526";
    public const string SupportEmail = "support@fleman.in";
    public const string Gstin = "27AAACF1234F1Z5";

    private static readonly CultureInfo In = CultureInfo.GetCultureInfo("en-IN");

    // ── small helpers, one for one with the Java originals ──────────────────

    private static string Money(decimal? v)
        => "&#8377;" + (v ?? 0m).ToString("N2", In);

    private static string Txt(object? v)
        => v is null ? "-" : v.ToString() ?? "-";

    private static string Date(DateOnly? v)
        => v is null ? "-" : v.Value.ToString("dd MMM yyyy", CultureInfo.InvariantCulture);

    private static string DateTimeText(DateTime? v)
        => v is null ? "-" : v.Value.ToString("dd MMM yyyy, hh:mm tt", CultureInfo.InvariantCulture);

    /// <summary>A label/value row inside one of the detail cards.</summary>
    private static string Row(string label, string value) => $"""
            <tr>
              <td style="padding:6px 0;font-size:13px;color:{Muted};">{label}</td>
              <td style="padding:6px 0;font-size:13px;color:{Dark};font-weight:bold;text-align:right;">{value}</td>
            </tr>
        """;

    /// <summary>A money line in the charges table.</summary>
    private static string Charge(string label, string value, bool total = false)
    {
        var weight = total ? "bold" : "normal";
        var size = total ? "16px" : "13px";
        var colour = total ? Brand : Dark;
        var border = total ? $"border-top:2px solid {Line};" : "";

        return $"""
            <tr>
              <td style="padding:8px 0;{border}font-size:{size};color:{Muted};font-weight:{weight};">{label}</td>
              <td style="padding:8px 0;{border}font-size:{size};color:{colour};font-weight:bold;text-align:right;">{value}</td>
            </tr>
        """;
    }

    private static string Card(string title, string innerRows) => $"""
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
               style="background:{LightBg};border-radius:10px;padding:16px;margin-bottom:16px;">
          <tr><td>
            <p style="margin:0 0 10px;font-size:11px;letter-spacing:.08em;
                      text-transform:uppercase;color:{Brand};font-weight:bold;">{title}</p>
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">{innerRows}</table>
          </td></tr>
        </table>
        """;

    private static string Header(string eyebrow, string reference) => $"""
              <tr>
                <td style="background:{Brand};padding:28px 32px;">
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                      <td>
                        <p style="margin:0;font-size:26px;font-weight:bold;color:#FFFFFF;
                                  letter-spacing:-.02em;">FLEMAN</p>
                        <p style="margin:4px 0 0;font-size:12px;color:#BFDBFE;">
                          Fleet Management &amp; Car Rental
                        </p>
                      </td>
                      <td align="right">
                        <p style="margin:0;font-size:11px;color:#BFDBFE;text-transform:uppercase;
                                  letter-spacing:.08em;">{eyebrow}</p>
                        <p style="margin:4px 0 0;font-size:16px;font-weight:bold;color:#FFFFFF;">{reference}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
        """;

    private static string Footer() => $"""
              <tr>
                <td style="background:{LightBg};padding:24px 32px;">
                  <p style="margin:0 0 6px;font-size:13px;font-weight:bold;color:{Dark};">{Company}</p>
                  <p style="margin:0;font-size:12px;line-height:19px;color:{Muted};">
                    {Address}<br>
                    Phone {SupportPhone} &nbsp;|&nbsp; {SupportEmail}<br>
                    GSTIN {Gstin}
                  </p>
                  <p style="margin:14px 0 0;font-size:11px;color:{Muted};">
                    This is a computer generated e-mail. Please do not reply directly.
                  </p>
                </td>
              </tr>
        """;

    /// <summary>The outer shell every e-mail shares.</summary>
    private static string Shell(string title, string previewText, string header, string body) => $"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>{title}</title>
        </head>
        <body style="margin:0;padding:0;background:#F8FAFC;
                     font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">

          <!-- Preview text shown in the inbox list, hidden in the body -->
          <div style="display:none;max-height:0;overflow:hidden;">
            {previewText}
          </div>

          <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                 style="background:#F8FAFC;padding:24px 12px;">
            <tr>
              <td align="center">

                <table width="600" cellpadding="0" cellspacing="0" role="presentation"
                       style="max-width:600px;width:100%;background:#FFFFFF;border-radius:14px;
                              overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.08);">
        {header}
        {body}
        {Footer()}
                </table>

                <p style="margin:16px 0 0;font-size:11px;color:{Muted};">
                  &copy; {DateTime.Now:yyyy} {Company}. All rights reserved.
                </p>

              </td>
            </tr>
          </table>
        </body>
        </html>
        """;

    // ═══════════════════════════════════════════════════════════════════════
    //  INVOICE - sent once the vehicle is back
    // ═══════════════════════════════════════════════════════════════════════

    public static string InvoiceEmail(InvoiceResponse inv)
    {
        var addonRows = new StringBuilder();
        foreach (var a in inv.Addons)
        {
            addonRows.Append(Charge("&nbsp;&nbsp;Add-on: " + a.AddonName, Money(a.AddonPrice)));
        }

        // ── The rental period starts at HAND-OVER, not the booked start ────
        //
        // The customer is billed from the day they actually drove the car
        // away - see RentalPricingCalculator.BillingStartDate, which is what
        // the amounts below were calculated from. Printing the booked start
        // date here contradicts the Duration line sitting directly under it:
        // book for Monday, collect on Wednesday, return on Saturday, and the
        // e-mail would say "Mon -> Sat" next to "3 day(s)".
        //
        // Someone reading that has to decide which of the two numbers to
        // believe, and the wrong answer is the one that looks like an
        // overcharge. Falls back to the booked start date only when there is
        // no hand-over stamp at all.
        var billedFrom = inv.HandoverDate is { } h
            ? DateOnly.FromDateTime(h)
            : inv.StartDate;

        var bookingCard = Card("Booking details",
            Row("Booking reference", "#" + Txt(inv.BookingId))
            + Row("Invoice number", Txt(inv.InvoiceNo ?? inv.InvoiceId.ToString()))
            + Row("Rental period", Date(billedFrom) + " &rarr; " + Date(inv.EndDate))
            + Row("Duration", Txt(inv.Duration) + " day(s)")
            + Row("Pick-up hub", Txt(inv.PickupHubName))
            + Row("Drop-off hub", Txt(inv.DropoffHubName)));

        var vehicleCard = Card("Vehicle",
            Row("Category", Txt(inv.CarTypeName))
            + Row("Vehicle", Txt(inv.BrandName) + " " + Txt(inv.ModelName))
            + Row("Registration", Txt(inv.RegistrationNo)));

        var returnCard = Card("Return summary",
            Row("Handed over", DateTimeText(inv.HandoverDate))
            + Row("Returned", DateTimeText(inv.ReturnDate))
            + Row("Fuel out / in",
                  Txt(inv.FuelLevelOut) + "% / " + Txt(inv.FuelLevelIn) + "%"));

        var charges =
            Charge($"Vehicle rental ({Txt(inv.Duration)} day(s))", Money(inv.VehicleAmount))
            + addonRows
            + Charge("Add-ons subtotal", Money(inv.AddonAmount))
            + Charge("GST (18%)", Money(inv.TaxAmount))
            + Charge("Fuel charges", Money(inv.FuelCharges))
            + Charge("Total paid", Money(inv.FinalAmount), total: true);

        var body = $"""
              <!-- Greeting -->
              <tr>
                <td style="padding:32px 32px 8px;">
                  <h1 style="margin:0 0 8px;font-size:20px;color:{Dark};">Thank you, {Txt(inv.CustomerName)}</h1>
                  <p style="margin:0;font-size:14px;line-height:22px;color:{Muted};">
                    Your vehicle has been returned and your rental is now complete.
                    The full invoice is attached to this e-mail as a PDF.
                  </p>
                </td>
              </tr>

              <!-- Amount banner -->
              <tr>
                <td style="padding:20px 32px 4px;">
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                         style="background:{Brand};border-radius:10px;">
                    <tr>
                      <td style="padding:18px 20px;">
                        <p style="margin:0;font-size:11px;letter-spacing:.08em;
                                  text-transform:uppercase;color:#BFDBFE;font-weight:bold;">Total paid</p>
                        <p style="margin:6px 0 0;font-size:28px;font-weight:bold;color:#FFFFFF;">{Money(inv.FinalAmount)}</p>
                      </td>
                      <td align="right" style="padding:18px 20px;">
                        <span style="display:inline-block;background:#DCFCE7;color:#166534;
                                     font-size:12px;font-weight:bold;padding:6px 12px;
                                     border-radius:999px;">PAID</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Detail cards -->
              <tr><td style="padding:20px 32px 0;">{bookingCard}{vehicleCard}{returnCard}</td></tr>

              <!-- Charges -->
              <tr>
                <td style="padding:4px 32px 8px;">
                  <p style="margin:0 0 8px;font-size:11px;letter-spacing:.08em;
                            text-transform:uppercase;color:{Brand};font-weight:bold;">Payment summary</p>
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">{charges}</table>
                </td>
              </tr>

              <!-- Invoice note -->
              <tr>
                <td style="padding:16px 32px 28px;">
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                         style="border:1px solid {Line};border-radius:10px;">
                    <tr>
                      <td style="padding:16px 20px;font-size:13px;line-height:20px;color:{Muted};">
                        <strong style="color:{Dark};">Your invoice is attached</strong><br>
                        Look for <strong>Invoice-{Txt(inv.InvoiceId)}.pdf</strong> on this e-mail. You can also
                        view and download it any time from the <strong>Invoices</strong> tab
                        of your FLEMAN dashboard.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
        """;

        return Shell(
            "Your FLEMAN invoice",
            $"Invoice {Txt(inv.InvoiceId)} - thank you for renting with FLEMAN. "
            + $"Total paid {Money(inv.FinalAmount)}.",
            Header("Invoice", Txt(inv.InvoiceNo ?? inv.InvoiceId.ToString())),
            body);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  BOOKING - confirmation and modification
    // ═══════════════════════════════════════════════════════════════════════

    /// <summary>
    /// The booking e-mail.
    /// </summary>
    /// <param name="amended">
    /// True when the booking has just been changed rather than created. Same
    /// layout and same figures - only the wording at the top differs, so a
    /// customer who has amended a booking is not told it has been confirmed.
    /// </param>
    public static string BookingEmail(BookingResponse b, bool amended = false)
    {
        var heading = amended ? "Your booking has been updated" : "You are all set";

        var intro = amended
            ? "Your booking has been updated and the new details are below. "
              + "Please bring your driving licence and a photo ID when you "
              + "collect the vehicle."
            : "Your booking is confirmed. Please bring your driving licence "
              + "and a photo ID when you collect the vehicle.";

        var addonRows = new StringBuilder();
        foreach (var a in b.Addons)
        {
            addonRows.Append(Charge("&nbsp;&nbsp;Add-on: " + a.AddonName, Money(a.AddonPrice)));
        }

        var bookingCard = Card("Booking details",
            Row("Booking reference", "#" + Txt(b.BookingId))
            + Row("Status", Txt(b.BookingStatus))
            + Row("Rental period", Date(b.StartDate) + " &rarr; " + Date(b.EndDate))
            + Row("Duration", Txt(b.Duration) + " day(s)")
            + Row("Pick-up hub", Txt(b.PickupHubName))
            + Row("Drop-off hub", Txt(b.DropoffHubName)));

        var vehicleCard = Card("Vehicle reserved",
            Row("Category", Txt(b.CarTypeName))
            + Row("Class", Txt(b.CarClass))
            + Row("Daily rate", Money(b.DailyRate))
            + Row("Your vehicle", b.AssignedCarRegistrationNo is null
                ? "Allocated at pick-up"
                : $"{Txt(b.AssignedCarBrandName)} {Txt(b.AssignedCarModelName)} "
                  + $"({b.AssignedCarRegistrationNo})"));

        var charges =
            Charge($"Vehicle rental ({Txt(b.Duration)} day(s))", Money(b.VehicleAmount))
            + addonRows
            + Charge("Add-ons subtotal", Money(b.AddonAmount))
            + Charge("GST (18%)", Money(b.TaxAmount))
            + Charge("Grand total", Money(b.GrandTotal), total: true);

        var body = $"""
              <!-- Greeting -->
              <tr>
                <td style="padding:32px 32px 8px;">
                  <h1 style="margin:0 0 8px;font-size:20px;color:{Dark};">{heading}, {Txt(b.CustomerName)}</h1>
                  <p style="margin:0;font-size:14px;line-height:22px;color:{Muted};">
                    {intro}
                  </p>
                </td>
              </tr>

              <!-- Amount banner -->
              <tr>
                <td style="padding:20px 32px 4px;">
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                         style="background:{Brand};border-radius:10px;">
                    <tr>
                      <td style="padding:18px 20px;">
                        <p style="margin:0;font-size:11px;letter-spacing:.08em;
                                  text-transform:uppercase;color:#BFDBFE;font-weight:bold;">Grand total</p>
                        <p style="margin:6px 0 0;font-size:28px;font-weight:bold;color:#FFFFFF;">{Money(b.GrandTotal)}</p>
                      </td>
                      <td align="right" style="padding:18px 20px;">
                        <span style="display:inline-block;background:#DBEAFE;color:#1E40AF;
                                     font-size:12px;font-weight:bold;padding:6px 12px;
                                     border-radius:999px;">{Txt(b.BookingStatus)}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Detail cards -->
              <tr><td style="padding:20px 32px 0;">{bookingCard}{vehicleCard}</td></tr>

              <!-- Charges -->
              <tr>
                <td style="padding:4px 32px 8px;">
                  <p style="margin:0 0 8px;font-size:11px;letter-spacing:.08em;
                            text-transform:uppercase;color:{Brand};font-weight:bold;">Cost summary</p>
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">{charges}</table>
                </td>
              </tr>

              <!-- What to bring -->
              <tr>
                <td style="padding:16px 32px 28px;">
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                         style="border:1px solid {Line};border-radius:10px;">
                    <tr>
                      <td style="padding:16px 20px;font-size:13px;line-height:20px;color:{Muted};">
                        <strong style="color:{Dark};">Collecting your vehicle</strong><br>
                        Bring your original driving licence and a photo ID. The full
                        booking is on the <strong>My Bookings</strong> tab of your FLEMAN
                        dashboard, where you can also change or cancel it.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
        """;

        return Shell(
            "Your FLEMAN booking",
            $"Booking #{Txt(b.BookingId)} {(amended ? "updated" : "confirmed")} - "
            + $"{Txt(b.CarTypeName)} from {Txt(b.PickupHubName)}. Total {Money(b.GrandTotal)}.",
            Header(amended ? "Booking updated" : "Booking", "#" + Txt(b.BookingId)),
            body);
    }
}
