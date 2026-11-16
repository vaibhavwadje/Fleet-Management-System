using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using FleetManagement.Controllers;
using FleetManagement.Data;
using FleetManagement.DTO;
using FleetManagement.Integration;
using FleetManagement.Middleware;
using FleetManagement.Repository;
using FleetManagement.Service;
using FleetManagement.Service.Auth;
using FleetManagement.Service.Domain;
using FleetManagement.Service.Email;
using FleetManagement.Service.Pricing;

// ═════════════════════════════════════════════════════════════════════════════
//  FLEMAN - .NET backend
//
//  A port of the Java Spring Boot backend, running against the SAME MySQL
//  database, exposing the SAME routes and the same {success, message, data}
//  envelope, so the React client can be pointed at either with one setting.
//
//  Every mandatory requirement is wired up below and marked with its number.
// ═════════════════════════════════════════════════════════════════════════════

var builder = WebApplication.CreateBuilder(args);

// ── Secrets that must not be committed ──────────────────────────────────────
//
// appsettings.Local.json is git-ignored and layered on top of appsettings.json,
// the same arrangement the Java backend uses with application-local.properties.
// Google's client secret and the database password belong here, not in the
// file that goes into version control.
//
// optional: true so a fresh clone still starts - Google sign-in simply
// switches itself off when there is nothing to configure it with.
builder.Configuration.AddJsonFile("appsettings.Local.json",
    optional: true, reloadOnChange: true);

// ── REQUIREMENT 1 : structured logging ──────────────────────────────────────
//
// Serilog reads its configuration from appsettings, so log levels and sinks
// change without a rebuild. Console for development, a rolling file for
// anything you need to read back.
builder.Host.UseSerilog((context, services, configuration) => configuration
    .ReadFrom.Configuration(context.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("Logs/fleman-.log", rollingInterval: RollingInterval.Day));

// ── Database : the SAME MySQL the Java backend uses ─────────────────────────
//
// No migrations are applied from here. Hibernate owns the schema; this maps
// onto it. Two tools trying to own one schema is how you lose a column.
var connectionString = builder.Configuration.GetConnectionString("FleetDatabase")
    ?? throw new InvalidOperationException(
        "ConnectionStrings:FleetDatabase is not configured - see appsettings.json");

builder.Services.AddDbContext<FleetDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

// ── REQUIREMENT 7 & 8 : generic repository, registered open-generically ─────
//
// One line covers every entity: asking for IGenericRepository<Car> resolves
// without a per-entity registration.
builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
builder.Services.AddScoped(typeof(IGenericService<,>), typeof(GenericService<,>));

// ── REQUIREMENT 9 : entity-specific services over the generic one ───────────
builder.Services.AddScoped<StateService>();
builder.Services.AddScoped<CityService>();
builder.Services.AddScoped<HubService>();
builder.Services.AddScoped<AirportService>();
builder.Services.AddScoped<CarTypeService>();
builder.Services.AddScoped<CarService>();
builder.Services.AddScoped<AddonService>();
builder.Services.AddScoped<CustomerService>();
builder.Services.AddScoped<StaffService>();
builder.Services.AddScoped<BookingService>();
builder.Services.AddScoped<HandoverService>();
builder.Services.AddScoped<InvoiceService>();

// The rate structure. Stateless, so a singleton.
builder.Services.AddSingleton<RentalPricingCalculator>();

// ── Native e-mail ───────────────────────────────────────────────────────────
//
// Was delegated to the Java service, which silently sent nothing: Java mails
// the invoice from inside its own returnVehicle and publishes no endpoint for
// it. PDF and Excel are still delegated - those seams genuinely exist.
//
// Singleton because every send outlives the request that queued it. It holds
// nothing scoped and opens its own scope for the PDF fetch; a captured
// DbContext would be disposed under the background task.
var emailSettings = builder.Configuration.GetSection("Email").Get<EmailSettings>()
    ?? new EmailSettings();

builder.Services.AddSingleton(emailSettings);
builder.Services.AddSingleton<IEmailService, EmailService>();

// ── REQUIREMENT 10 : AutoMapper ─────────────────────────────────────────────
builder.Services.AddAutoMapper(typeof(Program).Assembly);

// ── REQUIREMENT 2 : JWT bearer authentication ───────────────────────────────
//
// The signing secret is shared with the Java backend, so a token issued by
// either is accepted by both and the frontend can switch without re-login.
var jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>()
    ?? throw new InvalidOperationException("The Jwt section is missing from appsettings.json");

if (string.IsNullOrWhiteSpace(jwtSettings.Secret) || jwtSettings.Secret.Length < 32)
{
    // Fail at startup rather than issuing tokens anybody can forge.
    throw new InvalidOperationException(
        "Jwt:Secret must be set and at least 32 characters. Use the same value as the "
        + "Java backend's jwt.secret so the two agree on tokens.");
}

builder.Services.AddSingleton(jwtSettings);
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

// ── Google Sign-In (SSO) ────────────────────────────────────────────────────
//
// Registered only when credentials are actually present. This mirrors the
// ObjectProvider check in the Java SecurityConfig, and for the same reason:
// handing an EMPTY client id to the handler throws at startup, so "absent"
// and "blank" have to be told apart. With nothing configured the app runs
// perfectly well and the button reports that the feature is switched off.
var googleSettings =
    builder.Configuration.GetSection("Authentication:Google").Get<GoogleAuthSettings>()
    ?? new GoogleAuthSettings();

builder.Services.AddSingleton(googleSettings);
builder.Services.AddScoped<GoogleSignInService>();

var authentication = builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;   // local development
        options.SaveToken = true;

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtSettings.Secret)),

            // Issuer and audience are not validated, because the Java backend
            // does not set them. Turning them on here would reject every token
            // it issues, which is exactly the interoperability we want.
            ValidateIssuer = false,
            ValidateAudience = false,

            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
        };
    });

