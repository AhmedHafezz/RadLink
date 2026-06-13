using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RadLink.Application.DTOs;
using RadLink.Application.Services;
using RadLink.Domain.Entities;
using RadLink.Domain.Enums;
using RadLink.Infrastructure.Caching;
using RadLink.Infrastructure.Data;

namespace RadLink.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly RadLinkDbContext _db;
    private readonly IAuthService _authService;
    private readonly ICacheService _cache;
    private readonly ILogger<AuthController> _logger;
    private readonly IConfiguration _config;

    public AuthController(
        RadLinkDbContext db,
        IAuthService authService,
        ICacheService cache,
        ILogger<AuthController> logger,
        IConfiguration config)
    {
        _db = db;
        _authService = authService;
        _cache = cache;
        _logger = logger;
        _config = config;
    }

    /// <summary>
    /// Authenticate user and return JWT + refresh token
    /// </summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(LoginResponse), 200)]
    [ProducesResponseType(401)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password) ||
            string.IsNullOrWhiteSpace(request.Subdomain))
            return BadRequest(new { error = "Email, password, and subdomain are required." });

        // Resolve tenant by subdomain (bypass global query filter with IgnoreQueryFilters)
        var tenant = await _db.Tenants
            .Include(t => t.Subscription)
            .FirstOrDefaultAsync(t => t.Subdomain == request.Subdomain.ToLower() && t.IsActive);

        if (tenant is null)
            return Unauthorized(new { error = "Invalid credentials or tenant not found." });

        var user = await _db.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.TenantId == tenant.Id &&
                                      u.Email == request.Email.ToLower() &&
                                      u.IsActive);

        if (user is null || !AuthService.VerifyPassword(request.Password, user.PasswordHash))
            return Unauthorized(new { error = "Invalid credentials or tenant not found." });

        // Update last login
        user.LastLoginAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var accessToken = _authService.GenerateJwt(user, tenant);
        var refreshToken = AuthService.GenerateRefreshToken();

        // Store refresh token in Redis (key: refresh:{token}, value: userId, TTL = 30 days)
        int refreshDays = _config.GetValue<int>("Jwt:RefreshTokenExpiryDays", 30);
        await _cache.SetAsync(
            $"refresh:{refreshToken}",
            new RefreshTokenEntry(user.Id, tenant.Id),
            TimeSpan.FromDays(refreshDays));

        _logger.LogInformation("User {Email} logged in to tenant {Subdomain}", user.Email, tenant.Subdomain);

        return Ok(new LoginResponse(
            AccessToken: accessToken,
            RefreshToken: refreshToken,
            User: MapUserDto(user),
            Tenant: MapTenantDto(tenant)));
    }

    /// <summary>
    /// Register a new tenant with an admin user
    /// </summary>
    [HttpPost("register-tenant")]
    [ProducesResponseType(typeof(LoginResponse), 201)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> RegisterTenant([FromBody] RegisterTenantRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.TenantName) ||
            string.IsNullOrWhiteSpace(request.Subdomain) ||
            string.IsNullOrWhiteSpace(request.AdminEmail) ||
            string.IsNullOrWhiteSpace(request.AdminPassword))
            return BadRequest(new { error = "TenantName, Subdomain, AdminEmail, and AdminPassword are required." });

        var subdomain = request.Subdomain.ToLower().Trim();

        // Validate subdomain format
        if (!System.Text.RegularExpressions.Regex.IsMatch(subdomain, @"^[a-z0-9][a-z0-9\-]{1,30}[a-z0-9]$"))
            return BadRequest(new { error = "Subdomain must be 3-32 lowercase alphanumeric characters or hyphens." });

        // Check subdomain uniqueness
        bool exists = await _db.Tenants.AnyAsync(t => t.Subdomain == subdomain);
        if (exists)
            return Conflict(new { error = "Subdomain is already taken." });

        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            var tenant = new Tenant
            {
                Id = Guid.NewGuid(),
                Name = request.TenantName,
                Subdomain = subdomain,
                IsActive = true,
                Settings = new TenantSettings()
            };
            _db.Tenants.Add(tenant);

            var subscription = new Subscription
            {
                Id = Guid.NewGuid(),
                TenantId = tenant.Id,
                Tier = SubscriptionTier.Free,
                MaxUsers = 5,
                MaxStorageGB = 10,
                MaxStudiesPerMonth = 100,
                StartDate = DateTime.UtcNow,
                IsActive = true,
                Price = 0m
            };
            _db.Subscriptions.Add(subscription);

            var admin = new User
            {
                Id = Guid.NewGuid(),
                TenantId = tenant.Id,
                Email = request.AdminEmail.ToLower().Trim(),
                PasswordHash = AuthService.HashPassword(request.AdminPassword),
                FirstName = request.AdminFirstName,
                LastName = request.AdminLastName,
                Role = UserRole.Admin,
                IsActive = true
            };
            _db.Users.Add(admin);

            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            // Reload tenant with subscription for response
            tenant.Subscription = subscription;

            var accessToken = _authService.GenerateJwt(admin, tenant);
            var refreshToken = AuthService.GenerateRefreshToken();
            int refreshDays = _config.GetValue<int>("Jwt:RefreshTokenExpiryDays", 30);
            await _cache.SetAsync(
                $"refresh:{refreshToken}",
                new RefreshTokenEntry(admin.Id, tenant.Id),
                TimeSpan.FromDays(refreshDays));

            _logger.LogInformation("New tenant registered: {Subdomain}", subdomain);

            return CreatedAtAction(nameof(Login), new LoginResponse(
                AccessToken: accessToken,
                RefreshToken: refreshToken,
                User: MapUserDto(admin),
                Tenant: MapTenantDto(tenant)));
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            _logger.LogError(ex, "Failed to register tenant {Subdomain}", subdomain);
            return StatusCode(500, new { error = "Registration failed. Please try again." });
        }
    }

    /// <summary>
    /// Refresh access token using a valid refresh token
    /// </summary>
    [HttpPost("refresh")]
    [ProducesResponseType(200)]
    [ProducesResponseType(401)]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            return BadRequest(new { error = "Refresh token is required." });

        var entry = await _cache.GetAsync<RefreshTokenEntry>($"refresh:{request.RefreshToken}");
        if (entry is null)
            return Unauthorized(new { error = "Invalid or expired refresh token." });

        var user = await _db.Users
            .IgnoreQueryFilters()
            .Include(u => u.Tenant)
            .ThenInclude(t => t!.Subscription)
            .FirstOrDefaultAsync(u => u.Id == entry.UserId && u.IsActive);

        if (user is null || user.Tenant is null)
            return Unauthorized(new { error = "User no longer active." });

        // Rotate refresh token
        await _cache.RemoveAsync($"refresh:{request.RefreshToken}");
        var newRefreshToken = AuthService.GenerateRefreshToken();
        int refreshDays = _config.GetValue<int>("Jwt:RefreshTokenExpiryDays", 30);
        await _cache.SetAsync(
            $"refresh:{newRefreshToken}",
            new RefreshTokenEntry(user.Id, user.TenantId),
            TimeSpan.FromDays(refreshDays));

        var accessToken = _authService.GenerateJwt(user, user.Tenant);

        return Ok(new
        {
            accessToken,
            refreshToken = newRefreshToken
        });
    }

    /// <summary>
    /// Invalidate refresh token (logout)
    /// </summary>
    [HttpPost("logout")]
    [Authorize]
    [ProducesResponseType(204)]
    public async Task<IActionResult> Logout([FromBody] RefreshTokenRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.RefreshToken))
            await _cache.RemoveAsync($"refresh:{request.RefreshToken}");

        return NoContent();
    }

    // --- Helpers ---

    private static UserDto MapUserDto(User user) => new(
        Id: user.Id,
        Email: user.Email,
        FirstName: user.FirstName,
        LastName: user.LastName,
        Role: user.Role.ToString(),
        LicenseNumber: null);

    private static TenantDto MapTenantDto(Tenant tenant) => new(
        Id: tenant.Id,
        Name: tenant.Name,
        Subdomain: tenant.Subdomain,
        LogoUrl: tenant.Settings?.LogoUrl,
        SubscriptionTier: tenant.Subscription?.Tier.ToString() ?? SubscriptionTier.Free.ToString());
}

// Internal DTOs only used within the auth flow
public record RefreshTokenRequest(string RefreshToken);
public record RefreshTokenEntry(Guid UserId, Guid TenantId);
