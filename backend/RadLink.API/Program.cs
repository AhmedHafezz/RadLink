using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using RadLink.API.Middleware;
using RadLink.Application.Services;
using RadLink.Infrastructure.Caching;
using RadLink.Infrastructure.Data;
using RadLink.Infrastructure.Services;
using RadLink.Infrastructure.Storage;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

// ── Database ─────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<RadLinkDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        npgsql => npgsql.EnableRetryOnFailure(3)));

// ── Redis (optional — falls back to in-memory cache if not configured) ───────
var redisConn = builder.Configuration["Redis:ConnectionString"];
var hasRedis = !string.IsNullOrWhiteSpace(redisConn);
if (hasRedis)
{
    builder.Services.AddSingleton<IConnectionMultiplexer>(
        ConnectionMultiplexer.Connect(redisConn!));
    builder.Services.AddStackExchangeRedisCache(opts => opts.Configuration = redisConn);
    builder.Services.AddScoped<ICacheService, RedisCacheService>();
}
else
{
    builder.Services.AddDistributedMemoryCache();
    builder.Services.AddScoped<ICacheService, MemoryCacheService>();
}

// ── Application Services ──────────────────────────────────────────────────────
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IStorageService, S3StorageService>();
builder.Services.AddScoped<IDicomProcessingService, DicomProcessingService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<ITenantService, TenantService>();

// ── Multi-Tenancy ─────────────────────────────────────────────────────────────
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ITenantContext, HttpContextTenantContext>();

// ── JWT Authentication ────────────────────────────────────────────────────────
var jwtSecret = builder.Configuration["Jwt:SecretKey"]
    ?? throw new InvalidOperationException("Jwt:SecretKey is not configured.");
var jwtKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = jwtKey,
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });

builder.Services.AddAuthorization();

// ── CORS ──────────────────────────────────────────────────────────────────────
var allowedOrigins = builder.Configuration
    .GetSection("AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:3000" };

builder.Services.AddCors(opts => opts.AddDefaultPolicy(policy =>
    policy.WithOrigins(allowedOrigins)
          .AllowAnyHeader()
          .AllowAnyMethod()
          .AllowCredentials()));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
var permitLimit = builder.Configuration.GetValue<int>("RateLimit:PermitLimit", 100);
var windowSeconds = builder.Configuration.GetValue<int>("RateLimit:WindowSeconds", 60);
builder.Services.AddRateLimiter(opts =>
{
    opts.AddFixedWindowLimiter("api", limiter =>
    {
        limiter.PermitLimit = permitLimit;
        limiter.Window = TimeSpan.FromSeconds(windowSeconds);
        limiter.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiter.QueueLimit = 10;
    });
    opts.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// ── Controllers & Swagger ─────────────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        opts.JsonSerializerOptions.DefaultIgnoreCondition =
            System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "RadLink API",
        Version = "v1",
        Description = "Cloud PACS & Web Viewer SaaS API"
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// ── Health Checks ─────────────────────────────────────────────────────────────
var healthChecks = builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("DefaultConnection")!);
if (hasRedis)
    healthChecks.AddRedis(redisConn!);

// ── Build & Pipeline ──────────────────────────────────────────────────────────
var app = builder.Build();

// ── Auto-migrate database on startup (creates schema if not exists) ──────────
try
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<RadLinkDbContext>();
    await db.Database.EnsureCreatedAsync();
    app.Logger.LogInformation("Database schema verified/created successfully.");
}
catch (Exception ex)
{
    app.Logger.LogError(ex, "Database initialization failed — continuing startup.");
}

// Swagger available in all environments (useful for Render preview)
app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "RadLink API v1"));

// Render handles TLS at the load balancer — skip HTTPS redirect in production
if (!app.Environment.IsProduction())
    app.UseHttpsRedirection();

app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<TenantMiddleware>();

app.MapControllers().RequireRateLimiting("api");
app.MapHealthChecks("/health");

app.Run();

// ── HttpContext Tenant Resolver ───────────────────────────────────────────────
public class HttpContextTenantContext : ITenantContext
{
    private readonly IHttpContextAccessor _accessor;
    public HttpContextTenantContext(IHttpContextAccessor accessor) => _accessor = accessor;
    public Guid? TenantId =>
        _accessor.HttpContext?.Items["TenantId"] is Guid id ? id : null;
}
