FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj and restore as distinct layers
COPY ["SmartHomeHub.Backend.csproj", "./"]
RUN dotnet restore "./SmartHomeHub.Backend.csproj"

# Copy everything else and build
COPY . .
RUN dotnet publish "SmartHomeHub.Backend.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Expose port (adjust if your backend runs on a different port internally)
EXPOSE 8080

ENTRYPOINT ["dotnet", "SmartHomeHub.Backend.dll"]