if (googleSettings.IsConfigured)
{
    // A cookie that exists for the few seconds of the OAuth2 handshake and
    // nothing else. The handshake needs somewhere to keep correlation state
    // between the redirect out to Google and the redirect back, and there is
    // no request in between to carry it on. OAuth2Controller deletes it the
    // moment it has read the e-mail; no API call is ever authenticated by it.
    authentication.AddCookie(OAuth2Controller.TempCookieScheme, options =>
    {
        options.Cookie.Name = ".fleman.oauth";
        options.Cookie.HttpOnly = true;

        // Lax, not Strict: the browser arrives back here from Google's
        // domain. Strict would drop the cookie on exactly the request that
        // needs it, and the sign-in would fail with no visible reason.
        options.Cookie.SameSite = SameSiteMode.Lax;

        // SameAsRequest rather than Always: local development is plain HTTP,
        // and Always would mean the cookie is never sent back.
        options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;

        options.ExpireTimeSpan = TimeSpan.FromMinutes(5);
    });

    authentication.AddGoogle(options =>
    {
        options.ClientId = googleSettings.ClientId!;
        options.ClientSecret = googleSettings.ClientSecret!;

        // Deliberately the same path Spring Security uses, so the two
        // backends differ only by port and the Google console entries read
        // as an obvious pair.
        options.CallbackPath = "/login/oauth2/code/google";

        options.SignInScheme = OAuth2Controller.TempCookieScheme;

        // Scope is left at the handler's default of openid + profile + email,
        // which is exactly what the Java side asks for. Adding them again
        // here would just send each one twice.

        options.SaveTokens = false;   // we keep our own JWT, not Google's

        // Force the redirect_uri rather than letting it be derived from the
        // incoming request.
        //
        // The browser reaches this through the Vite dev proxy, so the Host
        // header here depends on a proxy setting we do not control from this
        // side. Derive it and you get http://localhost:5174/... on a bad day,
        // which Google rejects with redirect_uri_mismatch - an error that
        // says nothing about proxies and sends you looking in the wrong
        // place. Pinning it to the configured value makes the URI we send
        // identical to the one registered in the console, every time.
        options.Events.OnRedirectToAuthorizationEndpoint = context =>
        {
            var uri = context.RedirectUri;
            var split = uri.IndexOf('?');

            if (split >= 0 && !string.IsNullOrWhiteSpace(googleSettings.CallbackUrl))
            {
                var parameters = QueryHelpers
                    .ParseQuery(uri[(split + 1)..])
                    .ToDictionary(p => p.Key, p => (string?)p.Value.ToString());

                parameters["redirect_uri"] = googleSettings.CallbackUrl;

                uri = QueryHelpers.AddQueryString(uri[..split], parameters);
            }

            context.Response.Redirect(uri);
            return Task.CompletedTask;
        };
    });
}

