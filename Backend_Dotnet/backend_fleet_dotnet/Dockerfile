# ─────────────────────────────────────────────────────────────────────────────
# FLEMAN - .NET ASP.NET Core backend
#
# Listens on 8080 inside the container, not 5100.
#
# 5100 is a host-side convention that exists so the Vite dev server has a
# fixed port to proxy to. Inside Docker, services are reached by name on a
# private network and the port is a detail; 8080 is the .NET container
# convention and keeps this identical to the Java service. The 5100 mapping
# lives in docker-compose.yml, where it belongs.
# ─────────────────────────────────────────────────────────────────────────────


# ── Stage 1 : restore + publish ──────────────────────────────────────────────

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

WORKDIR /src

# The csproj alone first: restore is the slow step and depends only on this.
# Copying everything up front would re-download every package on any source
# edit.

COPY backend_fleet_dotnet.csproj ./

RUN dotnet restore

COPY . .

# No apphost - the container invokes `dotnet app.dll`, so the native launcher
# would be dead weight in the layer.

RUN dotnet publish -c Release -o /app/publish --no-restore /p:UseAppHost=false


# ── Stage 2 : run ────────────────────────────────────────────────────────────
#
# aspnet, not sdk: the runtime image is a fraction of the size and carries no
# compiler for an attacker to find.

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine

# curl  = compose healthcheck
# tzdata = timezone support for Asia/Kolkata
# icu-libs = .NET globalization / CultureInfo support
#
# icu-libs is required because the application uses CultureInfo such as
# "en-IN" for formatting currency and other localized values.

RUN apk add --no-cache curl tzdata icu-libs

# Enable full .NET globalization support.
#
# Without this, .NET runs in globalization-invariant mode and
# CultureInfo.GetCultureInfo("en-IN") throws:
#
# CultureNotFoundException:
# Only the invariant culture is supported in globalization-invariant mode.

ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false

# Overridable from compose. Named here as well so `docker run` on this image
# alone is right by default rather than right only under compose.

ENV TZ=Asia/Kolkata

RUN addgroup -S fleman && adduser -S fleman -G fleman

WORKDIR /app

COPY --from=build /app/publish .

# Serilog writes a rolling file here. Created and owned up front, because the
# app runs as a non-root user and a first write that fails takes the logging
# down with it.

RUN mkdir -p /app/Logs && chown -R fleman:fleman /app

USER fleman

# "+" not "localhost".
#
# Inside a container, localhost is that container's own loopback. A server
# bound only to localhost cannot be reached by nginx through the Docker
# network.
#
# "+" binds every interface, which makes the container reachable by service
# name.

ENV ASPNETCORE_URLS=http://+:8080

ENV DOTNET_RUNNING_IN_CONTAINER=true

EXPOSE 8080

ENTRYPOINT ["dotnet", "backend_fleet_dotnet.dll"]