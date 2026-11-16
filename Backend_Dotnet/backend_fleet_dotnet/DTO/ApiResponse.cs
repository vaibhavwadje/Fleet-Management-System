namespace FleetManagement.DTO;

/// <summary>
/// The envelope every endpoint returns.
///
/// Shape copied EXACTLY from the Java com.example.demo.response.ApiResponse,
/// because the React client unwraps {success, message, data} and would break
/// on anything else. That compatibility is the whole point of the port.
/// </summary>
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public T? Data { get; set; }

    public ApiResponse() { }

    public ApiResponse(bool success, string message, T? data)
    {
        Success = success;
        Message = message;
        Data = data;
    }

    public static ApiResponse<T> Ok(T data, string message = "Success")
        => new(true, message, data);

    public static ApiResponse<T> Fail(string message)
        => new(false, message, default);
}
