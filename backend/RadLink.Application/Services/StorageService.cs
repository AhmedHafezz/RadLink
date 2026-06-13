using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Transfer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace RadLink.Application.Services;

public interface IStorageService
{
    Task<string> UploadFileAsync(Stream fileStream, string key, string contentType = "application/octet-stream");
    Task<Stream> DownloadFileAsync(string key);
    Task<string> GetPresignedUrlAsync(string key, int expiryMinutes = 60);
    Task DeleteFileAsync(string key);
}

public class S3StorageService : IStorageService
{
    private readonly IAmazonS3 _s3;
    private readonly string _bucketName;
    private readonly ILogger<S3StorageService> _logger;

    public S3StorageService(IAmazonS3 s3, IConfiguration config, ILogger<S3StorageService> logger)
    {
        _s3 = s3;
        _bucketName = config["AWS:BucketName"] ?? "radlink-dicom";
        _logger = logger;
    }

    public async Task<string> UploadFileAsync(Stream fileStream, string key, string contentType = "application/octet-stream")
    {
        var request = new TransferUtilityUploadRequest
        {
            BucketName = _bucketName,
            Key = key,
            InputStream = fileStream,
            ContentType = contentType,
            ServerSideEncryptionMethod = ServerSideEncryptionMethod.AES256,
        };

        var utility = new TransferUtility(_s3);
        await utility.UploadAsync(request);
        _logger.LogInformation("Uploaded file to S3: {Key}", key);
        return key;
    }

    public async Task<Stream> DownloadFileAsync(string key)
    {
        var response = await _s3.GetObjectAsync(_bucketName, key);
        return response.ResponseStream;
    }

    public async Task<string> GetPresignedUrlAsync(string key, int expiryMinutes = 60)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = _bucketName,
            Key = key,
            Expires = DateTime.UtcNow.AddMinutes(expiryMinutes),
            Verb = HttpVerb.GET,
        };
        return await _s3.GetPreSignedURLAsync(request);
    }

    public async Task DeleteFileAsync(string key)
    {
        await _s3.DeleteObjectAsync(_bucketName, key);
        _logger.LogInformation("Deleted file from S3: {Key}", key);
    }
}
