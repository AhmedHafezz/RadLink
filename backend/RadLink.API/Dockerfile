FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["RadLink.API/RadLink.API.csproj", "RadLink.API/"]
COPY ["RadLink.Application/RadLink.Application.csproj", "RadLink.Application/"]
COPY ["RadLink.Domain/RadLink.Domain.csproj", "RadLink.Domain/"]
COPY ["RadLink.Infrastructure/RadLink.Infrastructure.csproj", "RadLink.Infrastructure/"]
RUN dotnet restore "RadLink.API/RadLink.API.csproj"
COPY . .
WORKDIR "/src/RadLink.API"
RUN dotnet build -c Release -o /app/build
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 10000
# Use $PORT if set (Render.com injects this), fallback to 10000
CMD sh -c "ASPNETCORE_URLS=http://+:${PORT:-10000} dotnet RadLink.API.dll"
