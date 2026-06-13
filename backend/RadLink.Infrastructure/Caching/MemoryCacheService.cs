using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;

namespace RadLink.Infrastructure.Caching;

/// <summary>
/// In-memory fallback cache used when Redis is not configured (e.g. free-tier deployment).
/// Uses IDistributedMemoryCache under the hood.
/// </summary>
public class MemoryCacheService : ICacheService
{
    private readonly IDistributedCache _cache;
    private readonly ILogger<MemoryCacheService> _logger;
    private static readonly TimeSpan DefaultTtl = TimeSpan.FromMinutes(5);

    public MemoryCacheService(IDistributedCache cache, ILogger<MemoryCacheService> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public async Task<T?> GetAsync<T>(string key)
    {
        try
        {
            var bytes = await _cache.GetAsync(key);
            if (bytes is null) return default;
            return JsonSerializer.Deserialize<T>(bytes);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cache GET failed for key {Key}", key);
            return default;
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? ttl = null)
    {
        try
        {
            var bytes = JsonSerializer.SerializeToUtf8Bytes(value);
            var opts = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = ttl ?? DefaultTtl
            };
            await _cache.SetAsync(key, bytes, opts);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cache SET failed for key {Key}", key);
        }
    }

    public async Task RemoveAsync(string key)
    {
        try { await _cache.RemoveAsync(key); }
        catch (Exception ex) { _logger.LogWarning(ex, "Cache REMOVE failed for key {Key}", key); }
    }

    public async Task<bool> ExistsAsync(string key)
    {
        try { return await _cache.GetAsync(key) is not null; }
        catch { return false; }
    }
}
