using System.Security.Claims;
using RadLink.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace RadLink.API.Middleware;

public class TenantMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<TenantMiddleware> _logger;

    public TenantMiddleware(RequestDelegate next, ILogger<TenantMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, RadLinkDbContext db)
    {
        // Skip tenant resolution for public endpoints
        var path = context.Request.Path.Value ?? "";
        if (path.StartsWith("/api/auth/") || path.StartsWith("/health") || path.StartsWith("/swagger"))
        {
            await _next(context);
            return;
        }

        // Skip for public share endpoint - tenant resolved from token inside controller
        if (path.StartsWith("/api/share/"))
        {
            await _next(context);
            return;
        }

        Guid? tenantId = null;

        // 1. Try to extract TenantId from JWT claim
        var tenantClaim = context.User.FindFirst("tenant_id")?.Value;
        if (Guid.TryParse(tenantClaim, out var claimTenantId))
        {
            tenantId = claimTenantId;
        }
        else
        {
            // 2. Fallback: resolve from subdomain (e.g., "hospital1.radlink.app")
            var host = context.Request.Host.Host;
            var parts = host.Split('.');
            if (parts.Length >= 3)
            {
                var subdomain = parts[0].ToLower();
                var tenant = await db.Tenants
                    .AsNoTracking()
                    .FirstOrDefaultAsync(t => t.Subdomain == subdomain && t.IsActive);
                if (tenant != null)
                    tenantId = tenant.Id;
            }
        }

        if (tenantId.HasValue)
        {
            context.Items["TenantId"] = tenantId.Value;
        }
        else if (context.User.Identity?.IsAuthenticated == true)
        {
            // Authenticated but no tenant - deny
            _logger.LogWarning("Authenticated request with no resolvable tenant from {Path}", path);
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { error = "Tenant could not be resolved." });
            return;
        }

        await _next(context);
    }
}