builder.Services.AddAuthorization();

// ── REQUIREMENT 11 : the Java microservice client ───────────────────────────
builder.Services.AddHttpClient<JavaMicroserviceClient>(client =>
{
    var baseUrl = builder.Configuration["JavaMicroservice:BaseUrl"] ?? "http://localhost:8080";
    client.BaseAddress = new Uri(baseUrl);

    // A generous but finite timeout: PDF generation is not instant, and no
    // request should hang forever.
    client.Timeout = TimeSpan.FromSeconds(30);
});

// ── REQUIREMENT 6 : server-side validation ──────────────────────────────────
//
// Data Annotations on the DTOs are enforced automatically by [ApiController].
// The default 400 body is a ProblemDetails, which the React client cannot
// read - so it is reshaped into the same envelope as everything else.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.DefaultIgnoreCondition =
            JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.Configure<Microsoft.AspNetCore.Mvc.ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var message = string.Join(" ", context.ModelState
            .Where(e => e.Value?.Errors.Count > 0)
            .SelectMany(e => e.Value!.Errors)
            .Select(e => e.ErrorMessage));

        return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(
            ApiResponse<object>.Fail(string.IsNullOrWhiteSpace(message)
                ? "The request is not valid."
                : message));
    };
});

// ── CORS : the React dev server ─────────────────────────────────────────────
const string CorsPolicy = "FlemanFrontend";

builder.Services.AddCors(options =>
    options.AddPolicy(CorsPolicy, policy => policy
        .WithOrigins(
            builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
            ?? new[] { "http://localhost:5173", "http://localhost:5174" })
        .AllowAnyHeader()
        .AllowAnyMethod()));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "FLEMAN Fleet Management API (.NET)",
        Version = "v1",
        Description = "A port of the Java Spring Boot backend, sharing its database.",
    });

    // So you can paste a token into Swagger and exercise the secured endpoints.
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Paste the token only - Swagger adds the \"Bearer \" prefix.",
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer",
                },
            },
            Array.Empty<string>()
        },
    });
});

var app = builder.Build();

// ═════════════════════════════════════════════════════════════════════════════
//  PIPELINE
//
//  Order matters. The exception handler goes FIRST so it wraps everything
//  after it - including authentication failures and model binding.
// ═════════════════════════════════════════════════════════════════════════════

// ── REQUIREMENT 4 : global exception handling ───────────────────────────────
app.UseGlobalExceptionHandling();

// One structured line per request, with method, path, status and duration.
app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "FLEMAN .NET API v1");
        c.RoutePrefix = "swagger";
    });
}

// No HTTPS redirection: the React dev server talks to this over plain HTTP,
// and a redirect turns every API call into a CORS pre-flight failure.
app.UseCors(CorsPolicy);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

Log.Information("FLEMAN .NET backend starting. Java microservice at {JavaUrl}",
    builder.Configuration["JavaMicroservice:BaseUrl"]);

// Logged here rather than where the handler is registered: Serilog's static
// logger is not wired up until the host is built, so anything written before
// app.Build() goes nowhere.
if (googleSettings.IsConfigured)
{
    Log.Information("Google Sign-In enabled. Callback {Callback}", googleSettings.CallbackUrl);
}
else
{
    Log.Information(
        "Google Sign-In is switched off - no Authentication:Google credentials configured. "
        + "Put them in appsettings.Local.json to turn it on.");
}

if (emailSettings.IsConfigured)
{
    Log.Information("E-mail enabled, sending as {From} via {Host}:{Port}",
        emailSettings.ResolvedFrom, emailSettings.Host, emailSettings.Port);
}
else
{
    Log.Warning(
        "E-mail is switched off - no Email:Username / Email:Password configured. "
        + "Bookings and returns will work; nothing will be sent.");
}

app.Run();

/// <summary>Exposed so integration tests can build the same host.</summary>
public partial class Program { }
