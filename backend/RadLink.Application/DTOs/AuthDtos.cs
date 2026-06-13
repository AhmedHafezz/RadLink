namespace RadLink.Application.DTOs;

public record LoginRequest(string Email, string Password, string Subdomain);

public record LoginResponse(string AccessToken, string RefreshToken, UserDto User, TenantDto Tenant);

public record RegisterTenantRequest(
    string TenantName,
    string Subdomain,
    string AdminEmail,
    string AdminPassword,
    string AdminFirstName,
    string AdminLastName,
    string LicenseNumber
);

public record UserDto(
    Guid Id,
    string Email,
    string FirstName,
    string LastName,
    string Role,
    string? LicenseNumber
);

public record TenantDto(
    Guid Id,
    string Name,
    string Subdomain,
    string? LogoUrl,
    string SubscriptionTier
);
