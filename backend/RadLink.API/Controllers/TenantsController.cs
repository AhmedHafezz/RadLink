using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RadLink.Application.DTOs;
using RadLink.Application.Services;
using System.Security.Claims;

namespace RadLink.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TenantsController : ControllerBase
{
    private readonly ITenantService _tenantService;
    private readonly ILogger<TenantsController> _logger;

    public TenantsController(
        ITenantService tenantService,
        ILogger<TenantsController> logger)
    {
        _tenantService = tenantService;
        _logger = logger;
    }

    private Guid GetTenantId() =>
        Guid.Parse(HttpContext.Items["TenantId"]?.ToString()
            ?? User.FindFirstValue("tenant_id")
            ?? throw new UnauthorizedAccessException("No tenant context."));

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)
            ?? throw new UnauthorizedAccessException("No user context."));

    /// <summary>
    /// Get current tenant info including subscription tier
    /// </summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(TenantDetailDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetCurrentTenant()
    {
        var tenantId = GetTenantId();
        var tenant = await _tenantService.GetTenantDetailByIdAsync(tenantId);

        if (tenant is null)
            return NotFound(new { error = "Tenant not found." });

        return Ok(tenant);
    }

    /// <summary>
    /// Update tenant settings (logo, branding colors, report header/footer)
    /// </summary>
    [HttpPut("me")]
    [ProducesResponseType(typeof(TenantDetailDto), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> UpdateTenantSettings([FromBody] UpdateTenantSettingsRequest request)
    {
        var tenantId = GetTenantId();

        var updated = await _tenantService.UpdateTenantSettingsAsync(tenantId, request);
        if (updated is null)
            return NotFound(new { error = "Tenant not found." });

        _logger.LogInformation("Tenant {TenantId} settings updated", tenantId);
        return Ok(updated);
    }

    /// <summary>
    /// List all active users within the current tenant
    /// </summary>
    [HttpGet("users")]
    [ProducesResponseType(typeof(IEnumerable<UserDto>), 200)]
    public async Task<IActionResult> ListUsers()
    {
        var tenantId = GetTenantId();
        var users = await _tenantService.GetTenantUsersAsync(tenantId);
        return Ok(users);
    }

    /// <summary>
    /// Invite a new user to the tenant by email
    /// </summary>
    [HttpPost("users/invite")]
    [ProducesResponseType(typeof(UserDto), 201)]
    [ProducesResponseType(400)]
    [ProducesResponseType(409)]
    public async Task<IActionResult> InviteUser([FromBody] InviteUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { error = "Email is required." });

        var tenantId = GetTenantId();

        try
        {
            var user = await _tenantService.InviteUserAsync(tenantId, request.Email, request.Role);
            _logger.LogInformation("Invited user {Email} to tenant {TenantId}", request.Email, tenantId);
            return StatusCode(201, user);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("already exists"))
        {
            return Conflict(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Get storage usage statistics for the current tenant
    /// </summary>
    [HttpGet("storage")]
    [ProducesResponseType(typeof(StorageUsageDto), 200)]
    public async Task<IActionResult> GetStorageUsage()
    {
        var tenantId = GetTenantId();
        var usage = await _tenantService.GetStorageUsageDtoAsync(tenantId);
        return Ok(usage);
    }

    /// <summary>
    /// Get subscription tier details and limits
    /// </summary>
    [HttpGet("subscription")]
    [ProducesResponseType(typeof(SubscriptionDetailDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetSubscription()
    {
        var tenantId = GetTenantId();
        var subscription = await _tenantService.GetSubscriptionAsync(tenantId);

        if (subscription is null)
            return NotFound(new { error = "No subscription found for this tenant." });

        return Ok(subscription);
    }
}
