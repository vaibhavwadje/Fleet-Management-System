using System.Net.Http.Headers;

namespace FleetManagement.Integration;

/// <summary>
/// REQUIREMENT 11 - calling the existing Java Spring Boot service over HTTP.
///
/// WHY THIS EXISTS RATHER THAN A TOKEN /forward ENDPOINT
/// -----------------------------------------------------
/// Two capabilities in the Java backend are not worth re-implementing in
/// .NET, and delegating them is the honest answer rather than a demo:
///
///   INVOICE PDF - OpenPDF, with a laid-out template already tuned
///   EXCEL       - Apache POI, reading the rate-card workbook
///
/// Re-writing those is weeks of work for no functional gain, and would leave
/// two implementations of the same document to keep in step. The .NET backend
/// owns the data and the rules; Java stays the document engine.
///
/// E-MAIL USED TO BE ON THAT LIST AND IS NOT ANY MORE
/// --------------------------------------------------
/// It could not be delegated: the Java backend sends the invoice e-mail from
/// inside its own returnVehicle and publishes no endpoint for it, so a return
/// processed here sent nothing at all. Delegation needs a seam on the other
/// side, and for e-mail there never was one. It is now sent in-process by
/// <see cref="Service.Email.EmailService"/>, which still asks this client for
/// the PDF to attach.
///
/// FAILURE POLICY
/// --------------
/// Everything here throws on failure. The caller asked for a document and has
/// to be told it did not arrive. The one place a failure is swallowed is the
/// e-mail attachment, and that decision lives with the e-mail service, where
/// the reason for it - the return is already committed - is visible.
/// </summary>
public class JavaMicroserviceClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<JavaMicroserviceClient> _logger;

    public JavaMicroserviceClient(HttpClient httpClient, ILogger<JavaMicroserviceClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    /// <summary>
    /// Health probe. Also the simplest demonstration of the pattern:
    /// GET {javaBaseUrl}/health
    /// </summary>
    public async Task<string> GetHealthAsync(CancellationToken ct = default)
    {
        var response = await _httpClient.GetAsync("/health", ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStringAsync(ct);
    }

    /// <summary>
    /// Generic pass-through, so any Java endpoint can be reached without a new
    /// method here. Used by ProxyController.
    /// </summary>
    public async Task<string> GetRawAsync(string path, string? bearerToken = null,
        CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, path);

        // Both backends sign with the same secret, so the caller's own token
        // is accepted on the other side - no service account needed.
        if (!string.IsNullOrWhiteSpace(bearerToken))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
        }

        var response = await _httpClient.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStringAsync(ct);
    }

    /// <summary>
    /// The invoice PDF for a booking, rendered by the Java OpenPDF service.
    /// Throws on failure - the user clicked Download and must be told.
    /// </summary>
    public async Task<byte[]> DownloadInvoicePdfAsync(
        long bookingId, string? bearerToken = null, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Get, $"/api/invoices/booking/{bookingId}/download");

        if (!string.IsNullOrWhiteSpace(bearerToken))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
        }

        _logger.LogInformation(
            "Requesting invoice PDF for booking {BookingId} from the Java service", bookingId);

        var response = await _httpClient.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadAsByteArrayAsync(ct);
    }

    /// <summary>The blank rate-card workbook, built by Java with Apache POI.</summary>
    public async Task<byte[]> DownloadTemplateAsync(
        string? bearerToken = null, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Get, "/api/staff/excel/car-types/template");

        if (!string.IsNullOrWhiteSpace(bearerToken))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
        }

        var response = await _httpClient.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadAsByteArrayAsync(ct);
    }

    /// <summary>Forwards a rate-card workbook to the Java Apache POI importer.</summary>
    public async Task<string> UploadRateSheetAsync(
        Stream fileStream, string fileName, string? bearerToken = null,
        CancellationToken ct = default)
    {
        using var content = new MultipartFormDataContent();
        using var fileContent = new StreamContent(fileStream);

        fileContent.Headers.ContentType = new MediaTypeHeaderValue(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        content.Add(fileContent, "file", fileName);

        using var request = new HttpRequestMessage(
            HttpMethod.Post, "/api/staff/excel/car-types") { Content = content };

        if (!string.IsNullOrWhiteSpace(bearerToken))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
        }

        var response = await _httpClient.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadAsStringAsync(ct);
    }
}
